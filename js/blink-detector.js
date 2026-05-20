/**
 * blink-detector.js — MediaPipe FaceMesh + EAR + mobile pixel fallback
 *
 * Performance:
 * - rAF visual loop (~60 FPS) with throttled MediaPipe inference on mobile
 * - Cached landmark overlay between inference frames
 * - Pixel-brightness fallback when WASM stalls (no overlay flicker)
 */

const BlinkDetector = (() => {
  const LEFT_EYE = [33, 160, 158, 133, 153, 144];
  const RIGHT_EYE = [362, 385, 387, 263, 373, 380];

  const CALIBRATION_FRAMES = 15;
  const BLINK_FRAMES_REQUIRED = 2;

  const BASELINE_RATIO_DESKTOP = 0.72;
  const BASELINE_RATIO_MOBILE = 0.58;
  const MOBILE_ABSOLUTE_BLINK_EAR = 0.2;

  const MOBILE_INFERENCE_SKIP = 3;
  const DESKTOP_INFERENCE_SKIP = 1;
  const MP_STALL_SOFT_MS = 180;
  const MP_STALL_HARD_MS = 420;
  const LANDMARK_PERSIST_MS = 600;

  let faceMesh = null;
  let rafId = null;
  let videoEl = null;
  let canvasEl = null;
  let canvasCtx = null;

  let sampleCanvas = null;
  let sampleCtx = null;

  let baselineEar = 0.28;
  let calibCount = 0;
  let calibSum = 0;
  let blinkFrameCount = 0;

  let onBlink = null;
  let onFrame = null;
  let onNoFace = null;

  let trackingActive = false;
  let blinkDetectionActive = false;

  let frameCounter = 0;
  let noFaceFrames = 0;
  let faceDetected = false;
  let isMobile = false;
  let useFallbackOnly = false;

  let lastEar = 0;
  let lastThreshold = 0;
  let lastMediapipeAt = 0;
  let inferenceInFlight = false;

  let lastLandmarks = null;
  let lastLandmarksAt = 0;
  let lastMpEar = 0;

  function isMobileDevice() {
    return (
      /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && window.innerWidth < 1024)
    );
  }

  function getInferenceSkip() {
    return isMobile ? MOBILE_INFERENCE_SKIP : DESKTOP_INFERENCE_SKIP;
  }

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function calcEAR(landmarks, indices) {
    const p1 = landmarks[indices[0]];
    const p2 = landmarks[indices[1]];
    const p3 = landmarks[indices[2]];
    const p4 = landmarks[indices[3]];
    const p5 = landmarks[indices[4]];
    const p6 = landmarks[indices[5]];
    const horizontal = dist(p1, p4);
    if (horizontal < 1e-6) return 0;
    return (dist(p2, p6) + dist(p3, p5)) / (2 * horizontal);
  }

  function getAverageEAR(landmarks) {
    return (calcEAR(landmarks, LEFT_EYE) + calcEAR(landmarks, RIGHT_EYE)) / 2;
  }

  function getBlinkThreshold() {
    const ratio = isMobile ? BASELINE_RATIO_MOBILE : BASELINE_RATIO_DESKTOP;
    let thresh = baselineEar * ratio;
    if (isMobile) {
      thresh = Math.min(thresh, MOBILE_ABSOLUTE_BLINK_EAR);
    }
    return Math.max(thresh, 0.1);
  }

  function initSampleCanvas() {
    if (!sampleCanvas) {
      sampleCanvas = document.createElement('canvas');
      sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
    }
    sampleCanvas.width = 160;
    sampleCanvas.height = 120;
  }

  function sampleRegionBrightness(x0, y0, x1, y1, data, sw) {
    let sum = 0;
    let sumSq = 0;
    let n = 0;
    const xStart = Math.max(0, Math.floor(x0));
    const yStart = Math.max(0, Math.floor(y0));
    const xEnd = Math.min(sw, Math.ceil(x1));
    const yEnd = Math.min(data.length / (sw * 4), Math.ceil(y1));

    for (let y = yStart; y < yEnd; y++) {
      for (let x = xStart; x < xEnd; x++) {
        const i = (y * sw + x) * 4;
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        sum += lum;
        sumSq += lum * lum;
        n++;
      }
    }
    if (n === 0) return { mean: 128, contrast: 0 };
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;
    return { mean, contrast: Math.sqrt(Math.max(0, variance)) };
  }

  /** Returns EAR-like 0–1 score (higher = more open) */
  function pixelFallbackEAR() {
    if (!videoEl || videoEl.readyState < 2 || videoEl.videoWidth === 0) return null;

    initSampleCanvas();
    const sw = sampleCanvas.width;
    const sh = sampleCanvas.height;

    try {
      sampleCtx.drawImage(videoEl, 0, 0, sw, sh);
      const data = sampleCtx.getImageData(0, 0, sw, sh).data;

      const left = sampleRegionBrightness(sw * 0.52, sh * 0.32, sw * 0.78, sh * 0.48, data, sw);
      const right = sampleRegionBrightness(sw * 0.22, sh * 0.32, sw * 0.48, sh * 0.48, data, sw);

      const contrast = (left.contrast + right.contrast) / 2;
      return Math.min(0.45, contrast / 45);
    } catch (e) {
      console.warn('[BlinkDetector] pixel fallback error:', e);
      return null;
    }
  }

  function drawEyes(landmarks) {
    if (!canvasCtx || !canvasEl || !landmarks) return;
    const w = canvasEl.width;
    const h = canvasEl.height;
    if (!w || !h) return;

    canvasCtx.clearRect(0, 0, w, h);

    const drawEye = (indices, color) => {
      canvasCtx.strokeStyle = color;
      canvasCtx.lineWidth = isMobile ? 2.5 : 2;
      canvasCtx.beginPath();
      indices.forEach((idx, i) => {
        const p = landmarks[idx];
        const x = p.x * w;
        const y = p.y * h;
        if (i === 0) canvasCtx.moveTo(x, y);
        else canvasCtx.lineTo(x, y);
      });
      canvasCtx.closePath();
      canvasCtx.stroke();
    };

    drawEye(LEFT_EYE, '#00f5ff');
    drawEye(RIGHT_EYE, '#ff2d95');
  }

  function redrawCachedLandmarks() {
    if (!lastLandmarks) return;
    const age = performance.now() - lastLandmarksAt;
    if (age > LANDMARK_PERSIST_MS) return;
    drawEyes(lastLandmarks);
  }

  function mediapipeStallMs() {
    const sinceMp = performance.now() - lastMediapipeAt;
    if (lastMediapipeAt === 0) return sinceMp;
    return sinceMp;
  }

  function isMediapipeHardStall() {
    const since = mediapipeStallMs();
    if (lastMediapipeAt === 0) return since > 280;
    return since > MP_STALL_HARD_MS;
  }

  function isMediapipeSoftStall() {
    if (lastMediapipeAt === 0) return false;
    const since = mediapipeStallMs();
    return since > MP_STALL_SOFT_MS && since <= MP_STALL_HARD_MS;
  }

  function calibrate(ear) {
    if (calibCount < CALIBRATION_FRAMES) {
      calibCount++;
      calibSum += ear;
      if (calibCount === CALIBRATION_FRAMES) {
        baselineEar = calibSum / CALIBRATION_FRAMES;
      }
      return false;
    }
    return true;
  }

  function checkBlink(ear, source) {
    const threshold = getBlinkThreshold();
    lastEar = ear;
    lastThreshold = threshold;

    if (ear > threshold * 1.08) {
      baselineEar = baselineEar * 0.9 + ear * 0.1;
    }

    if (!blinkDetectionActive) {
      if (onFrame) onFrame(ear, threshold, calibCount >= CALIBRATION_FRAMES, faceDetected, source);
      return;
    }

    if (ear < threshold) {
      blinkFrameCount++;
      if (blinkFrameCount >= BLINK_FRAMES_REQUIRED && onBlink) {
        blinkDetectionActive = false;
        onBlink(ear);
      }
    } else {
      blinkFrameCount = 0;
    }

    if (onFrame) onFrame(ear, threshold, true, faceDetected, source);
  }

  function onResults(results) {
    if (!trackingActive) return;

    lastMediapipeAt = performance.now();
    useFallbackOnly = false;

    const hasFace = results.multiFaceLandmarks?.length > 0;

    if (!hasFace) {
      noFaceFrames++;
      faceDetected = false;
      if (noFaceFrames > 6 && onNoFace) onNoFace(true);
      if (noFaceFrames > 12) {
        lastLandmarks = null;
        if (canvasCtx && canvasEl) canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      }
      return;
    }

    noFaceFrames = 0;
    faceDetected = true;
    if (onNoFace) onNoFace(false);

    const landmarks = results.multiFaceLandmarks[0];
    const ear = getAverageEAR(landmarks);

    lastLandmarks = landmarks;
    lastLandmarksAt = performance.now();
    lastMpEar = ear;
    drawEyes(landmarks);

    if (!calibrate(ear)) {
      if (onFrame) onFrame(ear, null, false, true, 'mp');
      return;
    }

    checkBlink(ear, 'mp');
  }

  /** Pixel EAR during WASM stall — keeps cached overlay, no canvas clear */
  function runSeamlessFallback(mode) {
    const pxEar = pixelFallbackEAR();
    if (pxEar == null) {
      if (mode === 'hard' && lastMpEar > 0 && lastLandmarks) {
        checkBlink(lastMpEar, 'mp-hold');
      }
      return;
    }

    const usePx = mode === 'hard' || !lastLandmarks;
    useFallbackOnly = usePx;
    faceDetected = true;
    if (onNoFace) onNoFace(false);

    redrawCachedLandmarks();

    const ear = usePx ? pxEar : pxEar * 0.55 + lastMpEar * 0.45;

    if (!calibrate(ear)) {
      if (onFrame) onFrame(ear, null, false, true, usePx ? 'px' : 'blend');
      return;
    }

    checkBlink(ear, usePx ? 'px' : 'blend');
  }

  function handleStallFallback() {
    if (isMediapipeHardStall()) {
      runSeamlessFallback('hard');
      return;
    }
    if (isMediapipeSoftStall()) {
      runSeamlessFallback('soft');
    }
  }

  async function init() {
    if (typeof FaceMesh === 'undefined') {
      throw new Error('MediaPipe FaceMesh failed to load.');
    }

    isMobile = isMobileDevice();

    faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.3,
      minTrackingConfidence: 0.3,
    });

    faceMesh.onResults(onResults);

    try {
      if (typeof faceMesh.initialize === 'function') {
        await faceMesh.initialize();
      }
    } catch (e) {
      console.error('[BlinkDetector] MediaPipe init error (will use pixel fallback):', e);
    }
  }

  function waitForVideo(video) {
    return new Promise((resolve) => {
      if (video.readyState >= 2 && video.videoWidth > 0) {
        resolve();
        return;
      }
      const done = () => {
        video.removeEventListener('loadeddata', done);
        video.removeEventListener('loadedmetadata', done);
        resolve();
      };
      video.addEventListener('loadeddata', done);
      video.addEventListener('loadedmetadata', done);
      setTimeout(done, 5000);
    });
  }

  function syncCanvasSize() {
    if (!videoEl || !canvasEl) return;
    const w = videoEl.videoWidth;
    const h = videoEl.videoHeight;
    if (w > 0 && h > 0) {
      canvasEl.width = w;
      canvasEl.height = h;
    }
  }

  async function sendToMediaPipe() {
    if (!faceMesh || !videoEl || videoEl.readyState < 2 || videoEl.videoWidth === 0) {
      return false;
    }
    try {
      await faceMesh.send({ image: videoEl });
      return true;
    } catch (e) {
      console.warn('[BlinkDetector] faceMesh.send error:', e.message || e);
      return false;
    }
  }

  function scheduleInference() {
    if (inferenceInFlight) return;

    inferenceInFlight = true;
    sendToMediaPipe()
      .then((ok) => {
        if (!ok || isMediapipeHardStall()) {
          runSeamlessFallback('hard');
        }
      })
      .finally(() => {
        inferenceInFlight = false;
      });
  }

  /** rAF visual loop (~60 FPS); MediaPipe throttled on mobile */
  function startFrameLoop() {
    const loop = () => {
      if (!trackingActive) return;
      rafId = requestAnimationFrame(loop);

      if (document.hidden) return;

      frameCounter++;
      redrawCachedLandmarks();
      handleStallFallback();

      const skip = getInferenceSkip();
      if (frameCounter % skip !== 0) return;
      if (inferenceInFlight) return;

      scheduleInference();
    };

    loop();
  }

  function stopFrameLoop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function getCameraConstraints() {
    if (isMobile) {
      return {
        video: {
          facingMode: 'user',
          width: { ideal: 480, max: 640 },
          height: { ideal: 360, max: 480 },
        },
        audio: false,
      };
    }
    return {
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      audio: false,
    };
  }

  async function start(video, canvas) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera not supported in this browser.');
    }
    if (!window.isSecureContext) {
      throw new Error('HTTPS_REQUIRED');
    }

    stop();

    videoEl = video;
    canvasEl = canvas;
    canvasCtx = canvas.getContext('2d', { alpha: true });

    resetCalibration();
    isMobile = isMobileDevice();
    lastMediapipeAt = 0;
    lastLandmarks = null;
    lastLandmarksAt = 0;
    lastMpEar = 0;

    const stream = await navigator.mediaDevices.getUserMedia(getCameraConstraints());

    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.srcObject = stream;

    await video.play();
    await waitForVideo(video);
    syncCanvasSize();

    video.addEventListener('resize', syncCanvasSize);

    trackingActive = true;
    blinkDetectionActive = false;

    startFrameLoop();
  }

  function resetCalibration() {
    calibCount = 0;
    calibSum = 0;
    baselineEar = isMobile ? 0.26 : 0.28;
    blinkFrameCount = 0;
    frameCounter = 0;
    lastEar = 0;
    lastThreshold = 0;
  }

  function pauseBlinkDetection() {
    blinkDetectionActive = false;
    blinkFrameCount = 0;
  }

  function enableBlinkDetection() {
    blinkDetectionActive = true;
    blinkFrameCount = 0;

    if (calibCount < CALIBRATION_FRAMES) {
      if (calibSum > 0 && calibCount > 0) {
        baselineEar = calibSum / calibCount;
      }
      calibCount = CALIBRATION_FRAMES;
    }

    if (!window.__earDebugInterval) {
      window.__earDebugInterval = setInterval(() => {
        if (!trackingActive) return;
        console.log('[BlinkDetector]', {
          ear: lastEar.toFixed(3),
          threshold: lastThreshold.toFixed(3),
          baseline: baselineEar.toFixed(3),
          blinkActive: blinkDetectionActive,
          face: faceDetected,
        });
      }, 500);
    }
  }

  function stop() {
    if (window.__earDebugInterval) {
      clearInterval(window.__earDebugInterval);
      window.__earDebugInterval = null;
    }

    trackingActive = false;
    blinkDetectionActive = false;
    stopFrameLoop();

    if (videoEl?.srcObject) {
      videoEl.srcObject.getTracks().forEach((t) => t.stop());
      videoEl.srcObject = null;
    }

    if (canvasCtx && canvasEl) {
      canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    }

    faceDetected = false;
    noFaceFrames = 0;
    inferenceInFlight = false;
    lastLandmarks = null;
  }

  return {
    init,
    start,
    stop,
    pauseBlinkDetection,
    enableBlinkDetection,
    pauseDetection: pauseBlinkDetection,
    resumeDetection: enableBlinkDetection,
    resetCalibration,
    set onBlinkCallback(fn) { onBlink = fn; },
    set onFrameCallback(fn) { onFrame = fn; },
    set onNoFaceCallback(fn) { onNoFace = fn; },
    get isCalibrated() { return calibCount >= CALIBRATION_FRAMES; },
    get faceDetected() { return faceDetected; },
    get isMobile() { return isMobile; },
    get lastEar() { return lastEar; },
    get lastThreshold() { return lastThreshold; },
  };
})();

window.BlinkDetector = BlinkDetector;

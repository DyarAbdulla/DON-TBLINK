/**
 * blink-detector.js — MediaPipe FaceMesh + EAR + mobile pixel fallback
 *
 * Mobile fixes:
 * - rAF frame loop (no blocking Camera onFrame stack)
 * - Lower blink threshold (~0.20 absolute cap)
 * - Pixel-brightness fallback when MediaPipe stalls
 * - Console EAR log every 500ms
 */

const BlinkDetector = (() => {
  const LEFT_EYE = [33, 160, 158, 133, 153, 144];
  const RIGHT_EYE = [362, 385, 387, 263, 373, 380];

  const CALIBRATION_FRAMES = 15;
  const BLINK_FRAMES_REQUIRED = 2;

  // Desktop: relative drop from baseline | Mobile: also cap with absolute EAR
  const BASELINE_RATIO_DESKTOP = 0.72;
  const BASELINE_RATIO_MOBILE = 0.58;
  const MOBILE_ABSOLUTE_BLINK_EAR = 0.2;

  let faceMesh = null;
  let rafId = null;
  let videoEl = null;
  let canvasEl = null;
  let canvasCtx = null;

  // Offscreen canvas for pixel fallback
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
  let mediapipeFrameCounter = 0;
  let noFaceFrames = 0;
  let faceDetected = false;
  let isMobile = false;
  let useFallbackOnly = false;

  let lastEar = 0;
  let lastThreshold = 0;
  let lastMediapipeAt = 0;
  let frameInFlight = false;

  let debugLogInterval = null;
  let lastDebugLog = 0;

  function isMobileDevice() {
    return (
      /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && window.innerWidth < 1024)
    );
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

  // ---- Pixel fallback: eye openness from luminance contrast ----
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

      // Eye regions (selfie mirror: user's left = right side of image)
      const left = sampleRegionBrightness(sw * 0.52, sh * 0.32, sw * 0.78, sh * 0.48, data, sw);
      const right = sampleRegionBrightness(sw * 0.22, sh * 0.32, sw * 0.48, sh * 0.48, data, sw);

      const contrast = (left.contrast + right.contrast) / 2;
      const earProxy = Math.min(0.45, contrast / 45);
      return earProxy;
    } catch (e) {
      console.warn('[BlinkDetector] pixel fallback error:', e);
      return null;
    }
  }

  function drawEyes(landmarks) {
    if (!canvasCtx || !canvasEl) return;
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

  function calibrate(ear) {
    if (calibCount < CALIBRATION_FRAMES) {
      calibCount++;
      calibSum += ear;
      if (calibCount === CALIBRATION_FRAMES) {
        baselineEar = calibSum / CALIBRATION_FRAMES;
        console.log('[BlinkDetector] Calibrated baseline EAR:', baselineEar.toFixed(3));
      }
      return false;
    }
    return true;
  }

  function checkBlink(ear) {
    const threshold = getBlinkThreshold();
    lastEar = ear;
    lastThreshold = threshold;

    if (ear > threshold * 1.08) {
      baselineEar = baselineEar * 0.9 + ear * 0.1;
    }

    if (!blinkDetectionActive) {
      if (onFrame) onFrame(ear, threshold, calibCount >= CALIBRATION_FRAMES, faceDetected, 'mp');
      return;
    }

    if (ear < threshold) {
      blinkFrameCount++;
      if (blinkFrameCount >= BLINK_FRAMES_REQUIRED && onBlink) {
        console.log('[BlinkDetector] BLINK!', { ear: ear.toFixed(3), threshold: threshold.toFixed(3) });
        blinkDetectionActive = false;
        onBlink(ear);
      }
    } else {
      blinkFrameCount = 0;
    }

    if (onFrame) onFrame(ear, threshold, true, faceDetected, useFallbackOnly ? 'px' : 'mp');
  }

  function onResults(results) {
    if (!trackingActive) return;

    mediapipeFrameCounter++;
    lastMediapipeAt = performance.now();
    useFallbackOnly = false;

    const hasFace = results.multiFaceLandmarks?.length > 0;

    if (!hasFace) {
      noFaceFrames++;
      faceDetected = false;
      if (noFaceFrames > 6 && onNoFace) onNoFace(true);
      if (canvasCtx && canvasEl) canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      return;
    }

    noFaceFrames = 0;
    faceDetected = true;
    if (onNoFace) onNoFace(false);

    const landmarks = results.multiFaceLandmarks[0];
    const ear = getAverageEAR(landmarks);
    drawEyes(landmarks);

    if (!calibrate(ear)) {
      if (onFrame) onFrame(ear, null, false, true, 'mp');
      return;
    }

    checkBlink(ear);
  }

  function runFallbackFrame() {
    const pxEar = pixelFallbackEAR();
    if (pxEar == null) return;

    useFallbackOnly = true;
    faceDetected = true;
    if (onNoFace) onNoFace(false);

    if (!calibrate(pxEar)) {
      if (onFrame) onFrame(pxEar, null, false, true, 'px');
      return;
    }

    checkBlink(pxEar);
  }

  function debugLogTick() {
    if (!trackingActive) return;
    const now = performance.now();
    if (now - lastDebugLog < 500) return;
    lastDebugLog = now;

    console.log('[BlinkDetector]', {
      ear: lastEar.toFixed(3),
      threshold: lastThreshold.toFixed(3),
      baseline: baselineEar.toFixed(3),
      calibrated: calibCount >= CALIBRATION_FRAMES,
      blinkActive: blinkDetectionActive,
      face: faceDetected,
      mode: useFallbackOnly ? 'pixel-fallback' : 'mediapipe',
      mpFrames: mediapipeFrameCounter,
      mobile: isMobile,
    });
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
      console.log('[BlinkDetector] MediaPipe FaceMesh ready', { mobile: isMobile });
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

  /** rAF loop — never blocks; runs fallback if MediaPipe silent > 400ms */
  function startFrameLoop() {
    const loop = () => {
      if (!trackingActive) return;
      rafId = requestAnimationFrame(loop);

      if (document.hidden) return;

      frameCounter++;
      debugLogTick();

      if (frameInFlight) return;
      frameInFlight = true;

      (async () => {
        try {
          const mpOk = await sendToMediaPipe();
          const sinceMp = performance.now() - lastMediapipeAt;
          const mpStale = lastMediapipeAt === 0 ? sinceMp > 250 : sinceMp > 450;

          if (!mpOk || mpStale) {
            runFallbackFrame();
          }
        } finally {
          frameInFlight = false;
        }
      })();
    };

    loop();
  }

  function stopFrameLoop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (debugLogInterval) {
      clearInterval(debugLogInterval);
      debugLogInterval = null;
    }
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
    mediapipeFrameCounter = 0;

    const constraints = isMobile
      ? { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false }
      : { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);

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
    lastDebugLog = 0;

    console.log('[BlinkDetector] Camera started', {
      mobile: isMobile,
      video: `${videoEl.videoWidth}x${videoEl.videoHeight}`,
      blinkThresholdCap: isMobile ? MOBILE_ABSOLUTE_BLINK_EAR : 'n/a',
    });

    startFrameLoop();
  }

  function stop() {
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
    frameInFlight = false;
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
      console.log('[BlinkDetector] Blink detection ON, baseline:', baselineEar.toFixed(3));
    }

    const thresh = getBlinkThreshold();
    console.log('[BlinkDetector] Blink threshold:', thresh.toFixed(3), isMobile ? '(mobile cap 0.20)' : '');
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

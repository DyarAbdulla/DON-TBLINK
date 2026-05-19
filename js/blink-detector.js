/**
 * blink-detector.js — MediaPipe FaceMesh + EAR (mobile + desktop)
 */

const BlinkDetector = (() => {
  const LEFT_EYE = [33, 160, 158, 133, 153, 144];
  const RIGHT_EYE = [362, 385, 387, 263, 373, 380];

  const CALIBRATION_FRAMES = 18;
  const BLINK_FRAMES_REQUIRED = 2;
  const BASELINE_RATIO = 0.75;

  let faceMesh = null;
  let camera = null;
  let rafId = null;
  let videoEl = null;
  let canvasEl = null;
  let canvasCtx = null;

  let baselineEar = 0.3;
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
  let camWidth = 640;
  let camHeight = 480;

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

  function onResults(results) {
    if (!trackingActive) return;

    frameCounter++;

    const hasFace = results.multiFaceLandmarks?.length > 0;

    if (!hasFace) {
      noFaceFrames++;
      faceDetected = false;
      if (noFaceFrames > 8 && onNoFace) onNoFace(true);
      if (canvasCtx && canvasEl) canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      if (onFrame) onFrame(0, baselineEar * BASELINE_RATIO, false, false);
      return;
    }

    noFaceFrames = 0;
    faceDetected = true;
    if (onNoFace) onNoFace(false);

    const landmarks = results.multiFaceLandmarks[0];
    const ear = getAverageEAR(landmarks);

    drawEyes(landmarks);

    if (calibCount < CALIBRATION_FRAMES) {
      calibCount++;
      calibSum += ear;
      if (calibCount === CALIBRATION_FRAMES) {
        baselineEar = calibSum / CALIBRATION_FRAMES;
      }
      if (onFrame) onFrame(ear, null, false, true);
      return;
    }

    const threshold = baselineEar * BASELINE_RATIO;

    if (ear > threshold * 1.1) {
      baselineEar = baselineEar * 0.92 + ear * 0.08;
    }

    if (onFrame) onFrame(ear, threshold, true, true);

    if (!blinkDetectionActive) return;

    if (ear < threshold) {
      blinkFrameCount++;
      if (blinkFrameCount >= BLINK_FRAMES_REQUIRED && onBlink) {
        blinkDetectionActive = false;
        onBlink(ear);
      }
    } else {
      blinkFrameCount = 0;
    }
  }

  async function init() {
    if (typeof FaceMesh === 'undefined') {
      throw new Error('MediaPipe FaceMesh failed to load.');
    }

    isMobile = isMobileDevice();
    camWidth = isMobile ? 480 : 640;
    camHeight = isMobile ? 360 : 480;

    faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.35,
      minTrackingConfidence: 0.35,
    });

    faceMesh.onResults(onResults);

    if (typeof faceMesh.initialize === 'function') {
      await faceMesh.initialize();
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
      setTimeout(done, 4000);
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

  async function processFrame() {
    if (!trackingActive || !faceMesh || !videoEl) return;
    if (videoEl.readyState < 2 || videoEl.videoWidth === 0) return;
    try {
      await faceMesh.send({ image: videoEl });
    } catch (e) {
      console.warn('FaceMesh:', e);
    }
  }

  function startFrameLoop() {
    if (typeof Camera !== 'undefined') {
      camera = new Camera(videoEl, {
        onFrame: async () => {
          await processFrame();
        },
        width: camWidth,
        height: camHeight,
      });
      camera.start();
    } else {
      const loop = async () => {
        if (trackingActive) {
          await processFrame();
          rafId = requestAnimationFrame(loop);
        }
      };
      loop();
    }
  }

  function stopFrameLoop() {
    if (camera) {
      camera.stop();
      camera = null;
    }
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
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

    const constraints = {
      video: {
        facingMode: 'user',
        width: { ideal: camWidth, max: 1280 },
        height: { ideal: camHeight, max: 720 },
      },
      audio: false,
    };

    // iOS works best with simpler constraints
    if (isMobile) {
      constraints.video = { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 640 } };
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.muted = true;
    video.autoplay = true;
    video.srcObject = stream;

    await video.play();
    await waitForVideo(video);
    syncCanvasSize();

    window.addEventListener('orientationchange', () => {
      setTimeout(syncCanvasSize, 300);
    });

    trackingActive = true;
    blinkDetectionActive = false;

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
  }

  function resetCalibration() {
    calibCount = 0;
    calibSum = 0;
    baselineEar = 0.3;
    blinkFrameCount = 0;
    frameCounter = 0;
  }

  function pauseBlinkDetection() {
    blinkDetectionActive = false;
    blinkFrameCount = 0;
  }

  function enableBlinkDetection() {
    blinkDetectionActive = true;
    blinkFrameCount = 0;
    if (calibCount < CALIBRATION_FRAMES && calibSum > 0) {
      baselineEar = calibSum / calibCount;
      calibCount = CALIBRATION_FRAMES;
    }
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
  };
})();

window.BlinkDetector = BlinkDetector;

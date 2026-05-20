/**
 * laugh-detector.js — "Don't Laugh" mode (mouth curvature / smile MAR)
 */

const LaughDetector = (() => {
  const MOUTH_TOP = 13;
  const MOUTH_BOTTOM = 14;
  const MOUTH_LEFT = 61;
  const MOUTH_RIGHT = 291;
  const NOSE_TIP = 1;

  const CALIBRATION_FRAMES = 18;
  const SMILE_FRAMES_REQUIRED = 3;
  const SMILE_RATIO_TRIGGER = 1.22;

  let canvasEl = null;
  let canvasCtx = null;
  let unsubEngine = null;

  let baselineSmile = 0;
  let calibCount = 0;
  let calibSum = 0;
  let smileFrameCount = 0;

  let onLaugh = null;
  let onFrame = null;
  let onNoFace = null;

  let laughDetectionActive = false;
  let faceDetected = false;
  let lastSmile = 0;
  let lastThreshold = 0;

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /** Higher = more smile (wider mouth + corners lifted) */
  function calcSmileScore(landmarks) {
    const mouthW = dist(landmarks[MOUTH_LEFT], landmarks[MOUTH_RIGHT]);
    const mouthH = dist(landmarks[MOUTH_TOP], landmarks[MOUTH_BOTTOM]) || 0.001;
    const mar = mouthW / mouthH;

    const noseY = landmarks[NOSE_TIP].y;
    const cornerY = (landmarks[MOUTH_LEFT].y + landmarks[MOUTH_RIGHT].y) / 2;
    const lift = Math.max(0, noseY - cornerY) * 8;

    return mar + lift;
  }

  function getSmileThreshold() {
    return baselineSmile * SMILE_RATIO_TRIGGER;
  }

  function drawMouth(landmarks) {
    if (!canvasCtx || !canvasEl || !landmarks) return;
    const w = canvasEl.width;
    const h = canvasEl.height;
    if (!w || !h) return;

    canvasCtx.clearRect(0, 0, w, h);
    const pts = [MOUTH_LEFT, MOUTH_TOP, MOUTH_RIGHT, MOUTH_BOTTOM];
    canvasCtx.strokeStyle = '#ff2d95';
    canvasCtx.lineWidth = 2;
    canvasCtx.beginPath();
    pts.forEach((idx, i) => {
      const p = landmarks[idx];
      const x = p.x * w;
      const y = p.y * h;
      if (i === 0) canvasCtx.moveTo(x, y);
      else canvasCtx.lineTo(x, y);
    });
    canvasCtx.closePath();
    canvasCtx.stroke();
  }

  function syncCanvas() {
    const v = FaceEngine.video;
    if (!v || !canvasEl) return;
    const w = v.videoWidth;
    const h = v.videoHeight;
    if (w > 0 && h > 0) {
      canvasEl.width = w;
      canvasEl.height = h;
    }
  }

  function handleLandmarks({ landmarks, hasFace }) {
    syncCanvas();

    if (!hasFace || !landmarks) {
      faceDetected = false;
      if (onNoFace) onNoFace(true);
      if (canvasCtx && canvasEl) canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      if (onFrame) onFrame(0, 0, false, false);
      return;
    }

    faceDetected = true;
    if (onNoFace) onNoFace(false);

    const smile = calcSmileScore(landmarks);
    drawMouth(landmarks);
    lastSmile = smile;

    if (calibCount < CALIBRATION_FRAMES) {
      calibCount++;
      calibSum += smile;
      if (calibCount === CALIBRATION_FRAMES) {
        baselineSmile = calibSum / CALIBRATION_FRAMES;
      }
      if (onFrame) onFrame(smile, null, false, true);
      return;
    }

    const threshold = getSmileThreshold();
    lastThreshold = threshold;

    if (smile < threshold * 0.95) {
      baselineSmile = baselineSmile * 0.92 + smile * 0.08;
    }

    if (onFrame) onFrame(smile, threshold, true, true);

    if (!laughDetectionActive) return;

    if (smile > threshold) {
      smileFrameCount++;
      if (smileFrameCount >= SMILE_FRAMES_REQUIRED && onLaugh) {
        laughDetectionActive = false;
        onLaugh(smile);
      }
    } else {
      smileFrameCount = 0;
    }
  }

  async function init() {
    await FaceEngine.init();
  }

  async function start(video, canvas) {
    canvasEl = canvas;
    canvasCtx = canvas.getContext('2d', { alpha: true });
    resetCalibration();
    laughDetectionActive = false;

    await FaceEngine.start(video);
    unsubEngine = FaceEngine.subscribe(handleLandmarks);
  }

  function stop() {
    laughDetectionActive = false;
    if (unsubEngine) {
      unsubEngine();
      unsubEngine = null;
    }
    FaceEngine.stop();
    if (canvasCtx && canvasEl) {
      canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    }
    faceDetected = false;
  }

  function resetCalibration() {
    calibCount = 0;
    calibSum = 0;
    baselineSmile = 0.8;
    smileFrameCount = 0;
    lastSmile = 0;
    lastThreshold = 0;
  }

  function pauseLaughDetection() {
    laughDetectionActive = false;
    smileFrameCount = 0;
  }

  function enableLaughDetection() {
    laughDetectionActive = true;
    smileFrameCount = 0;
    if (calibCount < CALIBRATION_FRAMES && calibSum > 0) {
      baselineSmile = calibSum / calibCount;
      calibCount = CALIBRATION_FRAMES;
    }
  }

  return {
    init,
    start,
    stop,
    pauseLaughDetection,
    enableLaughDetection,
    resetCalibration,
    set onLaughCallback(fn) { onLaugh = fn; },
    set onFrameCallback(fn) { onFrame = fn; },
    set onNoFaceCallback(fn) { onNoFace = fn; },
    get lastSmile() { return lastSmile; },
    get lastThreshold() { return lastThreshold; },
    get faceDetected() { return faceDetected; },
  };
})();

window.LaughDetector = LaughDetector;

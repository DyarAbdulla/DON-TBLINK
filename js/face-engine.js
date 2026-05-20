/**
 * face-engine.js — Shared MediaPipe loop (AI decoupled from UI rAF)
 * One inference at a time; landmarks delivered to subscribers each visual frame.
 */

const FaceEngine = (() => {
  let faceMesh = null;
  let videoEl = null;
  let rafId = null;
  let trackingActive = false;
  let inferenceInFlight = false;
  let frameCounter = 0;
  let lastMediapipeAt = 0;
  let isMobile = false;

  let latestLandmarks = null;
  let hasFace = false;
  const subscribers = new Set();

  const MOBILE_SKIP = 3;
  const DESKTOP_SKIP = 1;

  function isMobileDevice() {
    return (
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && window.innerWidth < 1024)
    );
  }

  function notify() {
    subscribers.forEach((cb) => {
      try {
        cb({ landmarks: latestLandmarks, hasFace, isMobile });
      } catch (e) {
        console.warn('[FaceEngine] subscriber error:', e);
      }
    });
  }

  function onResults(results) {
    lastMediapipeAt = performance.now();
    hasFace = !!(results.multiFaceLandmarks?.length);
    latestLandmarks = hasFace ? results.multiFaceLandmarks[0] : null;
  }

  let initialized = false;

  async function init() {
    if (initialized) return;
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
      minDetectionConfidence: 0.35,
      minTrackingConfidence: 0.35,
    });

    faceMesh.onResults(onResults);

    if (typeof faceMesh.initialize === 'function') {
      await faceMesh.initialize();
    }
    initialized = true;
  }

  function subscribe(cb) {
    subscribers.add(cb);
    return () => subscribers.delete(cb);
  }

  async function sendFrame() {
    if (!faceMesh || !videoEl || videoEl.readyState < 2 || videoEl.videoWidth === 0) {
      return;
    }
    try {
      await faceMesh.send({ image: videoEl });
    } catch (e) {
      console.warn('[FaceEngine] send:', e.message || e);
    }
  }

  function visualLoop() {
    if (!trackingActive) return;
    rafId = requestAnimationFrame(visualLoop);

    if (document.hidden) return;

    frameCounter++;
    notify();

    const skip = isMobile ? MOBILE_SKIP : DESKTOP_SKIP;
    if (frameCounter % skip !== 0 || inferenceInFlight) return;

    inferenceInFlight = true;
    sendFrame().finally(() => {
      inferenceInFlight = false;
    });
  }

  function waitForVideo(video) {
    return new Promise((resolve) => {
      if (video.readyState >= 2 && video.videoWidth > 0) return resolve();
      const done = () => {
        video.removeEventListener('loadeddata', done);
        video.removeEventListener('loadedmetadata', done);
        resolve();
      };
      video.addEventListener('loadeddata', done);
      video.addEventListener('loadedmetadata', done);
      setTimeout(resolve, 5000);
    });
  }

  async function start(video) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera not supported.');
    }
    if (!window.isSecureContext) throw new Error('HTTPS_REQUIRED');

    stop();
    videoEl = video;
    isMobile = isMobileDevice();
    frameCounter = 0;
    lastMediapipeAt = 0;
    latestLandmarks = null;
    hasFace = false;

    const constraints = isMobile
      ? { video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 640 } }, audio: false }
      : { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.muted = true;
    video.autoplay = true;
    video.srcObject = stream;
    await video.play();
    await waitForVideo(video);

    trackingActive = true;
    visualLoop();
  }

  function stop() {
    trackingActive = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (videoEl?.srcObject) {
      videoEl.srcObject.getTracks().forEach((t) => t.stop());
      videoEl.srcObject = null;
    }
    latestLandmarks = null;
    hasFace = false;
    inferenceInFlight = false;
  }

  return {
    init,
    start,
    stop,
    subscribe,
    get video() { return videoEl; },
    get isMobile() { return isMobile; },
    get lastInferenceAt() { return lastMediapipeAt; },
  };
})();

window.FaceEngine = FaceEngine;

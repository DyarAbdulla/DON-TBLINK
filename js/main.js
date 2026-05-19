/**
 * main.js — DON'T BLINK game controller
 */

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const STORAGE_BEST = 'dontblink-best-score';
  const STORAGE_LB = 'dontblink-leaderboard';

  // DOM
  const loadingScreen = $('loading-screen');
  const loadingBar = $('loading-bar');
  const loadingPercent = $('loading-percent');
  const app = $('app');
  const startScreen = $('start-screen');
  const gameScreen = $('game-screen');
  const gameHud = $('game-hud');
  const startBtn = $('start-btn');
  const retryBtn = $('retry-btn');
  const shareBtn = $('share-btn');
  const shareToast = $('share-toast');
  const hudTimer = $('hud-timer');
  const hudRank = $('hud-rank');
  const timerDisplay = $('timer-display');
  const rankDisplay = $('rank-display');
  const fpsDisplay = $('fps-display');
  const bestScoreDisplay = $('best-score-display');
  const countdownOverlay = $('countdown-overlay');
  const countdownNumber = $('countdown-number');
  const failOverlay = $('fail-overlay');
  const failMeme = $('fail-meme');
  const blinkFlash = $('blink-flash');
  const gameOverModal = $('game-over-modal');
  const modalContent = $('modal-content');
  const modalMeme = $('modal-meme');
  const finalTime = $('final-time');
  const modalBestScore = $('modal-best-score');
  const modalRank = $('modal-rank');
  const videoContainer = $('video-container');
  const webcam = $('webcam');
  const faceCanvas = $('face-canvas');
  const earValue = $('ear-value');
  const confettiCanvas = $('confetti-canvas');
  const leaderboardList = $('leaderboard-list');
  const noFaceWarning = $('no-face-warning');

  let bestScore = parseFloat(localStorage.getItem(STORAGE_BEST) || '0');
  let gameState = 'idle';
  let timerStart = 0;
  let elapsed = 0;
  let timerRAF = null;
  let confettiTriggered = false;
  let lastShareTime = 0;

  let fpsFrames = 0;
  let fpsLast = performance.now();

  // ---- Ranks (30s = Machine) ----
  function getRank(seconds) {
    if (seconds >= 60) return `${i18n.t('rankMonster')} 👹`;
    if (seconds >= 30) return `${i18n.t('rankMachine')} 🤖`;
    if (seconds >= 15) return `${i18n.t('rankHuman')} 🧑`;
    if (seconds >= 5) return `${i18n.t('rankSleepy')} 😴`;
    return i18n.t('rankNone');
  }

  function formatTime(sec) {
    return `${sec.toFixed(2)}s`;
  }

  // ---- Leaderboard (localStorage) ----
  function getLeaderboard() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_LB) || '[]');
    } catch {
      return [];
    }
  }

  function saveToLeaderboard(score) {
    const entries = getLeaderboard();
    entries.push({ score, date: Date.now() });
    entries.sort((a, b) => b.score - a.score);
    const top = entries.slice(0, 10);
    localStorage.setItem(STORAGE_LB, JSON.stringify(top));
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem(STORAGE_BEST, String(bestScore));
    }
  }

  window.renderLeaderboard = function renderLeaderboard() {
    const entries = getLeaderboard();
    if (!entries.length) {
      leaderboardList.innerHTML = `<li class="lb-empty" data-i18n="lbEmpty">${i18n.t('lbEmpty')}</li>`;
      return;
    }
    leaderboardList.innerHTML = entries
      .map(
        (e, i) => `
        <li class="${i === 0 ? 'lb-you' : ''}">
          <span class="lb-rank">#${i + 1}</span>
          <span>${new Date(e.date).toLocaleDateString()}</span>
          <span class="lb-score">${formatTime(e.score)}</span>
        </li>`
      )
      .join('');
  };

  function updateBestScoreDisplay() {
    bestScoreDisplay.textContent = formatTime(bestScore);
  }

  function syncTimerUI(value) {
    const text = value.toFixed(2);
    hudTimer.textContent = text;
    timerDisplay.textContent = text;
    const rank = getRank(value);
    hudRank.textContent = rank;
    rankDisplay.textContent = rank;
  }

  // ---- Confetti ----
  const Confetti = (() => {
    const ctx = confettiCanvas.getContext('2d');
    let pieces = [];

    function burst() {
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
      const colors = ['#ff2d95', '#00f5ff', '#b026ff', '#39ff14', '#ffd700'];
      pieces = Array.from({ length: 180 }, () => ({
        x: Math.random() * confettiCanvas.width,
        y: -30 - Math.random() * 200,
        w: Math.random() * 10 + 4,
        h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 5,
        vy: Math.random() * 4 + 2,
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 12,
      }));

      const draw = () => {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        let alive = false;
        pieces.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.06;
          p.rot += p.vr;
          if (p.y < confettiCanvas.height + 40) alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rot * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        });
        if (alive) requestAnimationFrame(draw);
        else ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      };
      draw();
    }
    return { burst };
  })();

  // ---- Timer ----
  function updateTimer() {
    if (gameState !== 'playing') return;
    elapsed = (performance.now() - timerStart) / 1000;
    syncTimerUI(elapsed);

    if (elapsed >= 30 && !confettiTriggered) {
      confettiTriggered = true;
      Confetti.burst();
      SoundManager.playMilestone();
    }

    timerRAF = requestAnimationFrame(updateTimer);
  }

  function trackFPS() {
    fpsFrames++;
    const now = performance.now();
    if (now - fpsLast >= 1000) {
      fpsDisplay.textContent = fpsFrames;
      fpsFrames = 0;
      fpsLast = now;
    }
  }

  // ---- Cinematic fail ----
  function handleBlink() {
    if (gameState !== 'playing') return;

    gameState = 'failed';
    cancelAnimationFrame(timerRAF);
    BlinkDetector.stop();

    const finalElapsed = elapsed;
    saveToLeaderboard(finalElapsed);

    // Red flash + shake + cinematic overlay
    blinkFlash.classList.add('active');
    document.body.classList.add('shake');
    videoContainer?.classList.add('shake');
    gameScreen.classList.remove('tiktok-mode');

    const meme = i18n.getRandomMeme();
    failMeme.textContent = meme;
    failOverlay.classList.remove('hidden');
    failOverlay.classList.add('active');

    SoundManager.playFail();
    SoundManager.playWarning();

    setTimeout(() => blinkFlash.classList.remove('active'), 1400);

    setTimeout(() => {
      failOverlay.classList.remove('active');
      failOverlay.classList.add('hidden');
      document.body.classList.remove('shake');
      videoContainer?.classList.remove('shake');

      modalMeme.textContent = meme;
      finalTime.textContent = formatTime(finalElapsed);
      modalBestScore.textContent = formatTime(bestScore);
      modalRank.textContent = getRank(finalElapsed);
      lastShareTime = finalElapsed;

      gameOverModal.classList.remove('hidden');
      gameOverModal.classList.add('show');
      requestAnimationFrame(() => modalContent?.classList.add('show'));

      gameHud.classList.add('hidden');
      renderLeaderboard();
      updateBestScoreDisplay();
    }, 2000);
  }

  // ---- Countdown ----
  async function runCountdown() {
    gameState = 'countdown';
    countdownOverlay.classList.remove('hidden');
    // Keep face tracking ON during countdown so eyes calibrate before GO
    BlinkDetector.pauseBlinkDetection();

    const nums = ['3', '2', '1', 'GO!'];
    for (let i = 0; i < nums.length; i++) {
      countdownNumber.textContent = nums[i];
      countdownNumber.style.animation = 'none';
      void countdownNumber.offsetWidth;
      countdownNumber.style.animation = '';

      if (i < 3) SoundManager.playCountdown();
      else SoundManager.playGo();

      await new Promise((r) => setTimeout(r, 900));
    }

    countdownOverlay.classList.add('hidden');
    gameState = 'playing';
    timerStart = performance.now();
    confettiTriggered = false;
    syncTimerUI(0);
    BlinkDetector.enableBlinkDetection();
    gameScreen.classList.add('tiktok-mode');
    updateTimer();
  }

  async function startGame() {
    SoundManager.resume();
    startBtn.disabled = true;

    startScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    gameHud.classList.remove('hidden');

    try {
      await BlinkDetector.start(webcam, faceCanvas);
      // Brief moment for camera + face mesh to warm up
      await new Promise((r) => setTimeout(r, 500));
      await runCountdown();
    } catch (err) {
      console.error(err);
      const msg =
        err.message === 'HTTPS_REQUIRED'
          ? i18n.t('httpsRequired')
          : i18n.t('cameraRequired');
      alert(msg);
      resetToStart();
    }

    startBtn.disabled = false;
  }

  function resetToStart() {
    gameState = 'idle';
    cancelAnimationFrame(timerRAF);
    BlinkDetector.stop();

    gameScreen.classList.add('hidden');
    gameScreen.classList.remove('tiktok-mode');
    startScreen.classList.remove('hidden');
    gameHud.classList.add('hidden');

    gameOverModal.classList.remove('show');
    gameOverModal.classList.add('hidden');
    modalContent?.classList.remove('show');

    failOverlay.classList.remove('active');
    failOverlay.classList.add('hidden');
    blinkFlash.classList.remove('active');

    countdownOverlay.classList.remove('hidden');
    videoContainer?.classList.remove('face-ok');
    syncTimerUI(0);
    elapsed = 0;
  }

  // ---- Share ----
  async function shareResult() {
    const text = i18n.shareText(lastShareTime.toFixed(2));
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: i18n.t('shareTitle'),
          text,
          url,
        });
        return;
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      shareToast.classList.remove('hidden');
      setTimeout(() => shareToast.classList.add('hidden'), 2500);
    } catch {
      shareToast.textContent = text;
      shareToast.classList.remove('hidden');
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      document.body.classList.add('fullscreen-active');
    } else {
      document.exitFullscreen?.();
      document.body.classList.remove('fullscreen-active');
    }
  }

  // ---- Boot ----
  async function boot() {
    i18n.applyTranslations();
    updateBestScoreDisplay();
    renderLeaderboard();
    ParticleBackground.start();

    const httpsBanner = $('https-warning');
    if (httpsBanner && !window.isSecureContext) {
      httpsBanner.classList.remove('hidden');
    }

    // Fullscreen not supported on iPhone Safari
    const fsBtn = $('fullscreen-btn');
    if (fsBtn && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      fsBtn.style.display = 'none';
    }

    let progress = 0;
    const tick = setInterval(() => {
      progress = Math.min(progress + 6, 92);
      loadingBar.style.width = `${progress}%`;
      loadingPercent.textContent = progress;
    }, 100);

    try {
      await BlinkDetector.init();
      progress = 100;
    } catch (e) {
      console.warn('MediaPipe:', e);
      progress = 100;
    }

    clearInterval(tick);
    loadingBar.style.width = '100%';
    loadingPercent.textContent = '100';

    await new Promise((r) => setTimeout(r, 350));
    loadingScreen.classList.add('hide');
    app.classList.add('ready');

    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 700);
  }

  // ---- Events ----
  startBtn.addEventListener('click', startGame);
  retryBtn.addEventListener('click', resetToStart);
  shareBtn.addEventListener('click', shareResult);
  $('lang-btn').addEventListener('click', i18n.toggleLanguage);
  $('sound-btn').addEventListener('click', SoundManager.toggle);
  $('fullscreen-btn').addEventListener('click', toggleFullscreen);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && gameOverModal.classList.contains('show')) {
      resetToStart();
    }
  });

  document.querySelector('[data-close-modal]')?.addEventListener('click', resetToStart);

  BlinkDetector.onBlinkCallback = handleBlink;
  BlinkDetector.onFrameCallback = (ear, threshold, calibrated, hasFace) => {
    if (earValue) {
      if (!hasFace) earValue.textContent = '—';
      else if (!calibrated) earValue.textContent = i18n.t('calibrating');
      else earValue.textContent = ear.toFixed(3);
    }
    trackFPS();
  };

  let lastNoFaceBeep = 0;
  BlinkDetector.onNoFaceCallback = (lost) => {
    if (noFaceWarning) noFaceWarning.classList.toggle('hidden', !lost);
    if (videoContainer) videoContainer.classList.toggle('face-ok', !lost && (gameState === 'playing' || gameState === 'countdown'));
    const now = performance.now();
    if (lost && gameState === 'playing' && now - lastNoFaceBeep > 3000) {
      lastNoFaceBeep = now;
      SoundManager.playWarning();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

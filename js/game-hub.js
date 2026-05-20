/**
 * game-hub.js — AI Webcam Challenge Hub (Blink + Don't Laugh)
 */

const GameHub = (() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const MODES = { blink: 'blink', laugh: 'laugh' };
  let currentMode = MODES.blink;
  let gameState = 'hub';
  let timerRAF = null;
  let timerStart = 0;
  let elapsed = 0;
  let confettiTriggered = false;
  let lastShareTime = 0;
  let fpsFrames = 0;
  let fpsLast = performance.now();

  const STORAGE = {
    best: (m) => `dontblink-best-${m}`,
    lb: (m) => `dontblink-lb-${m}`,
  };

  // Screens
  const screens = {
    hub: $('hub-screen'),
    blinkLobby: $('blink-lobby'),
    laughLobby: $('laugh-lobby'),
    blinkGame: $('blink-game'),
    laughGame: $('laugh-game'),
  };

  const shared = {
    hud: $('game-hud'),
    hudTimer: $('hud-timer'),
    hudRank: $('hud-rank'),
    hudMetric: $('hud-metric-label'),
    metricValue: $('metric-value'),
    failOverlay: $('fail-overlay'),
    failText: $('fail-text'),
    failMeme: $('fail-meme'),
    failSub: $('fail-sub'),
    blinkFlash: $('blink-flash'),
    modal: $('game-over-modal'),
    modalContent: $('modal-content'),
    modalTitle: $('modal-title'),
    modalMeme: $('modal-meme'),
    finalTime: $('final-time'),
    modalBest: $('modal-best-score'),
    modalRank: $('modal-rank'),
    confetti: $('confetti-canvas'),
    fps: $('fps-display'),
    camRing: null,
    video: null,
    canvas: null,
    noFace: null,
    countdown: null,
    countdownNum: null,
  };

  function activeGameEls() {
    const isBlink = currentMode === MODES.blink;
    return {
      screen: isBlink ? screens.blinkGame : screens.laughGame,
      video: isBlink ? $('blink-webcam') : $('laugh-webcam'),
      canvas: isBlink ? $('blink-face-canvas') : $('laugh-face-canvas'),
      ring: isBlink ? $('blink-video-container') : $('laugh-video-container'),
      noFace: isBlink ? $('blink-no-face') : $('laugh-no-face'),
      countdown: isBlink ? $('blink-countdown') : $('laugh-countdown'),
      countdownNum: isBlink ? $('blink-countdown-num') : $('laugh-countdown-num'),
      metricLabel: isBlink ? 'EAR' : 'SMILE',
    };
  }

  function showScreen(name) {
    Object.entries(screens).forEach(([k, el]) => {
      if (el) el.classList.toggle('hidden', k !== name);
    });
    shared.hud?.classList.toggle('hidden', name !== 'blinkGame' && name !== 'laughGame');
    if (name === 'hub') gameState = 'hub';
    else if (name.includes('Lobby')) gameState = 'lobby';
    /* blinkGame / laughGame: leave gameState until countdown */
  }

  function getRank(sec) {
    if (sec >= 60) return `${i18n.t('rankMonster')} 👹`;
    if (sec >= 30) return `${i18n.t('rankMachine')} 🤖`;
    if (sec >= 15) return `${i18n.t('rankHuman')} 🧑`;
    if (sec >= 5) return `${i18n.t('rankSleepy')} 😴`;
    return i18n.t('rankNone');
  }

  function formatTime(s) {
    return `${s.toFixed(2)}s`;
  }

  function getBest(mode) {
    return parseFloat(localStorage.getItem(STORAGE.best(mode)) || '0');
  }

  function setBest(mode, score) {
    const cur = getBest(mode);
    if (score > cur) localStorage.setItem(STORAGE.best(mode), String(score));
  }

  function getLB(mode) {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.lb(mode)) || '[]');
    } catch {
      return [];
    }
  }

  function saveLB(mode, score) {
    const entries = getLB(mode);
    entries.push({ score, date: Date.now() });
    entries.sort((a, b) => b.score - a.score);
    localStorage.setItem(STORAGE.lb(mode), JSON.stringify(entries.slice(0, 10)));
    setBest(mode, score);
  }

  function renderLB(listEl, mode) {
    if (!listEl) return;
    const entries = getLB(mode);
    if (!entries.length) {
      listEl.innerHTML = `<li class="lb-empty">${i18n.t('lbEmpty')}</li>`;
      return;
    }
    listEl.innerHTML = entries
      .map(
        (e, i) => `
      <li class="${i === 0 ? 'lb-you' : ''}">
        <span class="lb-rank">#${i + 1}</span>
        <span>${new Date(e.date).toLocaleDateString()}</span>
        <span class="lb-score">${formatTime(e.score)}</span>
      </li>`
      )
      .join('');
  }

  function updateLobbyScores() {
    const b = $('blink-best-score');
    const l = $('laugh-best-score');
    if (b) b.textContent = formatTime(getBest(MODES.blink));
    if (l) l.textContent = formatTime(getBest(MODES.laugh));
    renderLB($('blink-leaderboard'), MODES.blink);
    renderLB($('laugh-leaderboard'), MODES.laugh);
  }

  window.renderLeaderboard = updateLobbyScores;

  function syncTimer(v) {
    const t = v.toFixed(2);
    shared.hudTimer.textContent = t;
    shared.hudRank.textContent = getRank(v);
  }

  function timerLoop() {
    if (gameState !== 'playing') return;
    elapsed = (performance.now() - timerStart) / 1000;
    syncTimer(elapsed);
    if (elapsed >= 30 && !confettiTriggered) {
      confettiTriggered = true;
      Confetti.burst();
      SoundManager.playMilestone();
    }
    timerRAF = requestAnimationFrame(timerLoop);
  }

  function trackFPS() {
    fpsFrames++;
    const now = performance.now();
    if (now - fpsLast >= 1000) {
      if (shared.fps) shared.fps.textContent = fpsFrames;
      fpsFrames = 0;
      fpsLast = now;
    }
  }

  const Confetti = (() => {
    const c = shared.confetti;
    if (!c) return { burst: () => {} };
    const ctx = c.getContext('2d');
    return {
      burst() {
        c.width = innerWidth;
        c.height = innerHeight;
        const colors = ['#ff2d95', '#00f5ff', '#b026ff', '#39ff14'];
        let pieces = Array.from({ length: 140 }, () => ({
          x: Math.random() * c.width,
          y: -20,
          w: 8,
          h: 4,
          c: colors[Math.floor(Math.random() * colors.length)],
          vx: (Math.random() - 0.5) * 4,
          vy: Math.random() * 3 + 2,
          r: Math.random() * 360,
        }));
        const draw = () => {
          ctx.clearRect(0, 0, c.width, c.height);
          let live = false;
          pieces.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05;
            p.r += 5;
            if (p.y < c.height + 30) live = true;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.r * Math.PI) / 180);
            ctx.fillStyle = p.c;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
          });
          if (live) requestAnimationFrame(draw);
          else ctx.clearRect(0, 0, c.width, c.height);
        };
        draw();
      },
    };
  })();

  function getDetector() {
    return currentMode === MODES.blink ? BlinkDetector : LaughDetector;
  }

  function handleFail(memeKey) {
    if (gameState !== 'playing') return;
    gameState = 'failed';
    cancelAnimationFrame(timerRAF);
    getDetector().stop();

    saveLB(currentMode, elapsed);

    shared.blinkFlash?.classList.add('active');
    document.body.classList.add('shake');
    const els = activeGameEls();
    els.ring?.classList.add('shake');

    const meme = i18n.getRandomMeme(memeKey || 'memes');
    shared.failMeme.textContent = meme;
    shared.failText.textContent =
      currentMode === MODES.blink ? i18n.t('youFailed') : i18n.t('laughFailed');
    shared.failSub.textContent =
      currentMode === MODES.blink ? i18n.t('blinkDetected') : i18n.t('laughDetected');
    shared.failOverlay?.classList.remove('hidden');
    shared.failOverlay?.classList.add('active');

    SoundManager.playFail();

    setTimeout(() => shared.blinkFlash?.classList.remove('active'), 1200);

    setTimeout(() => {
      shared.failOverlay?.classList.remove('active');
      shared.failOverlay?.classList.add('hidden');
      document.body.classList.remove('shake');
      els.ring?.classList.remove('shake');

      shared.modalMeme.textContent = meme;
      shared.modalTitle.textContent = shared.failSub.textContent;
      shared.finalTime.textContent = formatTime(elapsed);
      shared.modalBest.textContent = formatTime(getBest(currentMode));
      shared.modalRank.textContent = getRank(elapsed);
      lastShareTime = elapsed;

      shared.modal?.classList.remove('hidden');
      shared.modal?.classList.add('show');
      shared.modalContent?.classList.add('show');
      shared.hud?.classList.add('hidden');
      updateLobbyScores();
    }, 1800);
  }

  async function runCountdown() {
    const els = activeGameEls();
    gameState = 'countdown';
    els.countdown?.classList.remove('hidden');

    const det = getDetector();
    if (currentMode === MODES.blink) det.pauseBlinkDetection();
    else det.pauseLaughDetection();

    for (const n of ['3', '2', '1', 'GO!']) {
      if (els.countdownNum) {
        els.countdownNum.textContent = n;
        els.countdownNum.classList.remove('count-pop');
        void els.countdownNum.offsetWidth;
        els.countdownNum.classList.add('count-pop');
      }
      if (n !== 'GO!') SoundManager.playCountdown();
      else SoundManager.playGo();
      await new Promise((r) => setTimeout(r, 850));
    }

    els.countdown?.classList.add('hidden');
    gameState = 'playing';
    timerStart = performance.now();
    confettiTriggered = false;
    syncTimer(0);

    if (currentMode === MODES.blink) det.enableBlinkDetection();
    else det.enableLaughDetection();

    els.screen?.classList.add('mode-active');
    timerLoop();
  }

  async function startGame() {
    SoundManager.resume();
    const els = activeGameEls();
    const det = getDetector();

    showScreen(currentMode === MODES.blink ? 'blinkGame' : 'laughGame');
    shared.hud?.classList.remove('hidden');
    if (shared.hudMetric) {
      shared.hudMetric.textContent =
        currentMode === MODES.blink ? i18n.t('metricEar') : i18n.t('metricSmile');
    }

    try {
      if (currentMode === MODES.laugh) await LaughDetector.init();
      await det.start(els.video, els.canvas);
      await new Promise((r) => setTimeout(r, 400));
      await runCountdown();
    } catch (err) {
      console.error(err);
      alert(
        err.message === 'HTTPS_REQUIRED' ? i18n.t('httpsRequired') : i18n.t('cameraRequired')
      );
      backToLobby();
    }
  }

  function stopAll() {
    cancelAnimationFrame(timerRAF);
    BlinkDetector.stop();
    LaughDetector.stop();
    gameState = 'hub';
  }

  function backToHub() {
    stopAll();
    shared.modal?.classList.remove('show');
    shared.modal?.classList.add('hidden');
    shared.modalContent?.classList.remove('show');
    shared.hud?.classList.add('hidden');
    showScreen('hub');
    updateLobbyScores();
  }

  function backToLobby() {
    stopAll();
    shared.modal?.classList.remove('show');
    shared.modal?.classList.add('hidden');
    shared.hud?.classList.add('hidden');
    showScreen(currentMode === MODES.blink ? 'blinkLobby' : 'laughLobby');
    updateLobbyScores();
  }

  function wireBlink() {
    BlinkDetector.onBlinkCallback = () => handleFail('memes');
    BlinkDetector.onFrameCallback = (ear, th, cal, face, mode) => {
      if (currentMode !== MODES.blink || !shared.metricValue) return;
      trackFPS();
      if (!face && ear === 0) {
        shared.metricValue.textContent = '—';
        return;
      }
      shared.metricValue.textContent = cal
        ? `${Number(ear).toFixed(3)}`
        : Number(ear).toFixed(3);
      shared.metricValue.classList.toggle('metric-alert', cal && ear < (th || 0));
    };
    BlinkDetector.onNoFaceCallback = (lost) => {
      const els = activeGameEls();
      els.noFace?.classList.toggle('hidden', !lost);
      els.ring?.classList.toggle('face-ok', !lost && (gameState === 'playing' || gameState === 'countdown'));
    };
  }

  function wireLaugh() {
    LaughDetector.onLaughCallback = () => handleFail('laughMemes');
    LaughDetector.onFrameCallback = (smile, th, cal, face) => {
      if (currentMode !== MODES.laugh || !shared.metricValue) return;
      trackFPS();
      if (!face) {
        shared.metricValue.textContent = '—';
        return;
      }
      shared.metricValue.textContent = cal
        ? Number(smile).toFixed(3)
        : Number(smile).toFixed(3);
      shared.metricValue.classList.toggle('metric-alert', cal && smile > (th || 99));
    };
    LaughDetector.onNoFaceCallback = (lost) => {
      const els = activeGameEls();
      els.noFace?.classList.toggle('hidden', !lost);
      els.ring?.classList.toggle('face-ok', !lost && (gameState === 'playing' || gameState === 'countdown'));
    };
  }

  function bindEvents() {
    document.querySelectorAll('[data-mode]').forEach((card) => {
      card.addEventListener('click', () => {
        currentMode = card.dataset.mode;
        showScreen(currentMode === MODES.blink ? 'blinkLobby' : 'laughLobby');
        updateLobbyScores();
        rotateLaughPrompt();
      });
    });

    $('hub-back-blink')?.addEventListener('click', backToHub);
    $('hub-back-laugh')?.addEventListener('click', backToHub);
    $('blink-start-btn')?.addEventListener('click', startGame);
    $('laugh-start-btn')?.addEventListener('click', startGame);
    $('retry-btn')?.addEventListener('click', backToLobby);
    $('share-btn')?.addEventListener('click', shareResult);
    document.querySelector('[data-close-modal]')?.addEventListener('click', backToLobby);

    $('lang-btn')?.addEventListener('click', i18n.toggleLanguage);
    $('sound-btn')?.addEventListener('click', SoundManager.toggle);
    $('fullscreen-btn')?.addEventListener('click', toggleFullscreen);
  }

  function rotateLaughPrompt() {
    const el = $('laugh-prompt');
    if (!el) return;
    const prompts = i18n.getLaughPrompts();
    if (prompts?.length) {
      el.textContent = prompts[Math.floor(Math.random() * prompts.length)];
    }
  }

  async function shareResult() {
    const text =
      currentMode === MODES.blink
        ? i18n.shareText(lastShareTime.toFixed(2))
        : i18n.laughShareText(lastShareTime.toFixed(2));
    const url = location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: i18n.t('hubTitle'), text, url });
        return;
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      $('share-toast')?.classList.remove('hidden');
      setTimeout(() => $('share-toast')?.classList.add('hidden'), 2500);
    } catch {
      /* noop */
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  async function boot() {
    i18n.applyTranslations();
    updateLobbyScores();
    ParticleBackground.start();
    wireBlink();
    wireLaugh();
    bindEvents();
    rotateLaughPrompt();

    if ($('https-warning') && !window.isSecureContext) {
      $('https-warning').classList.remove('hidden');
    }
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      $('fullscreen-btn')?.style.setProperty('display', 'none');
    }

    const bar = $('loading-bar');
    const pct = $('loading-percent');
    let progress = 0;
    const tick = setInterval(() => {
      progress = Math.min(progress + 5, 90);
      if (bar) bar.style.width = `${progress}%`;
      if (pct) pct.textContent = progress;
    }, 90);

    try {
      await BlinkDetector.init();
    } catch (e) {
      console.warn('BlinkDetector init:', e);
    }

    clearInterval(tick);
    if (bar) bar.style.width = '100%';
    if (pct) pct.textContent = '100';

    await new Promise((r) => setTimeout(r, 300));
    $('loading-screen')?.classList.add('hide');
    $('app')?.classList.add('ready');
    setTimeout(() => {
      $('loading-screen')?.style.setProperty('display', 'none');
    }, 600);

    showScreen('hub');
  }

  return { boot, backToHub, backToLobby, rotateLaughPrompt };
})();

window.GameHub = GameHub;

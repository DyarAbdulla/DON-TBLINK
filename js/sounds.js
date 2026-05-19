/**
 * sounds.js — Web Audio effects + mute toggle
 */

const SoundManager = (() => {
  let ctx = null;
  let enabled = localStorage.getItem('dontblink-sound') !== 'false';

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function playTone(freq, duration, type = 'sine', volume = 0.12, delay = 0) {
    if (!enabled) return;
    const audio = getCtx();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, audio.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + delay + duration);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(audio.currentTime + delay);
    osc.stop(audio.currentTime + delay + duration);
  }

  function playFail() {
    if (!enabled) return;
    [440, 330, 220, 110].forEach((f, i) => playTone(f, 0.18, 'sawtooth', 0.18, i * 0.09));
    setTimeout(() => playTone(80, 0.5, 'triangle', 0.2), 450);
  }

  function playCountdown() {
    playTone(880, 0.08, 'sine', 0.1);
  }

  function playGo() {
    playTone(1200, 0.15, 'sine', 0.12);
    playTone(1600, 0.12, 'sine', 0.1, 0.08);
  }

  function playMilestone() {
    [523, 659, 784, 1047].forEach((f, i) => playTone(f, 0.18, 'sine', 0.09, i * 0.07));
  }

  function playWarning() {
    playTone(200, 0.06, 'square', 0.08);
  }

  function toggle() {
    enabled = !enabled;
    localStorage.setItem('dontblink-sound', enabled);
    updateIcon();
    if (enabled) playTone(660, 0.06, 'sine', 0.08);
    const btn = document.getElementById('sound-btn');
    if (btn) btn.setAttribute('aria-pressed', String(enabled));
  }

  function updateIcon() {
    const on = document.getElementById('sound-icon-on');
    const off = document.getElementById('sound-icon-off');
    if (on) on.classList.toggle('hidden', !enabled);
    if (off) off.classList.toggle('hidden', enabled);
  }

  function resume() {
    if (ctx?.state === 'suspended') ctx.resume();
  }

  updateIcon();
  return { playFail, playCountdown, playGo, playMilestone, playWarning, toggle, resume, get enabled() { return enabled; } };
})();

window.SoundManager = SoundManager;

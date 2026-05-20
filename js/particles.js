/**
 * particles.js — Lightweight ambient particles (low CPU on mobile)
 */

const ParticleBackground = (() => {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return { start: () => {}, stop: () => {} };

  const ctx = canvas.getContext('2d');
  let particles = [];
  let animId = null;
  let w = 0;
  let h = 0;
  let running = true;

  const COLORS = ['#ff2d95', '#00f5ff', '#b026ff'];

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function init() {
    resize();
    const n = window.innerWidth < 768 ? 22 : 40;
    particles = Array.from({ length: n }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.5 + 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      a: Math.random() * 0.25 + 0.08,
    }));
  }

  function draw() {
    if (!running) {
      animId = requestAnimationFrame(draw);
      return;
    }
    ctx.clearRect(0, 0, w, h);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.a;
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    animId = requestAnimationFrame(draw);
  }

  function start() {
    init();
    draw();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => {
      running = !document.hidden;
    });
  }

  return { start };
})();

window.ParticleBackground = ParticleBackground;

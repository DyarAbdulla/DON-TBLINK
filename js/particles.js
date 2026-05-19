/**
 * particles.js — Premium neon particle field
 * Pauses when tab hidden for performance
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

  const COLORS = ['#ff2d95', '#00f5ff', '#b026ff', '#39ff14'];

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function createParticle() {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 2.2 + 0.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: Math.random() * 0.45 + 0.15,
      pulse: Math.random() * Math.PI * 2,
    };
  }

  function init() {
    resize();
    const count = window.innerWidth < 768 ? 40 : window.innerWidth < 1200 ? 70 : 100;
    particles = Array.from({ length: count }, createParticle);
  }

  function draw() {
    if (!running) {
      animId = requestAnimationFrame(draw);
      return;
    }

    ctx.clearRect(0, 0, w, h);

    particles.forEach((p, i) => {
      p.pulse += 0.02;
      const glow = 0.15 + Math.sin(p.pulse) * 0.1;
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha + glow;
      ctx.fill();

      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const d = Math.hypot(dx, dy);
        if (d < 100) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = (1 - d / 100) * 0.12;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
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

  function stop() {
    if (animId) cancelAnimationFrame(animId);
  }

  return { start, stop };
})();

window.ParticleBackground = ParticleBackground;

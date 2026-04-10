/* ============================================
   MathBattle — Visual Effects (Confetti, etc.)
   ============================================ */

window.QuizApp = window.QuizApp || {};

QuizApp.Effects = {
  confetti: {
    canvas: null,
    ctx: null,
    particles: [],
    running: false,
    animFrame: null,

    init() {
      this.canvas = document.getElementById('confetti-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
    },

    resize() {
      if (!this.canvas) return;
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    },

    createParticle() {
      const colors = ['#7c3aed', '#f472b6', '#22d3ee', '#fbbf24', '#10b981',
                       '#ef4444', '#a78bfa', '#f9a8d4', '#67e8f9', '#ffd700'];
      return {
        x: Math.random() * this.canvas.width,
        y: -20,
        w: Math.random() * 12 + 6,
        h: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        velocityX: (Math.random() - 0.5) * 4,
        velocityY: Math.random() * 3 + 2,
        opacity: 1,
        decay: Math.random() * 0.005 + 0.002,
      };
    },

    start(duration = 4000) {
      this.init();
      if (!this.canvas) return;

      this.running = true;
      this.particles = [];

      // Burst of particles
      for (let i = 0; i < 100; i++) {
        const p = this.createParticle();
        p.y = Math.random() * this.canvas.height * 0.3;
        p.velocityY = Math.random() * 2 + 1;
        this.particles.push(p);
      }

      // Continuous stream
      const spawnInterval = setInterval(() => {
        if (!this.running) {
          clearInterval(spawnInterval);
          return;
        }
        for (let i = 0; i < 3; i++) {
          this.particles.push(this.createParticle());
        }
      }, 50);

      this.animate();

      setTimeout(() => {
        this.running = false;
        clearInterval(spawnInterval);
        setTimeout(() => {
          if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          }
          this.particles = [];
          if (this.animFrame) cancelAnimationFrame(this.animFrame);
        }, 2000);
      }, duration);
    },

    animate() {
      if (!this.ctx || (!this.running && this.particles.length === 0)) return;

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      this.particles = this.particles.filter(p => {
        p.x += p.velocityX;
        p.y += p.velocityY;
        p.rotation += p.rotationSpeed;
        p.velocityY += 0.05; // gravity
        p.opacity -= p.decay;

        if (p.opacity <= 0 || p.y > this.canvas.height + 20) return false;

        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.globalAlpha = p.opacity;
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        this.ctx.restore();

        return true;
      });

      this.animFrame = requestAnimationFrame(() => this.animate());
    },

    stop() {
      this.running = false;
    },
  },

  // Shake an element
  shake(element) {
    if (!element) return;
    element.style.animation = 'none';
    element.offsetHeight; // trigger reflow
    element.style.animation = 'shake 0.4s ease';
    setTimeout(() => { element.style.animation = ''; }, 400);
  },

  // Pulse an element
  pulse(element) {
    if (!element) return;
    element.style.animation = 'none';
    element.offsetHeight;
    element.style.animation = 'correctPop 0.5s ease';
    setTimeout(() => { element.style.animation = ''; }, 500);
  },

  // Flash the screen green/red
  flash(color = 'green') {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 998;
      background: ${color === 'green' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'};
      pointer-events: none;
      animation: flashFade 0.4s ease-out forwards;
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 400);
  },

  // Number counter animation
  animateNumber(element, from, to, duration = 1000) {
    const start = performance.now();
    const update = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = Math.round(from + (to - from) * eased);
      element.textContent = current;
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  },
};

// Add flash animation CSS
const flashStyle = document.createElement('style');
flashStyle.textContent = `
  @keyframes flashFade {
    from { opacity: 1; }
    to { opacity: 0; }
  }
`;
document.head.appendChild(flashStyle);

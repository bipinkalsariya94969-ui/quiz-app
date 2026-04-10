/* ============================================
   MathBattle — Sound Effects (Web Audio API)
   ============================================ */

window.QuizApp = window.QuizApp || {};

QuizApp.Sounds = {
  enabled: true,
  audioCtx: null,

  init() {
    this.loadPreference();
  },

  getContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  },

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('mathbattle_sound', this.enabled ? '1' : '0');
    return this.enabled;
  },

  loadPreference() {
    const saved = localStorage.getItem('mathbattle_sound');
    if (saved !== null) {
      this.enabled = saved === '1';
    }
  },

  play(frequency, duration, type = 'sine', volume = 0.3) {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = type;
      oscillator.frequency.value = frequency;

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      // Silently fail if audio not available
    }
  },

  playSequence(notes, interval = 100) {
    if (!this.enabled) return;
    notes.forEach((note, i) => {
      setTimeout(() => {
        this.play(note.freq, note.dur || 0.15, note.type || 'sine', note.vol || 0.25);
      }, i * interval);
    });
  },

  // ── Sound Effects ──

  click() {
    this.play(800, 0.08, 'sine', 0.15);
  },

  correct() {
    this.playSequence([
      { freq: 523, dur: 0.1 },
      { freq: 659, dur: 0.1 },
      { freq: 784, dur: 0.2 },
    ], 80);
  },

  wrong() {
    this.playSequence([
      { freq: 300, dur: 0.15, type: 'sawtooth', vol: 0.15 },
      { freq: 250, dur: 0.2, type: 'sawtooth', vol: 0.15 },
    ], 120);
  },

  tick() {
    this.play(1000, 0.05, 'sine', 0.1);
  },

  tickWarning() {
    this.play(600, 0.1, 'square', 0.15);
  },

  countdown(number) {
    if (number > 0) {
      this.play(440 + (number * 50), 0.15, 'sine', 0.2);
    } else {
      // GO!
      this.playSequence([
        { freq: 523, dur: 0.1, vol: 0.3 },
        { freq: 659, dur: 0.1, vol: 0.3 },
        { freq: 784, dur: 0.1, vol: 0.3 },
        { freq: 1047, dur: 0.3, vol: 0.4 },
      ], 100);
    }
  },

  timeUp() {
    this.playSequence([
      { freq: 800, dur: 0.1, type: 'square', vol: 0.2 },
      { freq: 600, dur: 0.1, type: 'square', vol: 0.2 },
      { freq: 400, dur: 0.2, type: 'square', vol: 0.2 },
    ], 100);
  },

  victory() {
    this.playSequence([
      { freq: 523, dur: 0.15 },
      { freq: 587, dur: 0.15 },
      { freq: 659, dur: 0.15 },
      { freq: 784, dur: 0.15 },
      { freq: 880, dur: 0.15 },
      { freq: 1047, dur: 0.3 },
    ], 120);
  },

  quizComplete() {
    this.playSequence([
      { freq: 440, dur: 0.2 },
      { freq: 554, dur: 0.2 },
      { freq: 659, dur: 0.2 },
      { freq: 880, dur: 0.4 },
    ], 150);
  },

  join() {
    this.playSequence([
      { freq: 400, dur: 0.1 },
      { freq: 600, dur: 0.15 },
    ], 100);
  },
};

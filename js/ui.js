/* ============================================
   MathBattle — UI Utilities Module
   ============================================
   Centralized DOM helpers, debouncing, server
   time synchronization, and screen transitions
   ============================================ */

window.QuizApp = window.QuizApp || {};

QuizApp.UI = {
  // ── Server Time Sync ──
  // Offset between server clock and local clock (ms)
  _serverTimeOffset: 0,
  _synced: false,

  /**
   * Sync local clock with server time.
   * Call this once after any API response that includes `serverTime`.
   */
  syncServerTime(serverTime) {
    if (typeof serverTime === 'number' && serverTime > 0) {
      this._serverTimeOffset = serverTime - Date.now();
      this._synced = true;
    }
  },

  /**
   * Get the current "server time" from the local clock + offset.
   * Use this for all countdown / timer calculations.
   */
  getServerNow() {
    return Date.now() + this._serverTimeOffset;
  },

  isSynced() {
    return this._synced;
  },

  // ── Debounce ──
  _debounceTimers: {},

  /**
   * Debounce a function call by key.
   * Prevents rapid duplicate API calls from button mashing.
   */
  debounce(key, fn, delayMs = 500) {
    if (this._debounceTimers[key]) {
      clearTimeout(this._debounceTimers[key]);
    }
    return new Promise((resolve) => {
      this._debounceTimers[key] = setTimeout(async () => {
        delete this._debounceTimers[key];
        resolve(await fn());
      }, delayMs);
    });
  },

  /**
   * Throttle: run immediately, then block for `delayMs`.
   * Better for button clicks where you want instant response.
   */
  _throttleFlags: {},

  throttle(key, fn, delayMs = 1500) {
    if (this._throttleFlags[key]) return Promise.resolve(null);
    this._throttleFlags[key] = true;
    setTimeout(() => { delete this._throttleFlags[key]; }, delayMs);
    return fn();
  },

  // ── Precise Timer ──
  // Wall-clock based timer that doesn't drift with setInterval
  createPreciseTimer(durationSec, onTick, onComplete) {
    const startTime = performance.now();
    const totalMs = durationSec * 1000;
    let rafId = null;
    let stopped = false;

    const tick = () => {
      if (stopped) return;
      const elapsed = performance.now() - startTime;
      const remaining = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));

      onTick(remaining, elapsed / totalMs);

      if (remaining <= 0) {
        onComplete();
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return {
      stop() {
        stopped = true;
        if (rafId) cancelAnimationFrame(rafId);
      },
      getRemaining() {
        const elapsed = performance.now() - startTime;
        return Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
      },
    };
  },

  // ── DOM Batch Update ──
  // Batch multiple DOM writes into a single rAF frame
  _batchQueue: [],
  _batchScheduled: false,

  batchDOM(fn) {
    this._batchQueue.push(fn);
    if (!this._batchScheduled) {
      this._batchScheduled = true;
      requestAnimationFrame(() => {
        const queue = this._batchQueue.slice();
        this._batchQueue = [];
        this._batchScheduled = false;
        queue.forEach(f => f());
      });
    }
  },

  // ── Screen Transition with Callback ──
  transitionScreen(fromId, toId, callback) {
    const from = document.getElementById(fromId);
    const to = document.getElementById(toId);
    if (from) from.classList.remove('active');
    if (to) {
      to.classList.add('active');
      window.scrollTo(0, 0);
    }
    if (callback) requestAnimationFrame(callback);
  },

  // ── Format helpers ──
  formatDuration(ms) {
    if (!ms || ms <= 0) return '0s';
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
  },

  formatCountdown(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return min > 0 ? `${min}:${String(sec).padStart(2, '0')}` : `${sec}`;
  },
};

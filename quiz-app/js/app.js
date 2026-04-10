/* ============================================
   MathBattle — Main App Controller (Production v3)
   ============================================
   Upgrades: server time sync on every API call,
   throttled button actions, precise countdown,
   improved polling lifecycle, quiz lock
   ============================================ */

window.QuizApp = window.QuizApp || {};

QuizApp.App = {
  currentScreen: null,
  pollTimer: null,
  participantPollTimer: null,
  currentCompetition: null,
  countdownTimer: null,          // RAF-based countdown handle
  _hasSubmitted: false,
  _quizLocked: false,            // Prevent re-joining after quiz started

  // ── Initialization ──

  init() {
    QuizApp.Sounds.init();
    QuizApp.Auth.init();
    this.setupEventListeners();
    this.updateSoundToggle();

    if (QuizApp.Auth.isLoggedIn()) {
      this.showScreen('dashboard-screen');
      this.loadDashboard();
      this.startPolling();
    } else {
      this.showScreen('login-screen');
    }

    if (QuizApp.Config.isDemoMode()) {
      document.getElementById('demo-banner')?.classList.remove('hidden');
    }
  },

  // ── Screen Management ──

  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) {
      screen.classList.add('active');
      this.currentScreen = screenId;
      window.scrollTo(0, 0);
    }
  },

  // ── Event Listeners ──

  setupEventListeners() {
    // Sound
    document.getElementById('sound-toggle')?.addEventListener('click', () => {
      QuizApp.Sounds.toggle();
      this.updateSoundToggle();
      QuizApp.Sounds.click();
    });

    // Login
    document.getElementById('login-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      QuizApp.UI.throttle('login', () => this.handleLogin(), 2000);
    });

    // Register
    document.getElementById('register-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      QuizApp.UI.throttle('register', () => this.handleRegister(), 2000);
    });

    // Auth switches
    document.getElementById('show-register')?.addEventListener('click', (e) => {
      e.preventDefault();
      QuizApp.Sounds.click();
      this.showScreen('register-screen');
    });
    document.getElementById('show-login')?.addEventListener('click', (e) => {
      e.preventDefault();
      QuizApp.Sounds.click();
      this.showScreen('login-screen');
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      QuizApp.Sounds.click();
      this.handleLogout();
    });

    // Join — throttled to prevent double-join
    document.getElementById('join-btn')?.addEventListener('click', () => {
      QuizApp.Sounds.click();
      QuizApp.UI.throttle('join', () => this.joinCompetition(), 3000);
    });

    // Admin start — throttled
    document.getElementById('admin-start-btn')?.addEventListener('click', () => {
      QuizApp.Sounds.click();
      QuizApp.UI.throttle('start', () => this.startCompetition(), 3000);
    });

    // Admin reset
    document.getElementById('admin-reset-btn')?.addEventListener('click', () => {
      QuizApp.Sounds.click();
      this.resetCompetition();
    });

    // View leaderboard
    document.getElementById('view-leaderboard-btn')?.addEventListener('click', () => {
      QuizApp.Sounds.click();
      this.showLeaderboard();
    });

    // Navigation
    document.getElementById('back-to-dashboard-btn')?.addEventListener('click', () => {
      QuizApp.Sounds.click();
      this.showScreen('dashboard-screen');
      this.loadDashboard();
    });
    document.getElementById('result-dashboard-btn')?.addEventListener('click', () => {
      QuizApp.Sounds.click();
      this.showScreen('dashboard-screen');
      this.loadDashboard();
    });
    document.getElementById('result-leaderboard-btn')?.addEventListener('click', () => {
      QuizApp.Sounds.click();
      this.showLeaderboard();
    });

    // Refresh
    document.getElementById('refresh-btn')?.addEventListener('click', () => {
      QuizApp.Sounds.click();
      this.loadDashboard();
    });
  },

  updateSoundToggle() {
    const btn = document.getElementById('sound-toggle');
    if (btn) btn.textContent = QuizApp.Sounds.enabled ? '🔊' : '🔇';
  },

  // ── Auth ──

  async handleLogin() {
    const mobile = document.getElementById('login-mobile')?.value.trim();
    const mpin = document.getElementById('login-mpin')?.value.trim();
    const errorEl = document.getElementById('login-error');

    if (!mobile || !mpin) return this.showError(errorEl, 'Please fill in all fields');
    if (!/^\d{10}$/.test(mobile)) return this.showError(errorEl, 'Enter a valid 10-digit mobile number');
    if (!/^\d{4}$/.test(mpin)) return this.showError(errorEl, 'MPIN must be exactly 4 digits');

    this.showLoading('Logging in...');
    try {
      const result = await QuizApp.Auth.login(mobile, mpin);
      this.hideLoading();
      if (result.success) {
        QuizApp.Sounds.join();
        this._hasSubmitted = false;
        this._quizLocked = false;
        this.showScreen('dashboard-screen');
        this.loadDashboard();
        this.startPolling();
      } else {
        this.showError(errorEl, result.error || 'Login failed');
        QuizApp.Sounds.wrong();
      }
    } catch (error) {
      this.hideLoading();
      this.showError(errorEl, 'Connection error. Please try again.');
    }
  },

  async handleRegister() {
    const name = document.getElementById('register-name')?.value.trim();
    const mobile = document.getElementById('register-mobile')?.value.trim();
    const mpin = document.getElementById('register-mpin')?.value.trim();
    const errorEl = document.getElementById('register-error');

    if (!name || !mobile || !mpin) return this.showError(errorEl, 'Please fill in all fields');
    if (name.length < 2) return this.showError(errorEl, 'Name must be at least 2 characters');
    if (!/^\d{10}$/.test(mobile)) return this.showError(errorEl, 'Enter a valid 10-digit mobile number');
    if (!/^\d{4}$/.test(mpin)) return this.showError(errorEl, 'MPIN must be exactly 4 digits');

    this.showLoading('Creating account...');
    try {
      const result = await QuizApp.Auth.register(name, mobile, mpin);
      this.hideLoading();
      if (result.success) {
        QuizApp.Sounds.victory();
        this._hasSubmitted = false;
        this.showScreen('dashboard-screen');
        this.loadDashboard();
        this.startPolling();
        this.showToast('Welcome to MathBattle! 🎉', 'success');
      } else {
        this.showError(errorEl, result.error || 'Registration failed');
        QuizApp.Sounds.wrong();
      }
    } catch (error) {
      this.hideLoading();
      this.showError(errorEl, 'Connection error. Please try again.');
    }
  },

  handleLogout() {
    this.stopPolling();
    QuizApp.Auth.logout();
    QuizApp.Quiz.reset();
    this._hasSubmitted = false;
    this._quizLocked = false;
    this.showScreen('login-screen');
    ['login-mobile', 'login-mpin', 'register-name', 'register-mobile', 'register-mpin'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  },

  // ── Dashboard ──

  async loadDashboard() {
    const user = QuizApp.Auth.getUser();
    if (!user) return;

    const nameEl = document.querySelector('.user-name');
    if (nameEl) nameEl.textContent = user.name;

    const adminSection = document.getElementById('admin-section');
    if (adminSection) adminSection.classList.toggle('hidden', !QuizApp.Auth.isAdmin());

    await this.checkCompetitionStatus();
  },

  async checkCompetitionStatus() {
    try {
      const result = await QuizApp.API.getCompetitionStatus();
      if (!result.success) return;

      // ── Sync server time on every status poll ──
      if (result.serverTime) {
        QuizApp.UI.syncServerTime(result.serverTime);
      }
      const comp = result.competition;
      if (comp && comp.serverTime) {
        QuizApp.UI.syncServerTime(comp.serverTime);
      }

      this.currentCompetition = comp;

      const statusBadge = document.getElementById('competition-status');
      const joinBtn = document.getElementById('join-btn');
      const compInfo = document.getElementById('competition-info');
      const participantEl = document.getElementById('participant-count-num');
      const viewLbBtn = document.getElementById('view-leaderboard-btn');

      if (!comp) {
        if (statusBadge) {
          statusBadge.className = 'status-badge waiting';
          statusBadge.innerHTML = '<span class="pulse-dot"></span> No Competition Yet';
        }
        if (compInfo) compInfo.textContent = QuizApp.Auth.isAdmin()
          ? 'Start a new competition from the admin panel below!'
          : 'Waiting for today\'s competition to begin...';
        if (joinBtn) joinBtn.classList.add('hidden');
        if (viewLbBtn) viewLbBtn.classList.add('hidden');
        return;
      }

      if (participantEl) participantEl.textContent = comp.participantCount || 0;
      this._updateStatsGrid(comp);

      switch (comp.status) {
        case 'waiting':
          if (statusBadge) {
            statusBadge.className = 'status-badge waiting';
            statusBadge.innerHTML = '<span class="pulse-dot"></span> Waiting to Start';
          }
          if (compInfo) compInfo.textContent = `${comp.questionCount || 80} questions ready. Join when you're ready!`;
          if (joinBtn && !this._hasSubmitted && !this._quizLocked) {
            joinBtn.classList.remove('hidden');
            joinBtn.textContent = '🚀 Join Competition';
          } else if (joinBtn) {
            joinBtn.classList.add('hidden');
          }
          if (viewLbBtn) viewLbBtn.classList.add('hidden');
          break;

        case 'countdown':
          if (this.currentScreen === 'dashboard-screen' && !this._quizLocked) {
            // Auto-join the countdown from dashboard polling
            this.joinCompetition();
          }
          if (joinBtn) joinBtn.classList.add('hidden');
          if (viewLbBtn) viewLbBtn.classList.add('hidden');
          break;

        case 'active':
          if (statusBadge) {
            statusBadge.className = 'status-badge active';
            statusBadge.innerHTML = '<span class="pulse-dot"></span> Competition Live!';
          }
          if (compInfo) compInfo.textContent = this._hasSubmitted
            ? 'You\'ve already submitted. Wait for results!'
            : 'Competition is in progress!';
          if (joinBtn) {
            if (this._hasSubmitted || this._quizLocked) {
              joinBtn.classList.add('hidden');
            } else {
              joinBtn.classList.remove('hidden');
              joinBtn.textContent = '🎯 Join Now!';
            }
          }
          if (viewLbBtn) viewLbBtn.classList.add('hidden');
          break;

        case 'completed':
          if (statusBadge) {
            statusBadge.className = 'status-badge completed';
            statusBadge.innerHTML = '✅ Completed';
          }
          if (compInfo) compInfo.textContent = 'Today\'s competition is over. Check the leaderboard!';
          if (joinBtn) joinBtn.classList.add('hidden');
          if (viewLbBtn) viewLbBtn.classList.remove('hidden');
          break;
      }
    } catch (error) {
      console.error('Status check failed:', error);
    }
  },

  _updateStatsGrid(comp) {
    const statValues = document.querySelectorAll('.stats-grid .stat-value');
    if (statValues.length >= 2) {
      statValues[0].textContent = comp.questionCount || 80;
      statValues[1].textContent = (comp.timePerQuestion || 20) + 's';
    }
  },

  // ── Competition Flow ──

  async startCompetition() {
    if (!confirm('Start a new competition? This will replace any existing one.')) return;

    const questionCount = parseInt(document.getElementById('admin-question-count')?.value) || 80;
    const timePerQuestion = parseInt(document.getElementById('admin-time-per-q')?.value) || 20;
    const difficulty = document.getElementById('admin-difficulty')?.value || 'mixed';
    const scheduledTime = document.getElementById('admin-scheduled-time')?.value || '';

    this.showLoading('Generating questions...');
    try {
      const result = await QuizApp.API.startCompetition({
        questionCount, timePerQuestion, difficulty, scheduledTime,
      });
      this.hideLoading();
      if (result.success) {
        this.showToast('Competition started! 🎉', 'success');
        this.currentCompetition = result.competition;
        this._hasSubmitted = false;
        this._quizLocked = false;
        await this.loadDashboard();
      } else {
        this.showToast(result.error || 'Failed to start', 'error');
      }
    } catch (error) {
      this.hideLoading();
      this.showToast('Error starting competition', 'error');
    }
  },

  async resetCompetition() {
    if (!confirm('⚠️ Reset today\'s competition?\nThis will delete all results!')) return;

    this.showLoading('Resetting...');
    try {
      await QuizApp.API.resetCompetition(this.currentCompetition?.id);
      this.hideLoading();
      this._hasSubmitted = false;
      this._quizLocked = false;
      this.showToast('Competition reset!', 'success');
      await this.loadDashboard();
    } catch (error) {
      this.hideLoading();
      this.showToast('Reset failed', 'error');
    }
  },

  async joinCompetition() {
    if (!this.currentCompetition) {
      this.showToast('No competition available', 'error');
      return;
    }
    if (this._hasSubmitted) {
      this.showToast('You already submitted answers!', 'error');
      return;
    }
    if (this._quizLocked) return;

    const mobile = QuizApp.Auth.getMobile();
    this.showLoading('Joining...');

    try {
      const result = await QuizApp.API.joinCompetition(this.currentCompetition.id, mobile);
      this.hideLoading();

      // Sync time from join response
      if (result.serverTime) QuizApp.UI.syncServerTime(result.serverTime);

      if (result.success) {
        this._quizLocked = true;
        QuizApp.Sounds.join();

        if (result.status === 'countdown') {
          this.startCountdown({
            ...this.currentCompetition,
            startTime: result.startTime,
          });
        } else if (result.status === 'active') {
          this.startQuiz();
        }
      } else {
        if (result.error?.includes('already submitted')) {
          this._hasSubmitted = true;
        }
        this.showToast(result.error || 'Failed to join', 'error');
      }
    } catch (error) {
      this.hideLoading();
      this.showToast('Error joining competition', 'error');
    }
  },

  // ── Countdown (server-synced, precise) ──

  startCountdown(competition) {
    this.showScreen('countdown-screen');
    const targetTime = competition.startTime;
    const totalDuration = QuizApp.Config.COUNTDOWN_DURATION;
    const circumference = 2 * Math.PI * 90;

    // Stop any existing countdown
    if (this.countdownTimer) {
      this.countdownTimer.stop();
      this.countdownTimer = null;
    }

    const updateCountdown = () => {
      // Use server-synced time for accuracy
      const now = QuizApp.UI.isSynced() ? QuizApp.UI.getServerNow() : Date.now();
      const remainingMs = Math.max(0, targetTime - now);
      const remaining = Math.ceil(remainingMs / 1000);

      const numberEl = document.querySelector('.countdown-number');
      const progressEl = document.querySelector('.countdown-circle .progress');
      const countdownPartEl = document.getElementById('countdown-participant-count');

      if (numberEl) numberEl.textContent = remaining;
      if (progressEl) {
        const offset = circumference * (1 - remaining / totalDuration);
        progressEl.style.strokeDashoffset = offset;
      }
      if (countdownPartEl && this.currentCompetition) {
        countdownPartEl.textContent = this.currentCompetition.participantCount || 0;
      }

      // Sound on each second change
      QuizApp.Sounds.countdown(remaining);

      if (remaining <= 0) {
        if (this.countdownTimer) {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
        }
        this.startQuiz();
        return;
      }
    };

    updateCountdown();
    this.countdownTimer = setInterval(updateCountdown, 250); // Check 4x/sec for precision
  },

  async startQuiz() {
    if (!this.currentCompetition) return;
    this.showScreen('quiz-screen');
    try {
      await QuizApp.Quiz.start(this.currentCompetition.id);
    } catch (error) {
      console.error('Quiz start error:', error);
      this.showToast('Error loading questions', 'error');
      this._quizLocked = false;
      this.showScreen('dashboard-screen');
    }
  },

  // ── Results ──

  showResult(result) {
    this.showScreen('result-screen');
    this._hasSubmitted = true;

    const { score, totalQuestions, timeTaken, rank, totalParticipants, wrongCount = 0, skippedCount = 0 } = result;
    const percentage = Math.round((score / totalQuestions) * 100);
    const timeStr = QuizApp.UI.formatDuration(timeTaken);

    let emoji, title, subtitle;
    if (percentage >= 90) {
      emoji = '🏆'; title = 'Outstanding!'; subtitle = 'You\'re a math genius!';
    } else if (percentage >= 70) {
      emoji = '🌟'; title = 'Great Job!'; subtitle = 'Keep up the amazing work!';
    } else if (percentage >= 50) {
      emoji = '💪'; title = 'Good Effort!'; subtitle = 'You\'re getting better!';
    } else if (percentage >= 30) {
      emoji = '📚'; title = 'Keep Practicing!'; subtitle = 'You\'ll do better next time!';
    } else {
      emoji = '🎯'; title = 'Don\'t Give Up!'; subtitle = 'Practice makes perfect!';
    }

    const update = (sel, val) => {
      const el = document.querySelector(sel);
      if (el) el.textContent = val;
    };

    update('.result-emoji', emoji);
    update('.result-title', title);
    update('.result-subtitle', subtitle);
    update('#result-total-q', totalQuestions);
    update('#result-accuracy', `${percentage}%`);
    update('#result-time', timeStr);
    update('#result-wrong-count', wrongCount);
    update('#result-skipped-count', skippedCount);

    const scoreEl = document.querySelector('.score-big');
    if (scoreEl) QuizApp.Effects.animateNumber(scoreEl, 0, score, 1000);

    // Correct count in bottom row
    const correctEl = document.querySelector('.score-big-mini');
    if (correctEl) QuizApp.Effects.animateNumber(correctEl, 0, score, 800);

    // Rank
    const rankContainer = document.querySelector('.result-rank');
    if (rankContainer && rank !== '?') {
      rankContainer.classList.remove('hidden');
      update('.rank-medal', rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : '🏅');
      update('.rank-text', `Rank #${rank} of ${totalParticipants}`);
    }
    update('#result-rank-value', rank !== '?' ? `#${rank}` : '-');

    // Effects
    if (percentage >= 50) setTimeout(() => QuizApp.Effects.confetti.start(3000), 500);
    if (percentage >= 70) QuizApp.Sounds.victory();

    // Mark completed locally
    if (this.currentCompetition && QuizApp.Config.isDemoMode()) {
      const comp = QuizApp.Demo.competitions.find(c => c.id === this.currentCompetition.id);
      if (comp) { comp.status = 'completed'; QuizApp.Demo.save(); }
    }
  },

  // ── Leaderboard ──

  async showLeaderboard() {
    this.showScreen('leaderboard-screen');
    this.showLoading('Loading leaderboard...');
    await QuizApp.Leaderboard.load(this.currentCompetition?.id);
    this.hideLoading();
    QuizApp.Leaderboard.render('leaderboard-content');
  },

  // ── Polling (2-second real-time) ──

  startPolling() {
    this.stopPolling();
    this.pollTimer = setInterval(() => {
      if (this.currentScreen === 'dashboard-screen') {
        this.checkCompetitionStatus();
      }
    }, QuizApp.Config.POLL_INTERVAL);
  },

  stopPolling() {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
    if (this.participantPollTimer) { clearInterval(this.participantPollTimer); this.participantPollTimer = null; }
    if (this.countdownTimer) {
      if (typeof this.countdownTimer === 'number') clearInterval(this.countdownTimer);
      else if (this.countdownTimer.stop) this.countdownTimer.stop();
      this.countdownTimer = null;
    }
  },

  // ── UI Helpers ──

  showError(element, message) {
    if (!element) return;
    element.textContent = message;
    element.classList.add('visible');
    QuizApp.Effects.shake(element);
    setTimeout(() => element.classList.remove('visible'), 4000);
  },

  showLoading(text = 'Loading...') {
    const overlay = document.getElementById('loading-overlay');
    const loadingText = document.querySelector('.loading-text');
    if (overlay) overlay.classList.add('visible');
    if (loadingText) loadingText.textContent = text;
  },

  hideLoading() {
    document.getElementById('loading-overlay')?.classList.remove('visible');
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = { info: 'ℹ️', success: '✅', error: '❌' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s ease-out forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },
};

// ── Boot ──
document.addEventListener('DOMContentLoaded', () => {
  QuizApp.App.init();
});

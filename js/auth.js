/* ============================================
   MathBattle — Authentication Module (Fixed)
   ============================================
   Fixes: duplicate login check, numeric-only validation,
   session expiry, login timestamp tracking
   ============================================ */

window.QuizApp = window.QuizApp || {};

QuizApp.Auth = {
  currentUser: null,
  _loginInProgress: false,

  init() {
    this.loadSession();
  },

  async login(mobile, mpin) {
    // Prevent duplicate login requests
    if (this._loginInProgress) {
      return { success: false, error: 'Login already in progress' };
    }

    // Validate inputs strictly
    if (!this._validateMobile(mobile)) {
      return { success: false, error: 'Enter a valid 10-digit mobile number' };
    }
    if (!this._validateMpin(mpin)) {
      return { success: false, error: 'MPIN must be exactly 4 digits' };
    }

    this._loginInProgress = true;
    try {
      const result = await QuizApp.API.login(mobile, mpin);
      if (result.success) {
        this.currentUser = {
          ...result.user,
          loginAt: Date.now(),
        };
        this.saveSession();
      }
      return result;
    } finally {
      this._loginInProgress = false;
    }
  },

  async register(name, mobile, mpin) {
    if (this._loginInProgress) {
      return { success: false, error: 'Request already in progress' };
    }

    // Validate
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      return { success: false, error: 'Name must be 2-50 characters' };
    }
    if (!this._validateMobile(mobile)) {
      return { success: false, error: 'Enter a valid 10-digit mobile number' };
    }
    if (!this._validateMpin(mpin)) {
      return { success: false, error: 'MPIN must be exactly 4 digits' };
    }

    this._loginInProgress = true;
    try {
      const result = await QuizApp.API.register(trimmedName, mobile, mpin);
      if (result.success) {
        this.currentUser = {
          ...result.user,
          loginAt: Date.now(),
        };
        this.saveSession();
      }
      return result;
    } finally {
      this._loginInProgress = false;
    }
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem('mb_session');
  },

  isLoggedIn() {
    if (!this.currentUser) return false;
    // Session expires after 24 hours
    const SESSION_TTL = 24 * 60 * 60 * 1000;
    if (this.currentUser.loginAt && (Date.now() - this.currentUser.loginAt > SESSION_TTL)) {
      this.logout();
      return false;
    }
    return true;
  },

  isAdmin() {
    return this.currentUser && this.currentUser.role === 'admin';
  },

  getUser() {
    return this.currentUser;
  },

  getName() {
    return this.currentUser ? this.currentUser.name : 'Student';
  },

  getMobile() {
    return this.currentUser ? this.currentUser.mobile : '';
  },

  saveSession() {
    if (this.currentUser) {
      localStorage.setItem('mb_session', JSON.stringify(this.currentUser));
    }
  },

  loadSession() {
    try {
      const saved = localStorage.getItem('mb_session');
      if (saved) {
        this.currentUser = JSON.parse(saved);
        // Check expiry on load
        if (!this.isLoggedIn()) {
          this.currentUser = null;
        }
      }
    } catch (e) {
      this.currentUser = null;
      localStorage.removeItem('mb_session');
    }
  },

  // ── Validation helpers ──

  _validateMobile(mobile) {
    return /^\d{10}$/.test(mobile);
  },

  _validateMpin(mpin) {
    return /^\d{4}$/.test(mpin);
  },
};

/* ============================================
   MathBattle — API + Demo Backend (Production)
   ============================================
   Fixes: server time sync, scheduled competitions,
   duplicate submission guard, proper participant tracking,
   competition lifecycle management, admin reset
   ============================================ */

window.QuizApp = window.QuizApp || {};

// ── API Communication Layer ──

QuizApp.API = {
  _requestCache: new Map(),
  _cacheTimeout: 2000,

  async request(action, data = {}) {
    const config = QuizApp.Config;

    if (config.isDemoMode()) {
      return QuizApp.Demo.handleRequest(action, data);
    }

    try {
      const response = await fetch(config.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action, ...data }),
        signal: AbortSignal.timeout(15000), // 15s timeout
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        throw new Error('Request timed out. Check your connection.');
      }
      console.error(`API Error [${action}]:`, error);
      throw error;
    }
  },

  // ── Auth ──
  async login(mobile, mpin) {
    return this.request('login', { mobile, mpin });
  },
  async register(name, mobile, mpin) {
    return this.request('register', { name, mobile, mpin });
  },

  // ── Competition ──
  async getCompetitionStatus() {
    return this.request('getStatus');
  },
  async startCompetition(settings = {}) {
    return this.request('startCompetition', settings);
  },
  async joinCompetition(competitionId, mobile) {
    return this.request('joinCompetition', { competitionId, mobile });
  },
  async getQuestions(competitionId) {
    return this.request('getQuestions', { competitionId });
  },
  async submitAnswers(competitionId, mobile, answers, timeTaken) {
    return this.request('submitAnswers', { competitionId, mobile, answers, timeTaken });
  },
  async getParticipantCount(competitionId) {
    return this.request('getParticipantCount', { competitionId });
  },
  async getLeaderboard(competitionId) {
    return this.request('getLeaderboard', { competitionId });
  },

  // ── Admin ──
  async resetCompetition(competitionId) {
    return this.request('resetCompetition', { competitionId });
  },
  async getServerTime() {
    return this.request('getServerTime');
  },
};


/* ============================================
   Demo Backend (Full Offline Simulation)
   ============================================ */

QuizApp.Demo = {
  users: [],
  competitions: [],
  results: [],
  _serverTimeOffset: 0,  // Simulated server time offset

  init() {
    this.users = JSON.parse(localStorage.getItem('mb_users') || '[]');
    this.competitions = JSON.parse(localStorage.getItem('mb_competitions') || '[]');
    this.results = JSON.parse(localStorage.getItem('mb_results') || '[]');

    if (this.users.length === 0) {
      this.users.push({
        name: 'Admin',
        mobile: '0000000000',
        mpin: '9999',
        role: 'admin',
        registeredAt: new Date().toISOString(),
      });
      this.save();
    }
  },

  save() {
    try {
      localStorage.setItem('mb_users', JSON.stringify(this.users));
      localStorage.setItem('mb_competitions', JSON.stringify(this.competitions));
      localStorage.setItem('mb_results', JSON.stringify(this.results));
    } catch (e) {
      console.warn('localStorage save failed:', e);
    }
  },

  generateId() {
    return 'comp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  },

  getServerTime() {
    return Date.now() + this._serverTimeOffset;
  },

  // ── Question Generator (80–100 questions) ──

  generateQuestions(count = 80, difficulty = 'mixed') {
    const questions = [];
    const config = QuizApp.Config;

    for (let i = 0; i < count; i++) {
      let diff = difficulty;
      if (difficulty === 'mixed') {
        // Weighted: 40% easy, 35% medium, 25% hard
        const roll = Math.random();
        diff = roll < 0.4 ? 'easy' : roll < 0.75 ? 'medium' : 'hard';
      }

      const settings = config.DIFFICULTY[diff];
      const operation = settings.operations[Math.floor(Math.random() * settings.operations.length)];

      let a, b, answer, questionText;

      switch (operation) {
        case '+': {
          const [min, max] = settings.addRange;
          a = this._rand(min, max);
          b = this._rand(min, max);
          answer = a + b;
          questionText = `${a} + ${b} = ?`;
          break;
        }
        case '-': {
          const [min, max] = settings.subRange;
          a = this._rand(min, max);
          b = this._rand(min, Math.min(a, max)); // Ensure positive result
          if (b > a) [a, b] = [b, a];
          answer = a - b;
          questionText = `${a} - ${b} = ?`;
          break;
        }
        case '×': {
          const [min, max] = settings.mulRange;
          a = this._rand(min, max);
          b = this._rand(min, max);
          answer = a * b;
          questionText = `${a} × ${b} = ?`;
          break;
        }
        case '÷': {
          const [min, max] = settings.divRange;
          b = this._rand(Math.max(min, 1), max); // Avoid /0
          answer = this._rand(min, max);
          a = b * answer;
          questionText = `${a} ÷ ${b} = ?`;
          break;
        }
      }

      // Generate plausible distractors
      const options = new Set([answer]);
      let attempts = 0;
      while (options.size < 4 && attempts < 50) {
        attempts++;
        let wrong;
        const strategy = Math.random();
        if (strategy < 0.3) {
          wrong = answer + this._rand(1, 5);
        } else if (strategy < 0.6) {
          wrong = answer - this._rand(1, 5);
        } else if (strategy < 0.8) {
          wrong = answer + this._rand(5, 15);
        } else {
          wrong = answer - this._rand(5, 15);
        }
        if (wrong >= 0 && wrong !== answer) {
          options.add(wrong);
        }
      }
      // Fill remaining with fallback
      let fill = 1;
      while (options.size < 4) {
        options.add(answer + fill * 10);
        fill++;
      }

      // Shuffle to array
      const optionsArr = Array.from(options);
      for (let j = optionsArr.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [optionsArr[j], optionsArr[k]] = [optionsArr[k], optionsArr[j]];
      }

      questions.push({
        id: i + 1,
        question: questionText,
        options: optionsArr,
        correctIndex: optionsArr.indexOf(answer),
        difficulty: diff,
      });
    }

    return questions;
  },

  _rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // ── Request Handler ──

  async handleRequest(action, data) {
    await new Promise(r => setTimeout(r, 100 + Math.random() * 200));

    switch (action) {
      case 'login': return this.handleLogin(data);
      case 'register': return this.handleRegister(data);
      case 'getStatus': return this.handleGetStatus();
      case 'startCompetition': return this.handleStartCompetition(data);
      case 'joinCompetition': return this.handleJoinCompetition(data);
      case 'getQuestions': return this.handleGetQuestions(data);
      case 'submitAnswers': return this.handleSubmitAnswers(data);
      case 'getParticipantCount': return this.handleGetParticipantCount(data);
      case 'getLeaderboard': return this.handleGetLeaderboard(data);
      case 'resetCompetition': return this.handleResetCompetition(data);
      case 'getServerTime': return { success: true, time: this.getServerTime() };
      default: return { success: false, error: 'Unknown action' };
    }
  },

  // ── Auth Handlers ──

  handleLogin({ mobile, mpin }) {
    const user = this.users.find(u => u.mobile === mobile && u.mpin === mpin);
    if (user) {
      return { success: true, user: { name: user.name, mobile: user.mobile, role: user.role } };
    }
    return { success: false, error: 'Invalid mobile number or MPIN' };
  },

  handleRegister({ name, mobile, mpin }) {
    if (this.users.find(u => u.mobile === mobile)) {
      return { success: false, error: 'This mobile number is already registered' };
    }
    const user = {
      name, mobile, mpin,
      role: mpin === QuizApp.Config.ADMIN_MPIN ? 'admin' : 'student',
      registeredAt: new Date().toISOString(),
    };
    this.users.push(user);
    this.save();
    return { success: true, user: { name: user.name, mobile: user.mobile, role: user.role } };
  },

  // ── Competition Handlers ──

  handleGetStatus() {
    const today = new Date().toISOString().split('T')[0];
    // Find non-completed first
    const active = this.competitions.find(c =>
      c.date === today && ['waiting', 'countdown', 'active'].includes(c.status)
    );
    if (active) {
      // Check if countdown has elapsed → make it active
      if (active.status === 'countdown' && active.startTime && Date.now() >= active.startTime) {
        active.status = 'active';
        this.save();
      }
      return {
        success: true,
        competition: {
          id: active.id,
          status: active.status,
          date: active.date,
          questionCount: active.questionCount,
          timePerQuestion: active.timePerQuestion,
          startTime: active.startTime,
          scheduledTime: active.scheduledTime || null,
          participantCount: active.participants ? active.participants.length : 0,
          serverTime: Date.now(),
        },
      };
    }

    const completed = this.competitions.find(c => c.date === today && c.status === 'completed');
    if (completed) {
      return {
        success: true,
        competition: {
          id: completed.id,
          status: 'completed',
          date: completed.date,
          participantCount: completed.participants ? completed.participants.length : 0,
          serverTime: Date.now(),
        },
      };
    }

    return { success: true, competition: null, serverTime: Date.now() };
  },

  handleStartCompetition(data) {
    const today = new Date().toISOString().split('T')[0];
    const questionCount = data.questionCount || QuizApp.Config.QUESTIONS_PER_QUIZ;
    const timePerQuestion = data.timePerQuestion || QuizApp.Config.TIME_PER_QUESTION;
    const difficulty = data.difficulty || QuizApp.Config.DEFAULT_DIFFICULTY;
    const scheduledTime = data.scheduledTime || null;

    // Remove non-completed competitions for today
    this.competitions = this.competitions.filter(c =>
      !(c.date === today && c.status !== 'completed')
    );

    const questions = this.generateQuestions(questionCount, difficulty);
    const competition = {
      id: this.generateId(),
      date: today,
      status: 'waiting',
      questionCount,
      timePerQuestion,
      difficulty,
      questions,
      participants: [],
      submittedUsers: [],      // Track who already submitted
      startTime: null,
      scheduledTime,
      createdAt: new Date().toISOString(),
    };

    this.competitions.push(competition);
    this.save();
    return { success: true, competition: { id: competition.id, status: 'waiting' } };
  },

  handleJoinCompetition({ competitionId, mobile }) {
    const comp = this.competitions.find(c => c.id === competitionId);
    if (!comp) return { success: false, error: 'Competition not found' };
    if (comp.status === 'completed') return { success: false, error: 'Competition has ended' };

    // Check duplicate submission
    if (!comp.submittedUsers) comp.submittedUsers = [];
    if (comp.submittedUsers.includes(mobile)) {
      return { success: false, error: 'You have already submitted answers for this competition' };
    }

    // Add participant
    if (!comp.participants) comp.participants = [];
    if (!comp.participants.includes(mobile)) {
      comp.participants.push(mobile);
    }

    // Transition: waiting → countdown → active
    if (comp.status === 'waiting') {
      comp.status = 'countdown';
      comp.startTime = Date.now() + (QuizApp.Config.COUNTDOWN_DURATION * 1000);
      this.save();

      setTimeout(() => {
        const c = this.competitions.find(x => x.id === competitionId);
        if (c && c.status === 'countdown') {
          c.status = 'active';
          this.save();
        }
      }, QuizApp.Config.COUNTDOWN_DURATION * 1000);
    }

    this.save();
    return {
      success: true,
      status: comp.status,
      startTime: comp.startTime,
      participantCount: comp.participants.length,
      serverTime: Date.now(),
    };
  },

  handleGetQuestions({ competitionId }) {
    const comp = this.competitions.find(c => c.id === competitionId);
    if (!comp) return { success: false, error: 'Competition not found' };

    // Strip correct answers before sending to client
    const questions = comp.questions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      difficulty: q.difficulty,
    }));

    return { success: true, questions, timePerQuestion: comp.timePerQuestion };
  },

  handleSubmitAnswers({ competitionId, mobile, answers, timeTaken }) {
    const comp = this.competitions.find(c => c.id === competitionId);
    if (!comp) return { success: false, error: 'Competition not found' };

    const user = this.users.find(u => u.mobile === mobile);
    if (!user) return { success: false, error: 'User not found' };

    // Prevent duplicate submission
    if (!comp.submittedUsers) comp.submittedUsers = [];
    if (comp.submittedUsers.includes(mobile)) {
      return { success: false, error: 'Already submitted' };
    }
    comp.submittedUsers.push(mobile);

    // Score calculation
    let correct = 0, wrong = 0, skipped = 0;
    comp.questions.forEach((q, i) => {
      if (answers[i] === -1 || answers[i] === undefined) {
        skipped++;
      } else if (answers[i] === q.correctIndex) {
        correct++;
      } else {
        wrong++;
      }
    });

    const result = {
      competitionId, mobile,
      name: user.name,
      score: correct,
      wrong,
      skipped,
      totalQuestions: comp.questions.length,
      timeTaken,
      submittedAt: new Date().toISOString(),
    };

    // Remove old result for same user (shouldn't happen with guard, but safety)
    this.results = this.results.filter(r =>
      !(r.competitionId === competitionId && r.mobile === mobile)
    );
    this.results.push(result);
    this.save();

    // Calculate rank
    const rankings = this.results
      .filter(r => r.competitionId === competitionId)
      .sort((a, b) => b.score - a.score || a.timeTaken - b.timeTaken);

    const rank = rankings.findIndex(r => r.mobile === mobile) + 1;

    return {
      success: true,
      result: {
        score: correct,
        wrong,
        skipped,
        totalQuestions: comp.questions.length,
        timeTaken,
        rank,
        totalParticipants: rankings.length,
      },
    };
  },

  handleGetParticipantCount({ competitionId }) {
    const comp = this.competitions.find(c => c.id === competitionId);
    return { success: true, count: comp?.participants?.length || 0 };
  },

  handleGetLeaderboard({ competitionId }) {
    let targetId = competitionId;
    if (!targetId) {
      const latest = [...this.competitions].reverse().find(c => c.status === 'completed' || c.status === 'active');
      if (!latest) return { success: true, leaderboard: [] };
      targetId = latest.id;
    }

    const results = this.results.filter(r => r.competitionId === targetId);
    results.sort((a, b) => b.score - a.score || a.timeTaken - b.timeTaken);

    const leaderboard = results.slice(0, 10).map((r, i) => ({
      rank: i + 1,
      name: r.name,
      mobile: r.mobile,
      score: r.score,
      wrong: r.wrong || 0,
      totalQuestions: r.totalQuestions,
      timeTaken: r.timeTaken,
    }));

    return { success: true, leaderboard };
  },

  handleResetCompetition({ competitionId }) {
    if (competitionId) {
      this.competitions = this.competitions.filter(c => c.id !== competitionId);
      this.results = this.results.filter(r => r.competitionId !== competitionId);
    } else {
      // Reset today's competition
      const today = new Date().toISOString().split('T')[0];
      this.competitions = this.competitions.filter(c => c.date !== today);
      this.results = this.results.filter(r => {
        const comp = this.competitions.find(c => c.id === r.competitionId);
        return !!comp;
      });
    }
    this.save();
    return { success: true };
  },
};

// Initialize demo backend
QuizApp.Demo.init();

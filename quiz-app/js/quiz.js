/* ============================================
   MathBattle — Quiz Engine (Production v3)
   ============================================
   Upgrades: RAF-based precise timer (no drift),
   server time sync, cached DOM refs, optimized
   rendering, quiz lock after submission
   ============================================ */

window.QuizApp = window.QuizApp || {};

QuizApp.Quiz = {
  competitionId: null,
  questions: [],
  currentIndex: 0,
  answers: [],
  timeTaken: [],
  totalStartTime: 0,
  questionStartTime: 0,
  _preciseTimer: null,    // RAF-based timer handle
  timeLeft: 0,
  timePerQuestion: 20,
  score: 0,
  wrongCount: 0,
  skippedCount: 0,
  isActive: false,
  _answerLocked: false,
  _quizFinished: false,   // Lock: prevent re-finish or re-submit
  _correctAnswers: [],

  // Cached DOM references (set once, reused)
  _dom: {},

  _cacheDom() {
    const c = document.getElementById('quiz-screen');
    if (!c) return;
    this._dom = {
      container: c,
      progressInfo: c.querySelector('.quiz-progress-info'),
      progressFill: c.querySelector('.progress-bar-fill'),
      scoreValue: c.querySelector('.quiz-score-value'),
      wrongValue: c.querySelector('.quiz-wrong-value'),
      badge: c.querySelector('.question-number-badge'),
      qText: c.querySelector('.question-text'),
      optionsGrid: c.querySelector('.options-grid'),
      timerNumber: c.querySelector('.timer-number'),
      timerProgress: c.querySelector('.timer-progress'),
    };
  },

  async start(competitionId) {
    this.competitionId = competitionId;
    this.currentIndex = 0;
    this.answers = [];
    this.timeTaken = [];
    this.score = 0;
    this.wrongCount = 0;
    this.skippedCount = 0;
    this.isActive = true;
    this._answerLocked = false;
    this._quizFinished = false;
    this._correctAnswers = [];
    this.totalStartTime = Date.now();

    // Cache DOM refs
    this._cacheDom();

    // Fetch questions
    const result = await QuizApp.API.getQuestions(competitionId);
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch questions');
    }

    this.questions = result.questions;
    this.timePerQuestion = result.timePerQuestion || QuizApp.Config.TIME_PER_QUESTION;

    // Initialize tracking arrays
    this.answers = new Array(this.questions.length).fill(-1);
    this.timeTaken = new Array(this.questions.length).fill(0);

    // Cache correct answers for client-side feedback
    this._loadCorrectAnswers();

    // Show first question
    this.showQuestion(0);
  },

  _loadCorrectAnswers() {
    if (QuizApp.Config.isDemoMode()) {
      const comp = QuizApp.Demo.competitions.find(c => c.id === this.competitionId);
      if (comp && comp.questions) {
        this._correctAnswers = comp.questions.map(q => q.correctIndex);
      }
    }
  },

  getCorrectIndex(questionIndex) {
    if (this._correctAnswers.length > questionIndex) {
      return this._correctAnswers[questionIndex];
    }
    return -1;
  },

  showQuestion(index) {
    if (index >= this.questions.length || this._quizFinished) {
      this.finish();
      return;
    }

    this.currentIndex = index;
    this.questionStartTime = Date.now();
    this._answerLocked = false;
    const q = this.questions[index];
    const d = this._dom;

    // Batch DOM updates for performance
    QuizApp.UI.batchDOM(() => {
      if (d.progressInfo) {
        d.progressInfo.textContent = `${index + 1} / ${this.questions.length}`;
      }
      if (d.progressFill) {
        d.progressFill.style.width = `${(index / this.questions.length) * 100}%`;
      }
      if (d.scoreValue) d.scoreValue.textContent = this.score;
      if (d.wrongValue) d.wrongValue.textContent = this.wrongCount;
      if (d.badge) d.badge.textContent = `Question ${index + 1}`;

      if (d.qText) {
        d.qText.textContent = q.question;
        // Trigger re-animation
        d.qText.style.animation = 'none';
        d.qText.offsetHeight; // reflow
        d.qText.style.animation = 'fadeInUp 0.3s ease-out';
      }

      // Build options via DocumentFragment
      if (d.optionsGrid) {
        const fragment = document.createDocumentFragment();
        d.optionsGrid.innerHTML = '';

        q.options.forEach((option, i) => {
          const btn = document.createElement('button');
          btn.className = 'option-btn';
          btn.id = `option-${i}`;
          btn.textContent = option;
          btn.addEventListener('click', () => this.selectAnswer(i), { once: true });
          fragment.appendChild(btn);
        });

        d.optionsGrid.appendChild(fragment);
      }
    });

    // Start precise timer
    this.startTimer();
  },

  selectAnswer(optionIndex) {
    if (!this.isActive || this._answerLocked || this._quizFinished) return;
    this._answerLocked = true;

    this.stopTimer();

    const timeTaken = Date.now() - this.questionStartTime;
    this.answers[this.currentIndex] = optionIndex;
    this.timeTaken[this.currentIndex] = timeTaken;

    const correctIdx = this.getCorrectIndex(this.currentIndex);
    const isCorrect = correctIdx >= 0 && optionIndex === correctIdx;

    // Visual feedback
    const options = document.querySelectorAll('.option-btn');
    options.forEach((btn, i) => {
      btn.classList.add('disabled');
      if (i === optionIndex) btn.classList.add(isCorrect ? 'correct' : 'wrong');
      if (i === correctIdx && !isCorrect) btn.classList.add('correct');
    });

    if (isCorrect) {
      this.score++;
      QuizApp.Sounds.correct();
      QuizApp.Effects.flash('green');
    } else {
      this.wrongCount++;
      QuizApp.Sounds.wrong();
      QuizApp.Effects.flash('red');
      QuizApp.Effects.shake(document.querySelector('.question-card'));
    }

    // Update live counters
    if (this._dom.scoreValue) this._dom.scoreValue.textContent = this.score;
    if (this._dom.wrongValue) this._dom.wrongValue.textContent = this.wrongCount;

    // Advance
    const delay = QuizApp.Config.ANSWER_FEEDBACK_DELAY;
    setTimeout(() => this._nextOrFinish(), delay);
  },

  _nextOrFinish() {
    if (this.currentIndex + 1 < this.questions.length) {
      this.showQuestion(this.currentIndex + 1);
    } else {
      this.finish();
    }
  },

  // ── Precise Timer (RAF-based, no drift) ──

  startTimer() {
    this.stopTimer();
    this.timeLeft = this.timePerQuestion;
    this._updateTimerUI(this.timeLeft, 0);

    const circumference = 2 * Math.PI * 35;

    this._preciseTimer = QuizApp.UI.createPreciseTimer(
      this.timePerQuestion,
      // onTick — called every frame
      (remaining, progress) => {
        if (this.timeLeft !== remaining) {
          this.timeLeft = remaining;

          // Sound effects on whole seconds
          if (remaining <= 3 && remaining > 0) {
            QuizApp.Sounds.tickWarning();
          } else if (remaining <= 7 && remaining > 3) {
            QuizApp.Sounds.tick();
          }
        }
        this._updateTimerUI(remaining, progress);
      },
      // onComplete
      () => { this.timeUp(); }
    );
  },

  stopTimer() {
    if (this._preciseTimer) {
      this._preciseTimer.stop();
      this._preciseTimer = null;
    }
  },

  _updateTimerUI(remaining, progress) {
    const d = this._dom;
    if (d.timerNumber) {
      d.timerNumber.textContent = remaining;
      d.timerNumber.classList.toggle('warning', remaining <= 5 && remaining > 3);
      d.timerNumber.classList.toggle('danger', remaining <= 3);
    }
    if (d.timerProgress) {
      const circumference = 2 * Math.PI * 35;
      d.timerProgress.style.strokeDashoffset = circumference * progress;
      d.timerProgress.classList.toggle('warning', remaining <= 5 && remaining > 3);
      d.timerProgress.classList.toggle('danger', remaining <= 3);
    }
  },

  timeUp() {
    if (this._answerLocked) return;
    this._answerLocked = true;
    this.stopTimer();

    QuizApp.Sounds.timeUp();

    this.answers[this.currentIndex] = -1;
    this.timeTaken[this.currentIndex] = this.timePerQuestion * 1000;
    this.skippedCount++;

    // Reveal correct answer
    const correctIdx = this.getCorrectIndex(this.currentIndex);
    const options = document.querySelectorAll('.option-btn');
    options.forEach((btn, i) => {
      btn.classList.add('disabled');
      if (i === correctIdx) btn.classList.add('correct');
    });

    setTimeout(() => this._nextOrFinish(), 400);
  },

  async finish() {
    if (this._quizFinished) return; // Prevent double-finish
    this._quizFinished = true;
    this.isActive = false;
    this.stopTimer();

    const totalTimeTaken = Date.now() - this.totalStartTime;
    const mobile = QuizApp.Auth.getMobile();

    QuizApp.Sounds.quizComplete();

    try {
      const result = await QuizApp.API.submitAnswers(
        this.competitionId, mobile, this.answers, totalTimeTaken
      );

      if (result.success) {
        QuizApp.App.showResult({
          ...result.result,
          wrongCount: this.wrongCount,
          skippedCount: this.skippedCount,
        });
      } else {
        this._showLocalResult(totalTimeTaken);
      }
    } catch (error) {
      console.error('Submit error:', error);
      this._showLocalResult(totalTimeTaken);
    }
  },

  _showLocalResult(totalTimeTaken) {
    QuizApp.App.showResult({
      score: this.score,
      totalQuestions: this.questions.length,
      timeTaken: totalTimeTaken,
      rank: '?',
      totalParticipants: 0,
      wrongCount: this.wrongCount,
      skippedCount: this.skippedCount,
    });
  },

  reset() {
    this.stopTimer();
    this.questions = [];
    this.currentIndex = 0;
    this.answers = [];
    this.timeTaken = [];
    this.score = 0;
    this.wrongCount = 0;
    this.skippedCount = 0;
    this.isActive = false;
    this._answerLocked = false;
    this._quizFinished = false;
    this._correctAnswers = [];
    this.competitionId = null;
    this._dom = {};
  },
};

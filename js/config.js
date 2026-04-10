/* ============================================
   MathBattle — Configuration (Production)
   ============================================ */

window.QuizApp = window.QuizApp || {};

QuizApp.Config = {
  // ⚠️ Replace with your deployed Google Apps Script Web App URL
  API_URL: 'https://script.google.com/macros/s/AKfycbyY__kroQD2w8KB3bEYkiVQkBtmFPheGH1bfM3PsUODsujy24Gyv1eVdwN4YvJMFMxTvA/exec',

  // App Settings
  APP_NAME: 'MathBattle',
  APP_TAGLINE: 'The Ultimate Math Competition!',

  // Quiz Settings
  QUESTIONS_PER_QUIZ: 80,
  TIME_PER_QUESTION: 20,           // seconds (15–30 range)
  COUNTDOWN_DURATION: 10,          // seconds before quiz starts
  DEFAULT_DIFFICULTY: 'mixed',     // easy, medium, hard, mixed
  ANSWER_FEEDBACK_DELAY: 600,      // ms to show correct/wrong before next question
  
  // Polling
  POLL_INTERVAL: 2000,             // ms — real-time competition status
  PARTICIPANT_POLL: 3000,          // ms — participant count live updates

  // Demo Mode
  DEMO_MODE: false,

  // Competition Schedule
  DEFAULT_COMPETITION_TIME: '19:00',  // 7 PM
  
  // Admin credentials
  ADMIN_MPIN: '9999',
  ADMIN_PASSWORD: 'admin123',       // For separate admin panel

  // Difficulty ranges for question generation
  DIFFICULTY: {
    easy: {
      label: 'Easy (Class 1-3)',
      addRange: [1, 20],
      subRange: [1, 20],
      mulRange: [1, 10],
      divRange: [1, 10],
      operations: ['+', '-'],
    },
    medium: {
      label: 'Medium (Class 4-5)',
      addRange: [10, 100],
      subRange: [10, 100],
      mulRange: [2, 15],
      divRange: [2, 12],
      operations: ['+', '-', '×'],
    },
    hard: {
      label: 'Hard (Class 6-8)',
      addRange: [50, 500],
      subRange: [50, 500],
      mulRange: [5, 25],
      divRange: [3, 20],
      operations: ['+', '-', '×', '÷'],
    },
  },

  // Avatars for leaderboard
  AVATARS: ['🦁', '🐯', '🐻', '🐼', '🐨', '🐸', '🐙', '🦊', '🐰', '🐶',
             '🦄', '🐲', '🦋', '🐝', '🦜', '🐬', '🦈', '🐢', '🦉', '🐊'],

  getAvatar(mobile) {
    let hash = 0;
    for (let i = 0; i < mobile.length; i++) {
      hash = ((hash << 5) - hash) + mobile.charCodeAt(i);
      hash |= 0;
    }
    return this.AVATARS[Math.abs(hash) % this.AVATARS.length];
  },

  isDemoMode() {
    return !this.API_URL || this.DEMO_MODE;
  },
};

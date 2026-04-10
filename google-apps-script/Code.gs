/**
 * ============================================
 * MathBattle — Google Apps Script Backend (v2)
 * ============================================
 * 
 * FIXES & ADDITIONS:
 * - Server time sync endpoint
 * - Duplicate submission prevention
 * - Competition reset
 * - Wrong/skipped tracking
 * - Proper participant count
 * - 80-100 question default
 * 
 * SETUP:
 * 1. Create Google Sheet with tabs: "Users", "Competitions", "Results"
 * 2. Paste this code in Extensions → Apps Script
 * 3. Run setup() once
 * 4. Deploy as Web App (Execute as: Me, Anyone can access)
 * 5. Copy Web App URL to config.js API_URL
 */

const SPREADSHEET_ID = ''; // Your Google Sheet ID
const ADMIN_MPIN = '9999';

const SHEETS = {
  USERS: 'Users',
  COMPETITIONS: 'Competitions',
  RESULTS: 'Results',
};

// ── Entry Points ──

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    return jsonResponse(processRequest(data));
  } catch (error) {
    return jsonResponse({ success: false, error: error.message });
  }
}

function doGet(e) {
  const action = e.parameter.action || 'getStatus';
  return jsonResponse(processRequest({ action, ...e.parameter }));
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Router ──

function processRequest(data) {
  switch (data.action) {
    case 'login':              return handleLogin(data);
    case 'register':           return handleRegister(data);
    case 'getStatus':          return handleGetStatus();
    case 'startCompetition':   return handleStartCompetition(data);
    case 'joinCompetition':    return handleJoinCompetition(data);
    case 'getQuestions':       return handleGetQuestions(data);
    case 'submitAnswers':      return handleSubmitAnswers(data);
    case 'getParticipantCount':return handleGetParticipantCount(data);
    case 'getLeaderboard':     return handleGetLeaderboard(data);
    case 'resetCompetition':   return handleResetCompetition(data);
    case 'getServerTime':      return { success: true, time: new Date().getTime() };
    default:                   return { success: false, error: 'Unknown action: ' + data.action };
  }
}

// ── Helpers ──

function getSheet(name) {
  const ss = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    switch (name) {
      case SHEETS.USERS:
        sheet.appendRow(['Name', 'Mobile', 'MPIN', 'Role', 'RegisteredAt']);
        break;
      case SHEETS.COMPETITIONS:
        sheet.appendRow(['ID', 'Date', 'Status', 'QuestionCount', 'TimePerQuestion',
                         'Difficulty', 'QuestionsJSON', 'ParticipantsJSON', 'SubmittedUsersJSON',
                         'StartTime', 'CreatedAt']);
        break;
      case SHEETS.RESULTS:
        sheet.appendRow(['CompetitionID', 'Mobile', 'Name', 'Score', 'Wrong', 'Skipped',
                         'TotalQuestions', 'TimeTaken', 'AnswersJSON', 'SubmittedAt']);
        break;
    }
  }
  return sheet;
}

function findUser(mobile) {
  const sheet = getSheet(SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(mobile)) {
      return {
        row: i + 1,
        name: data[i][0],
        mobile: String(data[i][1]),
        mpin: String(data[i][2]),
        role: data[i][3] || 'student',
      };
    }
  }
  return null;
}

function getTodaysCompetition() {
  const sheet = getSheet(SHEETS.COMPETITIONS);
  const data = sheet.getDataRange().getValues();
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][1] === today) {
      return {
        row: i + 1,
        id: data[i][0],
        date: data[i][1],
        status: data[i][2],
        questionCount: data[i][3],
        timePerQuestion: data[i][4],
        difficulty: data[i][5],
        questions: JSON.parse(data[i][6] || '[]'),
        participants: JSON.parse(data[i][7] || '[]'),
        submittedUsers: JSON.parse(data[i][8] || '[]'),
        startTime: data[i][9],
        createdAt: data[i][10],
      };
    }
  }
  return null;
}

function generateId() {
  return 'comp_' + new Date().getTime() + '_' + Math.random().toString(36).substr(2, 6);
}

// ── Question Generator ──

function generateQuestions(count, difficulty) {
  var questions = [];

  var DIFFICULTY = {
    easy: { addRange: [1, 20], subRange: [1, 20], mulRange: [1, 10], divRange: [1, 10], operations: ['+', '-'] },
    medium: { addRange: [10, 100], subRange: [10, 100], mulRange: [2, 15], divRange: [2, 12], operations: ['+', '-', '×'] },
    hard: { addRange: [50, 500], subRange: [50, 500], mulRange: [5, 25], divRange: [3, 20], operations: ['+', '-', '×', '÷'] },
  };

  for (var i = 0; i < count; i++) {
    var diff = difficulty;
    if (difficulty === 'mixed') {
      var roll = Math.random();
      diff = roll < 0.4 ? 'easy' : roll < 0.75 ? 'medium' : 'hard';
    }

    var settings = DIFFICULTY[diff];
    var operation = settings.operations[Math.floor(Math.random() * settings.operations.length)];
    var a, b, answer, questionText;

    switch (operation) {
      case '+': {
        var min = settings.addRange[0], max = settings.addRange[1];
        a = rand(min, max); b = rand(min, max);
        answer = a + b;
        questionText = a + ' + ' + b + ' = ?';
        break;
      }
      case '-': {
        var min = settings.subRange[0], max = settings.subRange[1];
        a = rand(min, max); b = rand(min, Math.min(a, max));
        if (b > a) { var t = a; a = b; b = t; }
        answer = a - b;
        questionText = a + ' - ' + b + ' = ?';
        break;
      }
      case '×': {
        var min = settings.mulRange[0], max = settings.mulRange[1];
        a = rand(min, max); b = rand(min, max);
        answer = a * b;
        questionText = a + ' × ' + b + ' = ?';
        break;
      }
      case '÷': {
        var min = settings.divRange[0], max = settings.divRange[1];
        b = rand(Math.max(min, 1), max);
        answer = rand(min, max);
        a = b * answer;
        questionText = a + ' ÷ ' + b + ' = ?';
        break;
      }
    }

    // Generate 4 options
    var options = [answer];
    var attempts = 0;
    while (options.length < 4 && attempts < 50) {
      attempts++;
      var wrong;
      var strategy = Math.random();
      if (strategy < 0.3) wrong = answer + rand(1, 5);
      else if (strategy < 0.6) wrong = answer - rand(1, 5);
      else if (strategy < 0.8) wrong = answer + rand(5, 15);
      else wrong = answer - rand(5, 15);
      if (wrong >= 0 && options.indexOf(wrong) === -1) options.push(wrong);
    }
    var fill = 1;
    while (options.length < 4) {
      if (options.indexOf(answer + fill * 10) === -1) options.push(answer + fill * 10);
      fill++;
    }

    // Shuffle
    for (var j = options.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = options[j]; options[j] = options[k]; options[k] = tmp;
    }

    questions.push({
      id: i + 1,
      question: questionText,
      options: options,
      correctIndex: options.indexOf(answer),
      difficulty: diff,
    });
  }
  return questions;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── API Handlers ──

function handleLogin(data) {
  var user = findUser(data.mobile);
  if (user && String(user.mpin) === String(data.mpin)) {
    return { success: true, user: { name: user.name, mobile: user.mobile, role: user.role } };
  }
  return { success: false, error: 'Invalid mobile number or MPIN' };
}

function handleRegister(data) {
  if (findUser(data.mobile)) {
    return { success: false, error: 'This mobile number is already registered' };
  }
  var role = String(data.mpin) === ADMIN_MPIN ? 'admin' : 'student';
  var sheet = getSheet(SHEETS.USERS);
  sheet.appendRow([data.name, data.mobile, data.mpin, role, new Date().toISOString()]);
  return { success: true, user: { name: data.name, mobile: data.mobile, role: role } };
}

function handleGetStatus() {
  var comp = getTodaysCompetition();
  if (comp) {
    return {
      success: true,
      competition: {
        id: comp.id,
        status: comp.status,
        date: comp.date,
        questionCount: comp.questionCount,
        timePerQuestion: comp.timePerQuestion,
        startTime: comp.startTime,
        participantCount: comp.participants.length,
        submittedCount: comp.submittedUsers.length,
      },
      serverTime: new Date().getTime(),
    };
  }
  return { success: true, competition: null, serverTime: new Date().getTime() };
}

function handleStartCompetition(data) {
  var questionCount = data.questionCount || 80;
  var timePerQuestion = data.timePerQuestion || 20;
  var difficulty = data.difficulty || 'mixed';
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  // Remove existing non-completed competition
  var existing = getTodaysCompetition();
  if (existing && existing.status !== 'completed') {
    var sheet = getSheet(SHEETS.COMPETITIONS);
    sheet.deleteRow(existing.row);
  }

  var id = generateId();
  var questions = generateQuestions(questionCount, difficulty);
  var sheet = getSheet(SHEETS.COMPETITIONS);
  sheet.appendRow([
    id, today, 'waiting', questionCount, timePerQuestion,
    difficulty, JSON.stringify(questions), '[]', '[]', '', new Date().toISOString()
  ]);

  return { success: true, competition: { id: id, status: 'waiting' } };
}

function handleJoinCompetition(data) {
  var comp = getTodaysCompetition();
  if (!comp || comp.id !== data.competitionId) {
    return { success: false, error: 'Competition not found' };
  }
  if (comp.status === 'completed') {
    return { success: false, error: 'Competition has ended' };
  }

  // Check duplicate submission
  if (comp.submittedUsers.indexOf(data.mobile) !== -1) {
    return { success: false, error: 'You have already submitted answers for this competition' };
  }

  var sheet = getSheet(SHEETS.COMPETITIONS);

  // Add participant
  if (comp.participants.indexOf(data.mobile) === -1) {
    comp.participants.push(data.mobile);
    sheet.getRange(comp.row, 8).setValue(JSON.stringify(comp.participants));
  }

  if (comp.status === 'waiting') {
    var startTime = new Date().getTime() + (10 * 1000);
    sheet.getRange(comp.row, 3).setValue('active');
    sheet.getRange(comp.row, 10).setValue(startTime);

    return {
      success: true, status: 'countdown',
      startTime: startTime,
      participantCount: comp.participants.length,
      serverTime: new Date().getTime(),
    };
  }

  return {
    success: true, status: comp.status,
    startTime: comp.startTime,
    participantCount: comp.participants.length,
    serverTime: new Date().getTime(),
  };
}

function handleGetQuestions(data) {
  var comp = getTodaysCompetition();
  if (!comp || comp.id !== data.competitionId) {
    return { success: false, error: 'Competition not found' };
  }

  var questions = comp.questions.map(function(q) {
    return { id: q.id, question: q.question, options: q.options, difficulty: q.difficulty };
  });

  return { success: true, questions: questions, timePerQuestion: comp.timePerQuestion };
}

function handleSubmitAnswers(data) {
  var comp = getTodaysCompetition();
  if (!comp || comp.id !== data.competitionId) {
    return { success: false, error: 'Competition not found' };
  }

  var user = findUser(data.mobile);
  if (!user) return { success: false, error: 'User not found' };

  // Duplicate check
  if (comp.submittedUsers.indexOf(data.mobile) !== -1) {
    return { success: false, error: 'Already submitted' };
  }

  // Score
  var correct = 0, wrong = 0, skipped = 0;
  comp.questions.forEach(function(q, i) {
    if (data.answers[i] === -1 || data.answers[i] === undefined) skipped++;
    else if (data.answers[i] === q.correctIndex) correct++;
    else wrong++;
  });

  // Save result
  var resultSheet = getSheet(SHEETS.RESULTS);
  resultSheet.appendRow([
    data.competitionId, data.mobile, user.name, correct, wrong, skipped,
    comp.questions.length, data.timeTaken, JSON.stringify(data.answers), new Date().toISOString()
  ]);

  // Mark as submitted
  comp.submittedUsers.push(data.mobile);
  var compSheet = getSheet(SHEETS.COMPETITIONS);
  compSheet.getRange(comp.row, 9).setValue(JSON.stringify(comp.submittedUsers));

  // Calculate rank
  var allResults = getCompetitionResults(data.competitionId);
  allResults.sort(function(a, b) { return b.score - a.score || a.timeTaken - b.timeTaken; });
  var rank = 1;
  for (var i = 0; i < allResults.length; i++) {
    if (allResults[i].mobile === data.mobile) { rank = i + 1; break; }
  }

  return {
    success: true,
    result: {
      score: correct, wrong: wrong, skipped: skipped,
      totalQuestions: comp.questions.length,
      timeTaken: data.timeTaken,
      rank: rank, totalParticipants: allResults.length,
    },
  };
}

function handleGetParticipantCount(data) {
  var comp = getTodaysCompetition();
  return { success: true, count: comp ? comp.participants.length : 0 };
}

function handleGetLeaderboard(data) {
  var competitionId = data.competitionId;
  if (!competitionId) {
    var comp = getTodaysCompetition();
    if (!comp) return { success: true, leaderboard: [] };
    competitionId = comp.id;
  }

  var results = getCompetitionResults(competitionId);
  results.sort(function(a, b) { return b.score - a.score || a.timeTaken - b.timeTaken; });

  var leaderboard = results.slice(0, 10).map(function(r, i) {
    return {
      rank: i + 1, name: r.name, mobile: r.mobile,
      score: r.score, wrong: r.wrong || 0,
      totalQuestions: r.totalQuestions, timeTaken: r.timeTaken,
    };
  });

  return { success: true, leaderboard: leaderboard };
}

function handleResetCompetition(data) {
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var compSheet = getSheet(SHEETS.COMPETITIONS);
  var compData = compSheet.getDataRange().getValues();
  var competitionIds = [];

  // Find and delete today's competitions
  for (var i = compData.length - 1; i >= 1; i--) {
    if (compData[i][1] === today) {
      competitionIds.push(compData[i][0]);
      compSheet.deleteRow(i + 1);
    }
  }

  // Delete results for those competitions
  if (competitionIds.length > 0) {
    var resSheet = getSheet(SHEETS.RESULTS);
    var resData = resSheet.getDataRange().getValues();
    for (var i = resData.length - 1; i >= 1; i--) {
      if (competitionIds.indexOf(resData[i][0]) !== -1) {
        resSheet.deleteRow(i + 1);
      }
    }
  }

  return { success: true };
}

function getCompetitionResults(competitionId) {
  var sheet = getSheet(SHEETS.RESULTS);
  var data = sheet.getDataRange().getValues();
  var results = [];
  var seen = {};

  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === competitionId && !seen[data[i][1]]) {
      seen[data[i][1]] = true;
      results.push({
        mobile: String(data[i][1]),
        name: data[i][2],
        score: Number(data[i][3]),
        wrong: Number(data[i][4]) || 0,
        totalQuestions: Number(data[i][6]),
        timeTaken: Number(data[i][7]),
      });
    }
  }
  return results;
}

// ── Setup (run once) ──

function setup() {
  getSheet(SHEETS.USERS);
  getSheet(SHEETS.COMPETITIONS);
  getSheet(SHEETS.RESULTS);

  if (!findUser('0000000000')) {
    var sheet = getSheet(SHEETS.USERS);
    sheet.appendRow(['Admin', '0000000000', '9999', 'admin', new Date().toISOString()]);
  }
  Logger.log('Setup complete!');
}

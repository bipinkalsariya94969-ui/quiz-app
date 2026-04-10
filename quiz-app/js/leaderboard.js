/* ============================================
   MathBattle — Leaderboard Module
   ============================================ */

window.QuizApp = window.QuizApp || {};

QuizApp.Leaderboard = {
  data: [],
  competitionId: null,

  async load(competitionId) {
    this.competitionId = competitionId;
    try {
      const result = await QuizApp.API.getLeaderboard(competitionId);
      if (result.success) {
        this.data = result.leaderboard;
      }
    } catch (error) {
      console.error('Leaderboard load error:', error);
      this.data = [];
    }
    return this.data;
  },

  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (this.data.length === 0) {
      container.innerHTML = `
        <div class="text-center mt-xl" style="padding: 40px 0;">
          <div style="font-size: 3rem; margin-bottom: 16px;">📊</div>
          <p style="color: var(--text-secondary); font-weight: 600;">No results yet</p>
          <p style="color: var(--text-muted); font-size: 0.85rem;">Results will appear after the competition</p>
        </div>
      `;
      return;
    }

    const top3 = this.data.slice(0, 3);
    const rest = this.data.slice(3);
    const currentMobile = QuizApp.Auth.getMobile();

    let html = '';

    // Podium (only if at least 2 entries)
    if (top3.length >= 2) {
      html += this.renderPodium(top3);
    }

    // Full list
    html += '<div class="leaderboard-list">';
    this.data.forEach((entry, i) => {
      const isCurrentUser = entry.mobile === currentMobile;
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
      const avatar = QuizApp.Config.getAvatar(entry.mobile);
      const timeStr = this.formatTime(entry.timeTaken);

      html += `
        <div class="leaderboard-entry ${isCurrentUser ? 'current-user' : ''}" style="--i: ${i}">
          <div class="entry-rank">${medal || entry.rank}</div>
          <div class="entry-avatar">${avatar}</div>
          <div class="entry-info">
            <div class="entry-name">${this.escapeHtml(entry.name)}${isCurrentUser ? ' (You)' : ''}</div>
            <div class="entry-details">${entry.score}/${entry.totalQuestions} correct • ${timeStr}</div>
          </div>
          <div class="entry-score">
            <div class="score-val">${entry.score}</div>
            <div class="score-time">${timeStr}</div>
          </div>
        </div>
      `;
    });
    html += '</div>';

    container.innerHTML = html;
  },

  renderPodium(top3) {
    // Reorder: 2nd, 1st, 3rd for visual podium
    const ordered = [];
    if (top3[1]) ordered.push({ ...top3[1], place: 'second', medal: '🥈' });
    if (top3[0]) ordered.push({ ...top3[0], place: 'first', medal: '🥇' });
    if (top3[2]) ordered.push({ ...top3[2], place: 'third', medal: '🥉' });

    let html = '<div class="podium">';
    ordered.forEach(entry => {
      const avatar = QuizApp.Config.getAvatar(entry.mobile);
      const timeStr = this.formatTime(entry.timeTaken);

      html += `
        <div class="podium-place ${entry.place}">
          <div class="podium-avatar">${avatar}</div>
          <div class="podium-name">${this.escapeHtml(entry.name)}</div>
          <div class="podium-score">${entry.score} pts • ${timeStr}</div>
          <div class="podium-bar">${entry.medal}</div>
        </div>
      `;
    });
    html += '</div>';

    return html;
  },

  formatTime(ms) {
    if (!ms || ms <= 0) return '0s';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};

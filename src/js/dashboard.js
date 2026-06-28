// ════════════════════════════════════════════════════════════
//  LEARNER DASHBOARD
//  Reads entirely from localStorage (ss_load). No server needed.
// ════════════════════════════════════════════════════════════

const DASH_CHAPTERS = [
  { icon:'🪡', hi:'औज़ार और सामग्री', en:'Tools & Materials' },
  { icon:'🎨', hi:'कपड़े और रेशे',   en:'Fabrics & Fibres'  },
  { icon:'🕸️', hi:'बुनावट और ग्रेन', en:'Weave & Grain'     },
  { icon:'⚙️', hi:'सिलाई मशीनें',   en:'Sewing Machines'   },
  { icon:'🧷', hi:'सीम और फिनिश',   en:'Seams & Finishes'  },
  { icon:'📐', hi:'नाप और फिटिंग', en:'Measurements'       },
];

// Question difficulty by chapter+index (approx from HTML badges)
const SKILL_MAP = {
  beginner:     [[0,1,2],[0,1,2],[],[0,1,2],[0,1,2],[1,2]],
  intermediate: [[3,4,5],[3,4,5],[1,2,3],[3,4,5],[3,4,5],[3,4]],
  advanced:     [[6,7],[6,7],[4,5,6,7],[6,7],[6,7],[5,6]],
  expert:       [[8,9],[8,9],[8,9],[8,9],[8,9],[7,8,9]],
};

function calcStreak(dates) {
  if (!dates || !dates.length) return 0;
  const sorted = [...new Set(dates)].sort().reverse();
  const today  = new Date().toISOString().slice(0, 10);
  if (sorted[0] !== today) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const cur  = new Date(sorted[i]);
    const diff = (prev - cur) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

function fmtTime(ms) {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return mins + ' min';
  const h = Math.floor(mins / 60), m = mins % 60;
  return h + 'h ' + (m ? m + 'm' : '');
}

function renderDashboard() {
  const el = document.getElementById('dashContent');
  if (!el) return;

  const s       = ss_load();
  const answers = s.answers    || {};
  const chapArr = s.chapDone   || [false,false,false,false,false,false];
  const totalMs = s.totalTimeMs || 0;
  const streak  = calcStreak(s.visitDates || []);
  const firstV  = s.firstVisit ? new Date(s.firstVisit).toLocaleDateString('hi-IN') : '—';

  // Per-chapter stats
  const chapStats = DASH_CHAPTERS.map((ch, i) => {
    let correct = 0, wrong = 0;
    for (let q = 0; q < 10; q++) {
      const v = answers[i + '-' + q];
      if (v === 'correct') correct++;
      else if (v === 'wrong') wrong++;
    }
    if (i === 2 && s.fillAnswered?.[2]) correct++;
    if (i === 5 && s.matchDone) correct++;
    return { ...ch, correct, wrong, answered: correct + wrong, done: chapArr[i] };
  });

  const totalCorrect = chapStats.reduce((n, c) => n + c.correct, 0);
  const chapsDone    = chapArr.filter(Boolean).length;

  // Skill distribution — count correct answers per difficulty tier
  const skillCorrect = { beginner:0, intermediate:0, advanced:0, expert:0 };
  const skillTotal   = { beginner:0, intermediate:0, advanced:0, expert:0 };
  Object.entries(SKILL_MAP).forEach(([level, chQs]) => {
    chQs.forEach((qs, ch) => {
      qs.forEach(q => {
        skillTotal[level]++;
        if (answers[ch + '-' + q] === 'correct') skillCorrect[level]++;
      });
    });
  });

  // Motivational tip
  const tips = getTips(chapsDone, totalCorrect, streak);

  // ── BUILD HTML ────────────────────────────────────────────
  el.innerHTML = `
    <div class="dash-header">
      <div>
        <div class="dash-title">
          <span class="hi-only">📊 मेरी प्रगति</span>
          <span class="en-only">📊 My Progress</span>
        </div>
        <div class="dash-sub">
          <span class="hi-only">पहली बार: ${firstV}</span>
          <span class="en-only">First visit: ${firstV}</span>
        </div>
      </div>
      <button class="dash-reset-btn" onclick="confirmReset()">
        <span class="hi-only">🔄 शुरू से</span>
        <span class="en-only">🔄 Reset All</span>
      </button>
    </div>

    <!-- Big stats -->
    <div class="dash-stats">
      <div class="dash-stat">
        <div class="dash-stat-icon">🏆</div>
        <div class="dash-stat-value">${chapsDone}<span style="font-size:.6em;color:var(--color-text-muted)">/6</span></div>
        <div class="dash-stat-label"><span class="hi-only">अध्याय पूरे</span><span class="en-only">Chapters done</span></div>
      </div>
      <div class="dash-stat correct">
        <div class="dash-stat-icon">✅</div>
        <div class="dash-stat-value">${totalCorrect}</div>
        <div class="dash-stat-label"><span class="hi-only">सही जवाब</span><span class="en-only">Correct answers</span></div>
      </div>
      <div class="dash-stat streak">
        <div class="dash-stat-icon">🔥</div>
        <div class="dash-stat-value">${streak}</div>
        <div class="dash-stat-label"><span class="hi-only">दिन लगातार</span><span class="en-only">Day streak</span></div>
      </div>
      <div class="dash-stat time">
        <div class="dash-stat-icon">⏱️</div>
        <div class="dash-stat-value" style="font-size:var(--text-xl)">${fmtTime(totalMs)}</div>
        <div class="dash-stat-label"><span class="hi-only">कुल समय</span><span class="en-only">Total time</span></div>
      </div>
    </div>

    <!-- Chapter breakdown -->
    <div class="dash-section-title">
      <span class="hi-only">अध्याय-वार प्रगति</span>
      <span class="en-only">Chapter Breakdown</span>
    </div>
    <div class="dash-chapters">
      ${chapStats.map((ch, i) => {
        const pct = Math.round((ch.correct / 10) * 100);
        const badgeClass = ch.done ? 'done-badge' : ch.answered > 0 ? 'progress-badge' : 'locked-badge';
        const badgeHi = ch.done ? 'पूरा ✓' : ch.answered > 0 ? 'जारी है' : 'शुरू करें';
        const badgeEn = ch.done ? 'Done ✓'  : ch.answered > 0 ? 'In progress' : 'Not started';
        return `
        <div class="dash-ch ${ch.done ? 'done' : ''}">
          <div class="dash-ch-icon">${ch.icon}</div>
          <div class="dash-ch-info">
            <div class="dash-ch-name">
              <span class="hi-only">${ch.hi}</span>
              <span class="en-only">${ch.en}</span>
            </div>
            <div class="dash-ch-sub">
              <span class="hi-only">${ch.correct} सही · ${ch.wrong} गलत</span>
              <span class="en-only">${ch.correct} correct · ${ch.wrong} wrong</span>
            </div>
          </div>
          <div class="dash-ch-bar-wrap">
            <div class="dash-ch-bar-track">
              <div class="dash-ch-bar-fill" style="width:${pct}%"></div>
            </div>
            <div class="dash-ch-bar-label">
              <span>${ch.correct}/10</span>
              <span>${pct}%</span>
            </div>
          </div>
          <span class="dash-ch-badge ${badgeClass}">
            <span class="hi-only">${badgeHi}</span>
            <span class="en-only">${badgeEn}</span>
          </span>
        </div>`;
      }).join('')}
    </div>

    <!-- Skill distribution -->
    <div class="dash-section-title">
      <span class="hi-only">कौशल स्तर वितरण</span>
      <span class="en-only">Skill Level Distribution</span>
    </div>
    <div class="dash-skills">
      ${[
        ['beginner',     'skill-beg', 'fill-beg', '🌱 शुरुआती',    '🌱 Beginner'],
        ['intermediate', 'skill-int', 'fill-int', '🧵 मध्यम',      '🧵 Intermediate'],
        ['advanced',     'skill-adv', 'fill-adv', '🌟 उन्नत',      '🌟 Advanced'],
        ['expert',       'skill-exp', 'fill-exp', '🏆 विशेषज्ञ',   '🏆 Expert'],
      ].map(([k, nc, fc, labelHi, labelEn]) => {
        const tot = skillTotal[k], cor = skillCorrect[k];
        const pct = tot ? Math.round((cor / tot) * 100) : 0;
        return `
        <div class="dash-skill-row">
          <div class="dash-skill-name ${nc}">
            <span class="hi-only">${labelHi}</span>
            <span class="en-only">${labelEn}</span>
          </div>
          <div class="dash-skill-bar-track">
            <div class="dash-skill-bar-fill ${fc}" style="width:${pct}%"></div>
          </div>
          <div class="dash-skill-count">${cor}/${tot}</div>
        </div>`;
      }).join('')}
    </div>

    <!-- Tips -->
    ${tips.length ? `
    <div class="dash-section-title">
      <span class="hi-only">सुझाव</span>
      <span class="en-only">Suggestions</span>
    </div>
    <div class="dash-tips">
      <h4><span class="hi-only">अगला कदम 👇</span><span class="en-only">Next steps 👇</span></h4>
      <ul class="dash-tip-list">
        ${tips.map(t => `<li>
          <span class="hi-only">${t.hi}</span>
          <span class="en-only">${t.en}</span>
        </li>`).join('')}
      </ul>
    </div>` : ''}
  `;
}

function getTips(chapsDone, totalCorrect, streak) {
  const tips = [];
  if (chapsDone === 0)
    tips.push({ hi:'अध्याय 1 (औज़ार) से शुरू करें — बस 10 सवाल!', en:'Start with Chapter 1 (Tools) — just 10 questions!' });
  else if (chapsDone < 6)
    tips.push({ hi:`${6 - chapsDone} अध्याय बाकी हैं — अगला शुरू करें।`, en:`${6 - chapsDone} chapters remaining — start the next one.` });
  if (streak === 0)
    tips.push({ hi:'आज कुछ सीखें — streak शुरू होगी!', en:'Learn something today to start your streak!' });
  else if (streak >= 3)
    tips.push({ hi:`${streak} दिन की streak — शाबाश! कल भी आना।`, en:`${streak}-day streak — well done! Come back tomorrow.` });
  if (totalCorrect > 20)
    tips.push({ hi:'ज्ञान आधार खोलें — विस्तृत पाठ और वीडियो देखें।', en:'Open the Knowledge Base for detailed lessons and video tutorials.' });
  if (chapsDone === 6)
    tips.push({ hi:'सभी अध्याय पूरे! डिज़ाइन स्टूडियो में कपड़े बनाएं।', en:'All chapters complete! Try the Fabric Design Studio to create patterns.' });
  return tips;
}

function confirmReset() {
  const ok = confirm(
    'सभी प्रगति मिट जाएगी। क्या आप sure हैं?\nAll progress will be deleted. Are you sure?'
  );
  if (ok) {
    if (typeof restartAll === 'function') restartAll();
    if (typeof switchView === 'function') switchView('lesson');
  }
}

// Called by switchView when dashboard tab is opened
function initDashboard() {
  renderDashboard();
}

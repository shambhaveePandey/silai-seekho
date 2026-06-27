// ════════════════════════════════════════════════════════════
//  KNOWLEDGE BASE — searchable bilingual lesson plans
//  Loads src/data/knowledge-base.json and renders filterable cards.
// ════════════════════════════════════════════════════════════
const KB = {
  data: null,
  filters: { q: '', level: 'all', topic: 'all' },
};

// Resolve a relative asset/data path correctly whether the site is served
// at the domain root or under a project subpath (e.g. /silai-seekho/).
function basePath() {
  // The folder containing index.html
  const path = window.location.pathname;
  return path.endsWith('/') ? path : path.substring(0, path.lastIndexOf('/') + 1);
}
function assetUrl(rel) {
  return basePath() + rel.replace(/^\/+/, '');
}

async function loadKnowledgeBase() {
  if (KB.data) return KB.data;
  try {
    const res = await fetch(assetUrl('src/data/knowledge-base.json'), { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    KB.data = await res.json();
  } catch (err) {
    console.error('Knowledge base failed to load:', err);
    const grid = document.getElementById('kbGrid');
    if (grid) {
      grid.innerHTML =
        '<div class="kb-empty"><span>⚠️</span>' +
        '<p class="hi-only">ज्ञान आधार लोड नहीं हो सका। कृपया पेज को रिफ्रेश करें।</p>' +
        '<p class="en-only">Could not load the knowledge base. Please refresh the page.</p></div>';
    }
    return null;
  }
  buildFilters();
  renderKB();
  return KB.data;
}

function buildFilters() {
  const { levels, levelLabels } = KB.data.meta;
  const topics = KB.data.topics;

  // Level chips
  const levelRow = document.getElementById('kbLevelChips');
  levelRow.innerHTML =
    '<button class="kb-chip active" data-level="all" onclick="setKBLevel(\'all\')">' +
    '<span class="hi-only">सभी स्तर</span><span class="en-only">All levels</span></button>' +
    levels
      .map(
        (lv) =>
          `<button class="kb-chip lvl-${lv}" data-level="${lv}" onclick="setKBLevel('${lv}')">` +
          `<span class="hi-only">${levelLabels[lv].hi}</span>` +
          `<span class="en-only">${levelLabels[lv].en}</span></button>`
      )
      .join('');

  // Topic chips
  const topicRow = document.getElementById('kbTopicChips');
  topicRow.innerHTML =
    '<button class="kb-chip active" data-topic="all" onclick="setKBTopic(\'all\')">' +
    '<span class="hi-only">सभी विषय</span><span class="en-only">All topics</span></button>' +
    topics
      .map(
        (t) =>
          `<button class="kb-chip" data-topic="${t.id}" onclick="setKBTopic('${t.id}')">` +
          `${t.icon} <span class="hi-only">${t.hi}</span><span class="en-only">${t.en}</span></button>`
      )
      .join('');
}

function topicById(id) {
  return KB.data.topics.find((t) => t.id === id) || { icon: '📘', hi: id, en: id };
}

function matchesFilters(lesson) {
  const f = KB.filters;
  if (f.level !== 'all' && lesson.level !== f.level) return false;
  if (f.topic !== 'all' && lesson.topic !== f.topic) return false;
  if (f.q) {
    const q = f.q.toLowerCase();
    const hay = [
      lesson.title.hi, lesson.title.en,
      lesson.summary.hi, lesson.summary.en,
      topicById(lesson.topic).hi, topicById(lesson.topic).en,
      lesson.level,
      ...(lesson.objectives.hi || []), ...(lesson.objectives.en || []),
    ].join(' ').toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function renderKB() {
  const grid = document.getElementById('kbGrid');
  const countEl = document.getElementById('kbCount');
  if (!grid || !KB.data) return;

  const results = KB.data.lessons.filter(matchesFilters);
  const labels = KB.data.meta.levelLabels;

  countEl.innerHTML =
    `<span class="hi-only">${results.length} पाठ मिले</span>` +
    `<span class="en-only">${results.length} lesson${results.length === 1 ? '' : 's'} found</span>`;

  if (results.length === 0) {
    grid.innerHTML =
      '<div class="kb-empty" style="grid-column:1/-1"><span>🔍</span>' +
      '<p class="hi-only">कोई पाठ नहीं मिला। फ़िल्टर बदलकर देखें।</p>' +
      '<p class="en-only">No lessons match. Try changing the filters.</p></div>';
    return;
  }

  // Order by level so plans read beginner → expert
  const order = { beginner: 0, intermediate: 1, advanced: 2, expert: 3 };
  results.sort((a, b) => order[a.level] - order[b.level]);

  grid.innerHTML = results
    .map((l) => {
      const t = topicById(l.topic);
      return `
      <article class="kb-card">
        <div class="kb-card-top">
          <span class="kb-topic">${t.icon} <span class="hi-only">${t.hi}</span><span class="en-only">${t.en}</span></span>
          <span class="kb-level ${l.level}"><span class="hi-only">${labels[l.level].hi}</span><span class="en-only">${labels[l.level].en}</span></span>
        </div>
        <div class="kb-card-body">
          <h3 class="hi-only">${l.title.hi}</h3>
          <h3 class="en-only">${l.title.en}</h3>
          <div class="kb-card-title-en hi-only">${l.title.en}</div>
          <p class="kb-card-summary"><span class="hi-only">${l.summary.hi}</span><span class="en-only">${l.summary.en}</span></p>
          <div class="kb-card-meta">
            <span>⏱️ ${l.duration} <span class="hi-only">मिनट</span><span class="en-only">min</span></span>
            <span class="dot"></span>
            <span>🎬 ${l.videos.length} <span class="hi-only">वीडियो</span><span class="en-only">videos</span></span>
          </div>
          <button class="kb-card-btn" onclick="openLesson('${l.id}')">
            <span class="hi-only">पाठ योजना खोलें</span><span class="en-only">Open lesson plan</span>
          </button>
        </div>
      </article>`;
    })
    .join('');
}

// ── Filter setters ────────────────────────────────────────
function setKBLevel(level) {
  KB.filters.level = level;
  document.querySelectorAll('#kbLevelChips .kb-chip').forEach((c) =>
    c.classList.toggle('active', c.dataset.level === level)
  );
  renderKB();
}
function setKBTopic(topic) {
  KB.filters.topic = topic;
  document.querySelectorAll('#kbTopicChips .kb-chip').forEach((c) =>
    c.classList.toggle('active', c.dataset.topic === topic)
  );
  renderKB();
}
function searchKB(value) {
  KB.filters.q = value.trim();
  renderKB();
}

// ── YouTube embed helper ──────────────────────────────────
function youTubeId(url) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

// ── Lesson detail modal ───────────────────────────────────
function openLesson(id) {
  const l = KB.data.lessons.find((x) => x.id === id);
  if (!l) return;
  const t = topicById(l.topic);
  const labels = KB.data.meta.levelLabels;

  document.getElementById('modalTitleHi').textContent = l.title.hi;
  document.getElementById('modalTitleEn').textContent = l.title.en;
  document.getElementById('modalSub').textContent = `${t.icon} ${t.en}`;
  document.getElementById('modalBadges').innerHTML =
    `<span class="kb-level ${l.level}"><span class="hi-only">${labels[l.level].hi}</span><span class="en-only">${labels[l.level].en}</span></span>` +
    `<span class="kb-level" style="background:var(--color-surface-offset);color:var(--color-text-muted)">⏱️ ${l.duration} min</span>`;

  // Illustration (externalised media, with fallback handled by onerror)
  const illusWrap = document.getElementById('modalIllus');
  illusWrap.setAttribute('data-failed', 'false');
  illusWrap.innerHTML =
    `<img class="illus" alt="${l.title.en}" src="${assetUrl(l.illustration)}" ` +
    `onerror="this.closest('.illus-wrap').setAttribute('data-failed','true')">` +
    `<div class="illus-fallback"><span class="hi-only">चित्र लोड नहीं हुआ</span>` +
    `<span class="en-only">Illustration unavailable</span></div>`;

  // Objectives
  const objHi = (l.objectives.hi || []).map((o) => `<li class="hi-only">${o}</li>`).join('');
  const objEn = (l.objectives.en || []).map((o) => `<li class="en-only">${o}</li>`).join('');
  document.getElementById('modalObjectives').innerHTML = objHi + objEn;

  // Videos
  const vids = l.videos
    .map((v, i) => {
      const vid = youTubeId(v.url);
      const action = vid
        ? `onclick="playVideo('${vid}','vembed-${i}');return false;"`
        : `target="_blank" rel="noopener"`;
      return (
        `<a class="video-item" href="${v.url}" ${action}>` +
        `<span class="video-thumb">▶</span>` +
        `<span class="video-meta"><strong>${v.title}</strong><span>${v.channel} · ${v.lang.toUpperCase()}</span></span>` +
        `</a>` +
        (vid ? `<div class="video-embed" id="vembed-${i}"></div>` : '')
      );
    })
    .join('');
  document.getElementById('modalVideos').innerHTML = vids;

  // References
  document.getElementById('modalRefs').innerHTML = l.references
    .map(
      (r) =>
        `<a class="ref-item" href="${r.url}" target="_blank" rel="noopener">` +
        `<span class="ref-ico">🔗</span>` +
        `<span class="video-meta"><strong>${r.title}</strong><span>${r.source}</span></span>` +
        `</a>`
    )
    .join('');

  document.getElementById('lessonModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function playVideo(videoId, embedId) {
  const box = document.getElementById(embedId);
  if (!box) return;
  if (box.classList.contains('show')) {
    box.classList.remove('show');
    box.innerHTML = '';
    return;
  }
  box.innerHTML =
    `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0" ` +
    `title="Tutorial video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  box.classList.add('show');
}

function closeLesson() {
  document.getElementById('lessonModal').classList.remove('open');
  document.body.style.overflow = '';
  // stop any playing embeds
  document.querySelectorAll('.video-embed').forEach((b) => {
    b.classList.remove('show');
    b.innerHTML = '';
  });
}

// Close modal on overlay click / Escape
document.addEventListener('click', (e) => {
  if (e.target.id === 'lessonModal') closeLesson();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLesson();
});

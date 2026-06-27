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

// ═══════════════════════════════════════════════════════════
//  LP — FULL-PAGE LESSON SYSTEM (replaces modal)
// ═══════════════════════════════════════════════════════════
const LP = { lesson: null, fabric: 'cotton', animOn: false };

const FABRIC_LABELS = {
  cotton:    { hi: '🌿 सूती',       en: '🌿 Cotton' },
  silk:      { hi: '✨ रेशम',       en: '✨ Silk' },
  georgette: { hi: '🌊 जॉर्जेट',   en: '🌊 Georgette' },
  polyester: { hi: '💪 पॉलिएस्टर', en: '💪 Polyester' },
};

const KEY_CONCEPTS = {
  'L-B-tools-01': [
    { icon:'📏', term:{hi:'इंच टेप',en:'Measuring Tape'}, def:{hi:'60 इंच लंबा लचीला टेप — शरीर और कपड़े की माप के लिए',en:'60-inch flexible tape for body and fabric measurements'} },
    { icon:'✂️', term:{hi:'कटिंग कैंची',en:'Fabric Scissors'}, def:{hi:'केवल कपड़े के लिए — कागज काटने से धार खराब होती है',en:'For fabric only — cutting paper dulls the blade fast'} },
    { icon:'🖍️', term:{hi:'दर्जी चॉक',en:"Tailor's Chalk"}, def:{hi:'कटिंग लाइन के लिए — धोने पर मिट जाता है',en:'Marks cutting lines on fabric — washes off after sewing'} },
    { icon:'📐', term:{hi:'L-स्केल',en:'L-Scale'}, def:{hi:'सीधी और 90° कोण की रेखाएं बनाने के लिए',en:'For straight lines and 90° corners on pattern paper'} },
  ],
  'L-B-fabrics-01': [
    { icon:'↕️', term:{hi:'ताना धागा',en:'Warp Thread'}, def:{hi:'कपड़े की लंबाई में चलने वाला धागा — खिंचाव कम',en:'Lengthwise thread in fabric — minimal stretch'} },
    { icon:'↔️', term:{hi:'बाना धागा',en:'Weft Thread'}, def:{hi:'कपड़े की चौड़ाई में बुना धागा',en:'Thread running across the fabric width'} },
    { icon:'📌', term:{hi:'सेल्वेज',en:'Selvedge'}, def:{hi:'कपड़े का पक्का बुना किनारा — यह नहीं फटता',en:"Fabric's finished woven edge — does not fray"} },
    { icon:'🔄', term:{hi:'बायस',en:'Bias'}, def:{hi:'45° तिरछी दिशा — इसमें काटने से कपड़ा खिंचता है',en:'45° diagonal — fabric stretches when cut on the bias'} },
  ],
  'L-I-fabrics-01': [
    { icon:'🌿', term:{hi:'सूती',en:'Cotton'}, def:{hi:'सांस लेने वाला, मजबूत — शुरुआती के लिए सर्वोत्तम',en:'Breathable and strong — best for beginners'} },
    { icon:'✨', term:{hi:'रेशम',en:'Silk'}, def:{hi:'रेशम के कीड़े से बना — चमकदार और नाजुक',en:'From silkworm cocoons — lustrous and delicate'} },
    { icon:'🌊', term:{hi:'जॉर्जेट',en:'Georgette'}, def:{hi:'हल्का और बहने वाला — साड़ियों के लिए लोकप्रिय',en:'Light and flowy — popular for sarees'} },
    { icon:'💪', term:{hi:'पॉलिएस्टर',en:'Polyester'}, def:{hi:'टिकाऊ, सस्ता, आसान देखभाल',en:'Durable, affordable, and easy to care for'} },
  ],
  'L-B-machines-01': [
    { icon:'🔩', term:{hi:'प्रेसर फुट',en:'Presser Foot'}, def:{hi:'कपड़े को नीचे दबाता है ताकि सिलाई सीधी हो',en:'Holds fabric down for straight stitching'} },
    { icon:'🪡', term:{hi:'बॉबिन',en:'Bobbin'}, def:{hi:'नीचे का धागा — ऊपर-नीचे मिलकर टांका बनाते हैं',en:'Lower thread spool — meets upper thread to form a stitch'} },
    { icon:'📏', term:{hi:'स्टिच लेंथ',en:'Stitch Length'}, def:{hi:'एक टांके की लंबाई — सामान्यतः 2.5-3mm',en:'Length per stitch — normally 2.5-3 mm'} },
    { icon:'⚡', term:{hi:'थ्रेड टेंशन',en:'Thread Tension'}, def:{hi:'धागे का खिंचाव — अधिक या कम से टांका बिगड़ता है',en:'Thread tautness — wrong tension causes stitch problems'} },
  ],
  'L-I-machines-01': [
    { icon:'🔧', term:{hi:'जिग-जैग',en:'Zigzag Stitch'}, def:{hi:'किनारे फिनिश और खिंचाव वाले कपड़े के लिए',en:'For finishing edges and sewing stretchy fabrics'} },
    { icon:'🔁', term:{hi:'रिवर्स बटन',en:'Reverse Button'}, def:{hi:'शुरुआत और अंत में धागा पक्का करने के लिए',en:'Back-stitches at start and end to lock the thread'} },
    { icon:'⚡', term:{hi:'फुट कंट्रोलर',en:'Foot Pedal'}, def:{hi:'दबाने की गति से मशीन की गति नियंत्रित',en:'Pedal pressure controls stitching speed'} },
    { icon:'🧵', term:{hi:'थ्रेडिंग पाथ',en:'Threading Path'}, def:{hi:'धागे को क्रम से गाइड करें — नंबर के अनुसार',en:'Follow the numbered guides in order when threading'} },
  ],
  'L-B-stitches-01': [
    { icon:'📌', term:{hi:'रनिंग स्टिच',en:'Running Stitch'}, def:{hi:'सबसे सरल — ऊपर-नीचे, ऊपर-नीचे',en:'Simplest stitch — up-down-up-down'} },
    { icon:'🔒', term:{hi:'बैक स्टिच',en:'Back Stitch'}, def:{hi:'सबसे मजबूत हाथ-सिलाई — मशीन जैसा',en:'Strongest hand stitch — similar to machine stitching'} },
    { icon:'🔗', term:{hi:'सीम अलाउंस',en:'Seam Allowance'}, def:{hi:'सिलाई रेखा से किनारे तक — सामान्यतः 1-1.5cm',en:'Distance from stitch line to edge — typically 1-1.5 cm'} },
    { icon:'🌐', term:{hi:'ब्लैंकेट स्टिच',en:'Blanket Stitch'}, def:{hi:'किनारे फिनिश और सजावट के लिए',en:'For edge finishing and decorative borders'} },
  ],
  'L-I-stitches-01': [
    { icon:'🎭', term:{hi:'फ्रेंच सीम',en:'French Seam'}, def:{hi:'कच्चे किनारे अंदर छुपाता है — नाजुक कपड़े के लिए',en:'Encloses raw edges — ideal for delicate fabrics'} },
    { icon:'💪', term:{hi:'फ्लैट फेल्ड सीम',en:'Flat Felled Seam'}, def:{hi:'बहुत मजबूत — जींस में उपयोग',en:'Very strong — used in jeans and workwear'} },
    { icon:'✨', term:{hi:'प्रिंसेस सीम',en:'Princess Seam'}, def:{hi:'घुमावदार सीम — ब्लाउज और ड्रेस फिटिंग',en:'Curved seam for shaping fitted blouses and dresses'} },
    { icon:'🔄', term:{hi:'ग्रेडिंग',en:'Grading'}, def:{hi:'सीम के किनारे ट्रिम करें — मोटाई कम करने के लिए',en:'Trim seam layers to reduce bulk at corners'} },
  ],
  'L-B-measure-01': [
    { icon:'👗', term:{hi:'बस्ट',en:'Bust'}, def:{hi:'सीने के सबसे चौड़े हिस्से का माप',en:'Widest chest measurement — keep tape horizontal'} },
    { icon:'⭕', term:{hi:'वेस्ट',en:'Waist'}, def:{hi:'कमर के सबसे पतले हिस्से का माप',en:'Narrowest part of the waist'} },
    { icon:'🔵', term:{hi:'हिप',en:'Hip'}, def:{hi:'कमर से 7-9 इंच नीचे सबसे चौड़ा हिस्सा',en:'Widest part 7-9 inches below the waist'} },
    { icon:'📏', term:{hi:'ईज',en:'Ease'}, def:{hi:'आरामदायक पहनने के लिए माप से थोड़ा अधिक',en:'Extra allowance added to measurements for movement'} },
  ],
  'L-I-measure-01': [
    { icon:'📐', term:{hi:'कंधे की चौड़ाई',en:'Shoulder Width'}, def:{hi:'एक कंधे से दूसरे की दूरी',en:'Distance from one shoulder point to the other'} },
    { icon:'💪', term:{hi:'बाजू की लंबाई',en:'Sleeve Length'}, def:{hi:'कंधे से कलाई तक',en:'Measured from shoulder to wrist'} },
    { icon:'📋', term:{hi:'माप रजिस्टर',en:'Measurement Book'}, def:{hi:'हर ग्राहक का माप नोट — दोबारा ऑर्डर आसान',en:'Record all client measurements for repeat orders'} },
    { icon:'📏', term:{hi:'कुल लंबाई',en:'Full Length'}, def:{hi:'कंधे से जमीन तक — ड्रेस और साड़ी के लिए',en:'Shoulder to floor — essential for dresses and sarees'} },
  ],
  'L-I-patterns-01': [
    { icon:'📄', term:{hi:'ड्राफ्टिंग',en:'Drafting'}, def:{hi:'माप के आधार पर कागज पर पैटर्न बनाना',en:'Drawing a pattern on paper from body measurements'} },
    { icon:'🔄', term:{hi:'ग्रेन लाइन',en:'Grain Line'}, def:{hi:'पैटर्न पर बना तीर — कपड़े के ताने के साथ',en:'Arrow on pattern — must align with fabric warp'} },
    { icon:'📌', term:{hi:'नॉच',en:'Notch'}, def:{hi:'पैटर्न पर छोटे निशान — टुकड़े मिलाने के लिए',en:'Small marks on pattern edges for matching pieces'} },
    { icon:'✂️', term:{hi:'सीम अलाउंस',en:'Seam Allowance'}, def:{hi:'हर सीम पर 1-1.5 cm अतिरिक्त जोड़ें',en:'Add 1-1.5 cm to all seam lines on the pattern'} },
  ],
  'L-A-patterns-01': [
    { icon:'📐', term:{hi:'प्रिंसेस लाइन',en:'Princess Line'}, def:{hi:'बस्ट से कमर तक घुमावदार सीम — शरीर की आकृति',en:'Curved seam from bust to waist for fitted silhouettes'} },
    { icon:'🔄', term:{hi:'डार्ट',en:'Dart'}, def:{hi:'पैटर्न में V-आकार की तह — शरीर के कर्व के लिए',en:'V-shaped fold in fabric to accommodate body curves'} },
    { icon:'📏', term:{hi:'मस्लिन',en:'Muslin'}, def:{hi:'पहले सस्ते कपड़े में परखें',en:'Test your pattern in cheap fabric before the real one'} },
    { icon:'⭕', term:{hi:'आर्महोल',en:'Armhole'}, def:{hi:'आस्तीन के लिए गोलाकार कटाव',en:'Rounded cutout where the sleeve is attached'} },
  ],
  'L-I-garments-01': [
    { icon:'🥻', term:{hi:'कुर्ती',en:'Kurti'}, def:{hi:'भारतीय महिलाओं का छोटा कुर्ता — घुटने तक',en:'Short Indian tunic — knee-length or above'} },
    { icon:'📐', term:{hi:'साइड सीम',en:'Side Seam'}, def:{hi:'गार्मेंट के दोनों तरफ की मुख्य सीम',en:'Main seam running down each side of the garment'} },
    { icon:'🔄', term:{hi:'हेम',en:'Hem'}, def:{hi:'गार्मेंट का मुड़ा और सिला निचला किनारा',en:"Garment's folded and stitched lower edge"} },
    { icon:'✂️', term:{hi:'फेसिंग',en:'Facing'}, def:{hi:'गले और आर्महोल पर अंदरूनी परत — साफ फिनिश',en:'Inner fabric at neckline and armhole for clean finish'} },
  ],
  'L-A-garments-01': [
    { icon:'🪡', term:{hi:'जरी',en:'Zari'}, def:{hi:'सोने/चांदी रंग का धातु धागा',en:'Gold or silver metallic thread'} },
    { icon:'🎀', term:{hi:'पिपिंग',en:'Piping'}, def:{hi:'किनारे पर लगाई सजावटी पट्टी',en:'Narrow decorative strip at seams or edges'} },
    { icon:'🔘', term:{hi:'हुक और आई',en:'Hook and Eye'}, def:{hi:'ब्लाउज के पीछे बंद करने के लिए',en:'Closure at the back of blouses'} },
    { icon:'💎', term:{hi:'इंटरफेसिंग',en:'Interfacing'}, def:{hi:'अंदरूनी कड़ी परत — आकार बनाए रखती है',en:'Fusible inner layer for structure and stiffness'} },
  ],
  'L-A-embroidery-01': [
    { icon:'🌸', term:{hi:'सातिन स्टिच',en:'Satin Stitch'}, def:{hi:'भरावट वाला टांका — फूल और पत्तियों के लिए',en:'Filling stitch for petals, leaves and solid shapes'} },
    { icon:'🪡', term:{hi:'आउटलाइन स्टिच',en:'Stem Stitch'}, def:{hi:'रूपरेखा और तनों के लिए',en:'For outlining stems and curved lines'} },
    { icon:'🌟', term:{hi:'लेजी डेजी',en:'Lazy Daisy'}, def:{hi:'फूलों की पंखुड़ियां — छोटे चेन लूप',en:'Individual petals made with a looped chain stitch'} },
    { icon:'🧵', term:{hi:'कढ़ाई रिंग',en:'Embroidery Hoop'}, def:{hi:'कपड़ा तना रहता है — टांका सीधा बनता है',en:'Keeps fabric taut — prevents puckering while stitching'} },
  ],
  'L-E-embroidery-01': [
    { icon:'✨', term:{hi:'जरदोजी',en:'Zardozi'}, def:{hi:'सोने-चांदी के धागे से भारी शाही कढ़ाई',en:'Heavy royal embroidery with gold and silver threads'} },
    { icon:'🪡', term:{hi:'आरी',en:'Aari'}, def:{hi:'पतले हुक वाला उपकरण — कढ़ाई के लिए',en:'Hook-tipped needle for chain embroidery and zardozi'} },
    { icon:'💎', term:{hi:'सितारे',en:'Sequins'}, def:{hi:'चमकदार टुकड़े — आरी से पिरोए जाते हैं',en:'Shiny decorative discs sewn with the aari hook'} },
    { icon:'🖼️', term:{hi:'डिजाइन ट्रांसफर',en:'Design Transfer'}, def:{hi:'ट्रेसिंग से कपड़े पर डिजाइन उतारें',en:'Transfer design onto fabric using tracing paper'} },
  ],
  'L-B-saree-01': [
    { icon:'🎀', term:{hi:'पल्लू',en:'Pallu'}, def:{hi:'साड़ी का सजावटी छोर — कंधे पर लहराता है',en:'Decorative end of the saree — draped over shoulder'} },
    { icon:'📏', term:{hi:'बॉर्डर',en:'Border'}, def:{hi:'साड़ी के किनारे पर बुनी या कढ़ी पट्टी',en:'Woven or embroidered strip along the saree edge'} },
    { icon:'🧵', term:{hi:'ब्लाउज पीस',en:'Blouse Piece'}, def:{hi:'साड़ी के साथ 0.8-1 मीटर कपड़ा',en:'0.8-1 metre fabric included with saree for the blouse'} },
    { icon:'✨', term:{hi:'गोट',en:'Gota'}, def:{hi:'साड़ी पर लगाई जरी की चमकदार पट्टी',en:'Zari ribbon applied along saree borders'} },
  ],
  'L-I-saree-02': [
    { icon:'📏', term:{hi:'बस्ट + ईज',en:'Bust + Ease'}, def:{hi:'ब्लाउज बस्ट = छाती + 1 इंच ईज',en:'Blouse bust = chest measurement + 1 inch ease'} },
    { icon:'⭕', term:{hi:'ब्लाउज गहराई',en:'Blouse Depth'}, def:{hi:'कंधे से ब्लाउज के निचले किनारे तक',en:'From shoulder to the bottom edge of the blouse'} },
    { icon:'🔵', term:{hi:'बैक नेक',en:'Back Neckline'}, def:{hi:'पीछे गले की गहराई — 0.5-1 इंच',en:'Back neckline depth — typically 0.5-1 inch'} },
    { icon:'💪', term:{hi:'बाजू घेरा',en:'Arm Circumference'}, def:{hi:'बाजू के सबसे मोटे हिस्से का माप',en:'Measurement around the widest part of the upper arm'} },
  ],
  'L-I-saree-03': [
    { icon:'📐', term:{hi:'ड्राफ्टिंग',en:'Pattern Drafting'}, def:{hi:'माप के आधार पर ब्लाउज पैटर्न बनाना',en:'Drawing a blouse pattern from measurements'} },
    { icon:'📄', term:{hi:'ग्राफ पेपर',en:'Graph Paper'}, def:{hi:'1cm ग्रिड — सटीक पैटर्न के लिए',en:'1 cm grid paper for accurate drafting'} },
    { icon:'🔄', term:{hi:'आर्महोल कर्व',en:'Armhole Curve'}, def:{hi:'ब्लाउज का सबसे कठिन हिस्सा',en:'Most challenging part — a smooth curved armhole'} },
    { icon:'✂️', term:{hi:'1.5cm सीम',en:'1.5cm Seam'}, def:{hi:'ब्लाउज में हर तरफ 1.5cm सीम अलाउंस',en:'Add 1.5 cm seam allowance to all blouse edges'} },
  ],
  'L-I-saree-04': [
    { icon:'🔵', term:{hi:'निवी स्टाइल',en:'Nivi Style'}, def:{hi:'सबसे लोकप्रिय — पल्लू बाईं कंधे पर',en:'Most popular draping — pallu over left shoulder'} },
    { icon:'🌊', term:{hi:'प्लीट्स',en:'Pleats'}, def:{hi:'साड़ी की तहें — कमर में आगे खोंसी जाती हैं',en:'Fabric folds tucked into the waistband at the front'} },
    { icon:'🔗', term:{hi:'पेटीकोट',en:'Petticoat'}, def:{hi:'साड़ी के नीचे पहना जाने वाला अंदरूनी स्कर्ट',en:'Underskirt worn beneath the saree to hold draping'} },
    { icon:'📌', term:{hi:'साड़ी पिन',en:'Saree Pin'}, def:{hi:'पल्लू को कंधे पर पकड़ने के लिए',en:'Safety pin to hold the pallu on the shoulder'} },
  ],
  'L-A-saree-05': [
    { icon:'📐', term:{hi:'प्रिंसेस कट',en:'Princess Cut'}, def:{hi:'वर्टिकल सीम जो ब्लाउज को शरीर का आकार देती है',en:'Vertical seams that shape the blouse to body contours'} },
    { icon:'🔄', term:{hi:'6 पैनल',en:'6 Panels'}, def:{hi:'फ्रंट x2, साइड x2, बैक x2 — छह टुकड़े',en:'Front x2, side x2, back x2 — six pattern pieces'} },
    { icon:'✂️', term:{hi:'बायस टेप',en:'Bias Tape'}, def:{hi:'गले और बाजू के किनारे फिनिश के लिए',en:'Applied to neckline and armhole edges for clean finish'} },
    { icon:'📋', term:{hi:'मस्लिन टेस्ट',en:'Muslin Test'}, def:{hi:'मुख्य कपड़ा काटने से पहले सस्ते कपड़े में परखें',en:'Test fit in cheap fabric before cutting the main one'} },
  ],
  'L-E-saree-06': [
    { icon:'✨', term:{hi:'जरदोजी',en:'Zardozi'}, def:{hi:'सोने-चांदी के धागे और मोती से शाही कढ़ाई',en:'Royal embroidery with gold/silver threads and gems'} },
    { icon:'🔩', term:{hi:'बोनिंग',en:'Boning'}, def:{hi:'ब्लाउज में पतली पट्टियां — आकार बनाए रखती हैं',en:'Rigid strips inside blouse — maintains shape'} },
    { icon:'💎', term:{hi:'पैडिंग',en:'Cup Padding'}, def:{hi:'ब्रा कप जैसी परत — दूल्हन ब्लाउज में सहारे के लिए',en:'Cup-shaped inner lining for support in bridal blouses'} },
    { icon:'🎀', term:{hi:'शोल्डर पैड',en:'Shoulder Pad'}, def:{hi:'कंधे का आकार सुधारने के लिए',en:'Enhances shoulder shape in fitted blouses'} },
  ],
  'L-E-business-01': [
    { icon:'💰', term:{hi:'मूल्य निर्धारण',en:'Pricing'}, def:{hi:'कपड़ा + धागा + मेहनत + ओवरहेड = कुल लागत',en:'Fabric + thread + labour + overhead = total cost'} },
    { icon:'📊', term:{hi:'माप रजिस्टर',en:'Client Book'}, def:{hi:'हर ग्राहक का माप नोट — दोबारा ऑर्डर आसान',en:'Record all client measurements for repeat orders'} },
    { icon:'📱', term:{hi:'डिजिटल मार्केटिंग',en:'Digital Marketing'}, def:{hi:'WhatsApp और Instagram पर काम दिखाएं',en:'Showcase your work on WhatsApp and Instagram'} },
    { icon:'📅', term:{hi:'डिलीवरी डेडलाइन',en:'Delivery Deadline'}, def:{hi:'समय पर काम — व्यापार की नींव',en:'Timely delivery is the foundation of a tailoring business'} },
  ],
};

const FABRIC_TIPS = {
  tools:        { cotton:{hi:'सूती पर चॉक से निशान लगाएं — साफ दिखता और मिट जाता है।',en:'Mark cotton with chalk — shows clearly and washes off.'},silk:{hi:'रेशम पर पिन बहुत हल्के लगाएं — भारी पिन निशान छोड़ते हैं।',en:'Pin silk very lightly — heavy pins leave visible marks.'},georgette:{hi:'जॉर्जेट फिसलती है — काटते समय टेबल पर टेप से रोकें।',en:'Georgette slips — tape it to the table when cutting.'},polyester:{hi:'पॉलिएस्टर पर धोने वाला मार्कर पेन बेहतर।',en:'Use a washable marker on polyester — chalk can smudge.'} },
  fabrics:      { cotton:{hi:'सूती 5-10% सिकुड़ता है — काटने से पहले धोएं और सुखाएं।',en:'Cotton shrinks 5-10% — pre-wash and dry before cutting.'},silk:{hi:'रेशम ठंडे पानी में हाथ से धोएं — गर्म पानी से बचें।',en:'Hand-wash silk in cool water — avoid hot water.'},georgette:{hi:'जॉर्जेट हल्के हाथ से धोएं और छाया में सुखाएं।',en:'Wash georgette gently and dry in the shade.'},polyester:{hi:'पॉलिएस्टर मशीन में 30°C पर धुल सकता है।',en:'Machine-wash polyester at 30°C.'} },
  machines:     { cotton:{hi:'सूती के लिए: नीडल 80/12, स्टिच लेंथ 2.5mm।',en:'For cotton: needle 80/12, stitch length 2.5 mm.'},silk:{hi:'रेशम के लिए: नीडल 60/8 (बारीक), टेंशन हल्का।',en:'For silk: use needle 60/8 (fine) and reduce tension.'},georgette:{hi:'जॉर्जेट पर जिग-जैग स्टिच — किनारे नहीं फटते।',en:'Use zigzag stitch on georgette edges to prevent fraying.'},polyester:{hi:'पॉलिएस्टर पर पॉलिएस्टर धागा उपयोग करें।',en:'Use polyester thread on polyester fabric.'} },
  stitches:     { cotton:{hi:'सूती की सीम 1.5cm और किनारे पर जिग-जैग।',en:'1.5 cm seam on cotton; zigzag the edges.'},silk:{hi:'रेशम पर फ्रेंच सीम — कच्चे किनारे न छोड़ें।',en:'Use French seams on silk — never leave raw edges.'},georgette:{hi:'जॉर्जेट पर छोटा टांका 2mm — सीम नहीं खुलती।',en:'Use shorter stitches (2 mm) on georgette.'},polyester:{hi:'पॉलिएस्टर की सीम गर्म इस्त्री से दबाएं।',en:'Press polyester seams with a warm iron.'} },
  measurements: { cotton:{hi:'सूती के माप में 1cm ईज जोड़ें — धोने पर सिकुड़ेगा।',en:'Add 1 cm ease to cotton — it shrinks after washing.'},silk:{hi:'रेशम में 1.5cm ईज — शरीर से बिल्कुल नहीं चिपकना चाहिए।',en:'Allow 1.5 cm ease for silk — it should not cling tightly.'},georgette:{hi:'जॉर्जेट में 2cm ईज जरूरी।',en:'Georgette needs 2 cm ease so it drapes naturally.'},polyester:{hi:'पॉलिएस्टर नहीं सिकुड़ता — माप के अनुसार काटें।',en:"Polyester doesn't shrink — cut exactly to measurements."} },
  patterns:     { cotton:{hi:'सूती पर पैटर्न पिन से लगाएं — हिलेगा नहीं।',en:'Pin pattern to cotton — it stays in place.'},silk:{hi:'रेशम पर पैटर्न पेपरवेट से रखें — पिन निशान छोड़ते हैं।',en:'Weigh pattern down on silk instead of pinning.'},georgette:{hi:'जॉर्जेट की दो परत रखकर पैटर्न काटें।',en:'Layer georgette double and cut through both layers.'},polyester:{hi:'पॉलिएस्टर पर चाक से आउटलाइन बनाएं।',en:'Trace pattern outline in chalk on polyester.'} },
  garments:     { cotton:{hi:'सूती कुर्ती में हर सीम प्रेस करें, खासकर आर्महोल।',en:'Press every seam on cotton kurti, especially the armhole.'},silk:{hi:'रेशम गार्मेंट में हाथ से फिनिशिंग — मशीन ज्यादा दिखती है।',en:'Hand-finish silk garments — machine stitching shows.'},georgette:{hi:'जॉर्जेट गार्मेंट के किनारे रोल हेम से फिनिश करें।',en:'Finish georgette garment edges with a rolled hem.'},polyester:{hi:'पॉलिएस्टर गार्मेंट आसान देखभाल।',en:'Polyester garments are easy-care — practical for everyday wear.'} },
  embroidery:   { cotton:{hi:'सूती पर कढ़ाई सबसे आसान — धागा अच्छी तरह पकड़ता है।',en:'Embroidery is easiest on cotton — thread grips well.'},silk:{hi:'रेशम पर रेशम धागे से कढ़ाई करें — चमक मेल खाएगी।',en:'Use silk thread for embroidery on silk — the sheen matches.'},georgette:{hi:'जॉर्जेट पर कढ़ाई में हुप जरूर लगाएं।',en:'Always use a hoop when embroidering on georgette.'},polyester:{hi:'पॉलिएस्टर पर पॉलिएस्टर धागा और बारीक सुई।',en:'Use polyester thread and a fine needle on polyester.'} },
  saree:        { cotton:{hi:'सूती साड़ी — प्लीट्स साफ बनती हैं और पहनना सरल।',en:'Cotton sarees drape easily — pleats form cleanly.'},silk:{hi:'रेशम साड़ी भारी — पल्लू पिन करें ताकि हिले नहीं।',en:'Silk sarees are heavy — pin the pallu to keep it in place.'},georgette:{hi:'जॉर्जेट साड़ी बहुत हल्की — थोड़ा पिन करें।',en:'Georgette sarees are very light — use a few pins.'},polyester:{hi:'पॉलिएस्टर साड़ी आसान देखभाल।',en:'Polyester sarees are easy-care — great for casual and festive use.'} },
  business:     { cotton:{hi:'सूती कपड़ों के ऑर्डर सबसे अधिक — बड़ा बाजार।',en:'Cotton garment orders are most frequent — large market.'},silk:{hi:'रेशम के काम में अधिक मेहनत — उचित दाम लें।',en:'Silk work is more labour-intensive — price accordingly.'},georgette:{hi:'जॉर्जेट पार्टी वियर — त्योहारों पर अधिक मांग।',en:'Georgette is party-wear — high demand during festivals.'},polyester:{hi:'पॉलिएस्टर सस्ता और टिकाऊ — बजट ग्राहकों के लिए।',en:'Polyester is affordable and durable — good for budget clients.'} },
};

const TOPIC_IMAGES = {
  tools:        { url:'https://upload.wikimedia.org/wikipedia/commons/a/aa/Sewing_tools.jpg',        credit:'Wikimedia Commons - Public Domain' },
  fabrics:      { url:'https://upload.wikimedia.org/wikipedia/commons/6/68/CottonPlant.JPG',           credit:'Wikimedia Commons - Public Domain' },
  machines:     { url:'https://upload.wikimedia.org/wikipedia/commons/c/c7/Sewingmachine1.jpg',        credit:'Wikimedia Commons - Public Domain' },
  stitches:     { url:'https://upload.wikimedia.org/wikipedia/commons/0/0f/Quilting_seam.jpg',         credit:'Wikimedia Commons - CC BY-SA 2.0' },
  measurements: { url:'https://upload.wikimedia.org/wikipedia/commons/c/c2/A_Tailor_at_Work_%286920059143%29.jpg', credit:'Wikimedia Commons - CC0' },
  patterns:     { url:'https://upload.wikimedia.org/wikipedia/commons/1/1b/Drei.Hosenschnittmuster.jpg', credit:'Wikimedia Commons - CC BY-SA 4.0' },
  embroidery:   { url:'https://upload.wikimedia.org/wikipedia/commons/3/35/Close_Shot_of_the_Zardozi_%28Zardouzi%29_Embroidery_Cushion_Covers.jpg', credit:'Wikimedia Commons - CC BY-SA 3.0' },
  saree:        { url:'https://upload.wikimedia.org/wikipedia/commons/0/03/Choli.jpg',                 credit:'Wikimedia Commons - Public Domain' },
  garments:     { url:'https://upload.wikimedia.org/wikipedia/commons/0/03/Choli.jpg',                 credit:'Wikimedia Commons - Public Domain' },
  business:     { url:'https://upload.wikimedia.org/wikipedia/commons/c/c2/A_Tailor_at_Work_%286920059143%29.jpg', credit:'Wikimedia Commons - CC0' },
};

// ── Navigate to lesson page ───────────────────────────────
function openLesson(id) {
  if (!KB.data) return;
  var l = KB.data.lessons.find(function(x){ return x.id === id; });
  if (!l) return;
  LP.lesson = l; LP.fabric = 'cotton'; LP.animOn = false;
  renderLessonPage(l);
  switchView('kb-lesson');
}
function backToKB() { LP.lesson = null; switchView('kb'); }

function renderLessonPage(l) {
  var t = topicById(l.topic);
  var labels = KB.data.meta.levelLabels;
  var concepts = KEY_CONCEPTS[l.id] || [];
  var topicImg = TOPIC_IMAGES[l.topic];
  var html = '<div class="lp-page">';

  // TITLE
  html += '<section class="lp-title-section">' +
    '<div class="lp-topic-badge">' + t.icon + ' <span class="hi-only">' + t.hi + '</span><span class="en-only">' + t.en + '</span></div>' +
    '<h1 class="hi-only">' + l.title.hi + '</h1><h1 class="en-only">' + l.title.en + '</h1>' +
    '<p class="lp-en-subtitle hi-only">' + l.title.en + '</p>' +
    '<div class="lp-meta-row">' +
    '<span class="kb-level ' + l.level + '"><span class="hi-only">' + labels[l.level].hi + '</span><span class="en-only">' + labels[l.level].en + '</span></span>' +
    '<span class="lp-meta-chip">⏱️ ' + l.duration + ' <span class="hi-only">मिनट</span><span class="en-only">min</span></span>' +
    '<span class="lp-meta-chip">🎬 ' + l.videos.length + ' <span class="hi-only">वीडियो</span><span class="en-only">videos</span></span>' +
    '</div></section>';

  // DESCRIPTION
  html += '<section class="lp-section"><div class="lp-section-hd"><h2>📖 <span class="hi-only">परिचय एवं पृष्ठभूमि</span><span class="en-only">Introduction & Background</span></h2></div>';
  if (l.content && l.content.intro) {
    html += '<div class="lp-intro-block"><p class="hi-only">' + l.content.intro.hi + '</p><p class="en-only">' + l.content.intro.en + '</p></div>';
  }
  var objHi = (l.objectives && l.objectives.hi) || [];
  var objEn = (l.objectives && l.objectives.en) || [];
  if (objHi.length) {
    html += '<div class="lp-objectives"><h3 class="lp-sub-hd"><span class="hi-only">📌 सीखने के लक्ष्य</span><span class="en-only">📌 Learning Objectives</span></h3><ul class="lp-obj-list">' +
      objHi.map(function(o){ return '<li class="hi-only">' + o + '</li>'; }).join('') +
      objEn.map(function(o){ return '<li class="en-only">' + o + '</li>'; }).join('') +
      '</ul></div>';
  }
  if (concepts.length) {
    html += '<div class="lp-concepts-wrap"><h3 class="lp-sub-hd"><span class="hi-only">🔑 मुख्य अवधारणाएं</span><span class="en-only">🔑 Key Concepts</span></h3><div class="lp-concepts-grid">' +
      concepts.map(function(c){
        return '<div class="lp-concept-card"><span class="lp-concept-icon">' + c.icon + '</span><div class="lp-concept-body"><strong class="hi-only">' + c.term.hi + '</strong><strong class="en-only">' + c.term.en + '</strong><p class="hi-only">' + c.def.hi + '</p><p class="en-only">' + c.def.en + '</p></div></div>';
      }).join('') + '</div></div>';
  }
  html += '</section>';

  // MEDIA
  html += '<section class="lp-section lp-media-section"><div class="lp-section-hd">' +
    '<h2>🖼️ <span class="hi-only">दृश्य मार्गदर्शिका</span><span class="en-only">Visual Guide</span></h2>' +
    '<button class="lp-anim-btn" id="lpAnimBtn" onclick="toggleLPAnim()"><span id="lpAnimLabel"><span class="hi-only">✨ एनिमेशन चालू करें</span><span class="en-only">✨ Enable Animation</span></span></button>' +
    '</div><div class="lp-media-grid">' +
    '<div class="lp-illus-box"><img class="lp-illus" src="' + assetUrl(l.illustration) + '" alt="' + l.title.en + '" onerror="this.parentElement.classList.add(\'failed\')">' +
    '<div class="lp-illus-placeholder"><span>📚</span><p class="hi-only">चित्र अनुपलब्ध</p><p class="en-only">Illustration unavailable</p></div>' +
    '<div class="lp-anim-overlay" id="lpAnimOverlay" aria-hidden="true"></div></div>' +
    (topicImg ? '<div class="lp-web-image-box"><img class="lp-web-img" src="' + topicImg.url + '" alt="' + l.title.en + '" loading="lazy" onerror="this.parentElement.style.display=\'none\'"><p class="lp-img-credit">📷 ' + topicImg.credit + '</p></div>' : '') +
    '</div><p class="lp-img-caption hi-only">' + l.title.hi + ' — ' + t.hi + '</p><p class="lp-img-caption en-only">' + l.title.en + ' — ' + t.en + '</p></section>';

  // INSTRUCTIONS
  html += '<section class="lp-section lp-instr-section"><div class="lp-section-hd"><h2>📋 <span class="hi-only">चरण-दर-चरण निर्देश</span><span class="en-only">Step-by-Step Instructions</span></h2></div>' +
    '<div class="lp-fabric-bar"><span class="lp-fabric-label"><span class="hi-only">🧵 कपड़ा चुनें:</span><span class="en-only">🧵 Fabric:</span></span>' +
    Object.keys(FABRIC_LABELS).map(function(k){
      var lbl = FABRIC_LABELS[k];
      return '<button class="lp-fabric-chip' + (k === LP.fabric ? ' active' : '') + '" data-fabric="' + k + '" onclick="setLPFabric(\'' + k + '\')"><span class="hi-only">' + lbl.hi + '</span><span class="en-only">' + lbl.en + '</span></button>';
    }).join('') + '</div><div id="lpStepsList">' + renderLPSteps(l) + '</div></section>';

  // TUTORIALS
  if (l.videos.length || l.references.length) {
    html += '<section class="lp-section lp-tutorial-section"><div class="lp-section-hd"><h2>🎬 <span class="hi-only">ट्यूटोरियल और संसाधन</span><span class="en-only">Tutorials & Resources</span></h2></div>';
    if (l.videos.length) {
      html += '<h3 class="lp-sub-hd"><span class="hi-only">▶ वीडियो ट्यूटोरियल</span><span class="en-only">▶ Video Tutorials</span></h3><div class="lp-video-grid">' +
        l.videos.map(function(v, i){
          var vid = youTubeId(v.url);
          var act = vid ? 'onclick="playLPVideo(\'' + vid + '\',\'lpve-' + i + '\');return false;"' : 'target="_blank" rel="noopener"';
          var lang = v.lang === 'hi' ? 'हिंदी' : v.lang.toUpperCase();
          return '<div class="lp-video-item"><a class="lp-video-card" href="' + v.url + '" ' + act + '>' +
            '<div class="lp-video-thumb">' + (vid ? '<img src="https://img.youtube.com/vi/' + vid + '/mqdefault.jpg" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : '') + '<span class="lp-play-icon">▶</span></div>' +
            '<div class="lp-video-info"><strong>' + v.title + '</strong><span>' + v.channel + ' · ' + lang + '</span></div></a><div class="video-embed" id="lpve-' + i + '"></div></div>';
        }).join('') + '</div>';
    }
    if (l.references.length) {
      html += '<h3 class="lp-sub-hd" style="margin-top:var(--space-6)"><span class="hi-only">🔗 संदर्भ और लिंक</span><span class="en-only">🔗 References & Links</span></h3><div class="lp-refs-list">' +
        l.references.map(function(r){
          return '<a class="lp-ref-item" href="' + r.url + '" target="_blank" rel="noopener"><span class="lp-ref-icon">🔗</span><div><strong>' + r.title + '</strong><span>' + r.source + '</span></div></a>';
        }).join('') + '</div>';
    }
    html += '</section>';
  }

  html += '</div>';
  document.getElementById('lpContent').innerHTML = html;
  document.getElementById('lpBreadcrumb').innerHTML =
    '<span class="hi-only">' + t.icon + ' ' + t.hi + ' · ' + labels[l.level].hi + '</span>' +
    '<span class="en-only">' + t.icon + ' ' + t.en + ' · ' + labels[l.level].en + '</span>';
}

function renderLPSteps(l) {
  var steps = (l.content && l.content.steps) || [];
  var tips  = (l.content && l.content.tips)  || [];
  if (!steps.length) return '<p class="lp-no-content"><span class="hi-only">चरण जल्द आ रहे हैं।</span><span class="en-only">Steps coming soon.</span></p>';
  var fabricTip = (FABRIC_TIPS[l.topic] || {})[LP.fabric] || null;
  var html = '';
  if (fabricTip) {
    var lbl = FABRIC_LABELS[LP.fabric];
    html += '<div class="lp-fabric-tip-box"><span class="lp-ftip-icon">🧵</span><div>' +
      '<strong class="hi-only">' + lbl.hi + ' के लिए विशेष सुझाव</strong>' +
      '<strong class="en-only">' + lbl.en + ' Tip</strong>' +
      '<p class="hi-only">' + fabricTip.hi + '</p><p class="en-only">' + fabricTip.en + '</p>' +
      '</div></div>';
  }
  html += steps.map(function(s, i){
    return '<div class="lp-step"><div class="lp-step-num">' + (i+1) + '</div><div class="lp-step-body">' +
      '<h4 class="hi-only">' + s.title.hi + '</h4><h4 class="en-only">' + s.title.en + '</h4>' +
      '<p class="hi-only">' + s.hi + '</p><p class="en-only">' + s.en + '</p></div></div>';
  }).join('');
  if (tips.length) {
    html += '<div class="lp-tips-box"><h4>💡 <span class="hi-only">उपयोगी सुझाव</span><span class="en-only">Helpful Tips</span></h4>' +
      tips.map(function(tip){ return '<div class="lp-tip-row"><span class="hi-only">• ' + tip.hi + '</span><span class="en-only">• ' + tip.en + '</span></div>'; }).join('') +
      '</div>';
  }
  return html;
}

function setLPFabric(fabric) {
  LP.fabric = fabric;
  document.querySelectorAll('.lp-fabric-chip').forEach(function(c){ c.classList.toggle('active', c.dataset.fabric === fabric); });
  var el = document.getElementById('lpStepsList');
  if (el && LP.lesson) el.innerHTML = renderLPSteps(LP.lesson);
}

function toggleLPAnim() {
  LP.animOn = !LP.animOn;
  var overlay = document.getElementById('lpAnimOverlay');
  var btn = document.getElementById('lpAnimBtn');
  var label = document.getElementById('lpAnimLabel');
  if (btn) btn.classList.toggle('active', LP.animOn);
  if (overlay) { overlay.classList.toggle('active', LP.animOn); overlay.innerHTML = LP.animOn ? getLPAnim(LP.lesson && LP.lesson.topic) : ''; }
  if (label) label.innerHTML = LP.animOn
    ? '<span class="hi-only">✨ एनिमेशन बंद करें</span><span class="en-only">✨ Disable Animation</span>'
    : '<span class="hi-only">✨ एनिमेशन चालू करें</span><span class="en-only">✨ Enable Animation</span>';
}

function getLPAnim(topic) {
  var st = '@keyframes lpPulse{0%,100%{opacity:.8;transform:scale(1)}50%{opacity:.3;transform:scale(1.4)}}@keyframes lpDash{to{stroke-dashoffset:-30}}';
  var p = function(cx,cy,r,c,d){ return '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+c+'" stroke-width="3" style="animation:lpPulse 2s ease-in-out '+d+' infinite;transform-origin:'+cx+'px '+cy+'px"/>'; };
  var dl = function(d,c){ return '<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="4" stroke-dasharray="20 10" style="animation:lpDash 2s linear infinite"/>'; };
  var m = {
    tools: p(80,150,30,'#b35c00','0s')+p(200,80,25,'#016b6f','0.5s')+p(310,190,28,'#9b2424','1s'),
    stitches: dl('M 20 150 Q 100 80 200 150 Q 300 220 380 150','#b35c00'),
    machines: '<rect x="193" y="60" width="14" height="80" rx="3" fill="#b35c00" style="animation:lpPulse 1s ease-in-out infinite;transform-origin:200px 100px"/>',
    saree: dl('M 50 200 C 100 100 200 250 350 100','#9b2424')+dl('M 50 220 C 100 120 200 270 350 120','rgba(155,36,36,0.4)'),
    measurements: '<line x1="50" y1="150" x2="350" y2="150" stroke="#b35c00" stroke-width="2" stroke-dasharray="10 5" style="animation:lpDash 2s linear infinite"/><line x1="200" y1="50" x2="200" y2="250" stroke="#016b6f" stroke-width="2" stroke-dasharray="10 5" style="animation:lpDash 2.4s linear infinite"/>',
  };
  var inner = m[topic] || p(200,150,60,'#b35c00','0s');
  return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><style>' + st + '</style>' + inner + '</svg>';
}

function playLPVideo(videoId, embedId) {
  var box = document.getElementById(embedId);
  if (!box) return;
  if (box.classList.contains('show')) { box.classList.remove('show'); box.innerHTML = ''; return; }
  document.querySelectorAll('.video-embed.show').forEach(function(b){ b.classList.remove('show'); b.innerHTML = ''; });
  box.innerHTML = '<iframe src="https://www.youtube.com/embed/' + videoId + '?autoplay=1&rel=0" title="Tutorial video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
  box.classList.add('show');
}

function closeLesson() { var m = document.getElementById('lessonModal'); if (m) m.classList.remove('open'); document.body.style.overflow = ''; }
document.addEventListener('click', function(e){ if (e.target.id === 'lessonModal') closeLesson(); });
document.addEventListener('keydown', function(e){ if (e.key === 'Escape') { closeLesson(); if (LP.lesson) backToKB(); } });


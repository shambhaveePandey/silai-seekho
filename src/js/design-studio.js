/* ============================================================
   Silai Seekho — Fabric Design Studio
   2D pattern editor  →  live 3D drape preview  →  replication insights
   Pure vanilla JS. Three.js loaded lazily from CDN on first open.
   ============================================================ */

const DS = {
  ready: false,
  threeLoaded: false,
  canvas: null, ctx: null,
  size: 512,            // logical px (square repeat tile)
  bg: '#f3e8d8',
  fg: '#b35c00',
  accent: '#016b6f',
  motif: 'paisley',     // paisley | floral | stripes | checks | dots | chevron | bandhani | block
  density: 4,           // motifs per row
  scale: 1,
  rotation: 0,
  history: [],          // pattern snapshots for undo (dataURLs)
  // Garment selector
  garmentType: 'blouse',
  gender: 'female',
  garmentSize: 'S',     // clothing size (XS/S/M/L/XL)
  // 3D
  three: null, renderer: null, scene: null, cam: null, mesh: null, mannequin: null, raf: null, anim: true,
};

/* ---------- palette presets (traditional Indian textile palettes) ---------- */
const DS_PALETTES = {
  haldi:    { bg:'#fbe9c8', fg:'#b35c00', accent:'#9b2424', label:{hi:'हल्दी',en:'Haldi (Turmeric)'} },
  indigo:   { bg:'#dfe6ef', fg:'#1d3461', accent:'#c89000', label:{hi:'नील',en:'Indigo'} },
  rani:     { bg:'#ffe0ec', fg:'#a3004c', accent:'#016b6f', label:{hi:'रानी',en:'Rani Pink'} },
  mehendi:  { bg:'#eef3d8', fg:'#3a7a1e', accent:'#8a4500', label:{hi:'मेहंदी',en:'Mehendi Green'} },
  ivory:    { bg:'#f7f2e7', fg:'#7a5c3a', accent:'#c89000', label:{hi:'हाथीदांत',en:'Ivory & Gold'} },
  midnight: { bg:'#1a1730', fg:'#e8b840', accent:'#e06060', label:{hi:'रात',en:'Midnight'} },
};

const DS_MOTIFS = [
  { id:'paisley', hi:'पैस्ली / आम', en:'Paisley (Aam)' },
  { id:'floral',  hi:'फूल बूटी',   en:'Floral Booti' },
  { id:'bandhani',hi:'बांधनी',     en:'Bandhani Dots' },
  { id:'block',   hi:'ब्लॉक प्रिंट',en:'Block Print' },
  { id:'stripes', hi:'धारियाँ',    en:'Stripes' },
  { id:'checks',  hi:'चेक',        en:'Checks' },
  { id:'dots',    hi:'बिंदी',      en:'Polka Dots' },
  { id:'chevron', hi:'ज़िगज़ैग',   en:'Chevron' },
];

/* ============================================================
   INIT (called once when the Design view is first opened)
   ============================================================ */
function initDesignStudio(){
  if (DS.ready) return;
  DS.canvas = document.getElementById('dsCanvas');
  if (!DS.canvas) return;
  DS.ctx = DS.canvas.getContext('2d');
  DS.canvas.width = DS.size; DS.canvas.height = DS.size;

  buildDSPalettes();
  buildDSMotifs();
  // initial palette
  applyDSPalette('haldi', false);
  DS.ready = true;
  renderPattern();
  updateGarmentInfo();
  // load three.js lazily
  loadThree().then(()=>{ DS.threeLoaded = true; });
}

/* ---------- build palette + motif chips ---------- */
function buildDSPalettes(){
  const wrap = document.getElementById('dsPalettes');
  if (!wrap) return;
  wrap.innerHTML = Object.entries(DS_PALETTES).map(([id,p])=>(
    `<button class="ds-swatch" data-pal="${id}" onclick="applyDSPalette('${id}')" title="${p.label.en}">
       <span class="ds-swatch-dots">
         <i style="background:${p.bg}"></i><i style="background:${p.fg}"></i><i style="background:${p.accent}"></i>
       </span>
       <span class="ds-swatch-label"><span class="hi-only">${p.label.hi}</span><span class="en-only">${p.label.en}</span></span>
     </button>`
  )).join('');
}

function buildDSMotifs(){
  const wrap = document.getElementById('dsMotifs');
  if (!wrap) return;
  wrap.innerHTML = DS_MOTIFS.map(m=>(
    `<button class="ds-chip${m.id===DS.motif?' active':''}" data-motif="${m.id}" onclick="setDSMotif('${m.id}')">
       <span class="hi-only">${m.hi}</span><span class="en-only">${m.en}</span>
     </button>`
  )).join('');
}

/* ============================================================
   PATTERN STATE SETTERS
   ============================================================ */
function applyDSPalette(id, render=true){
  const p = DS_PALETTES[id]; if(!p) return;
  DS.bg=p.bg; DS.fg=p.fg; DS.accent=p.accent;
  document.querySelectorAll('#dsPalettes .ds-swatch').forEach(b=>b.classList.toggle('active', b.dataset.pal===id));
  const bgI=document.getElementById('dsBg'), fgI=document.getElementById('dsFg'), acI=document.getElementById('dsAccent');
  if(bgI) bgI.value=p.bg; if(fgI) fgI.value=p.fg; if(acI) acI.value=p.accent;
  if(render) renderPattern();
}
function setDSColor(which,val){
  if(which==='bg')DS.bg=val; else if(which==='fg')DS.fg=val; else DS.accent=val;
  document.querySelectorAll('#dsPalettes .ds-swatch').forEach(b=>b.classList.remove('active'));
  renderPattern();
}
function setDSMotif(id){
  DS.motif=id;
  document.querySelectorAll('#dsMotifs .ds-chip').forEach(b=>b.classList.toggle('active', b.dataset.motif===id));
  renderPattern();
}
function setDSDensity(v){ DS.density=+v; const o=document.getElementById('dsDensityVal'); if(o)o.textContent=v; renderPattern(); }
function setDSScale(v){ DS.scale=+v; const o=document.getElementById('dsScaleVal'); if(o)o.textContent=(+v).toFixed(1)+'×'; renderPattern(); }
function setDSRotation(v){ DS.rotation=+v; const o=document.getElementById('dsRotVal'); if(o)o.textContent=v+'°'; renderPattern(); }

/* ============================================================
   2D PATTERN RENDERER (procedural, tileable repeat)
   ============================================================ */
function renderPattern(){
  if(!DS.ctx) return;
  const ctx=DS.ctx, S=DS.size;
  ctx.save(); ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,S,S);
  // background
  ctx.fillStyle=DS.bg; ctx.fillRect(0,0,S,S);

  const n=DS.density;
  const cell=S/n;
  ctx.lineCap='round'; ctx.lineJoin='round';

  for(let r=0;r<n;r++){
    for(let c=0;c<n;c++){
      const cx=c*cell+cell/2, cy=r*cell+cell/2;
      ctx.save();
      ctx.translate(cx,cy);
      ctx.rotate((DS.rotation*Math.PI)/180);
      const s=(cell*0.42)*DS.scale;
      drawMotif(ctx, DS.motif, s, (r+c)%2===0?DS.fg:DS.accent, r, c);
      ctx.restore();
    }
  }
  ctx.restore();
  // refresh 3D texture + insights
  if(DS.mesh) updateThreeTexture();
  updateInsights();
}

function drawMotif(ctx, motif, s, color, r, c){
  ctx.fillStyle=color; ctx.strokeStyle=color; ctx.lineWidth=Math.max(2,s*0.10);
  switch(motif){
    case 'paisley': {
      // teardrop with curled tail
      ctx.beginPath();
      ctx.moveTo(0,-s);
      ctx.bezierCurveTo(s*0.9,-s*0.7, s*0.8,s*0.6, 0,s);
      ctx.bezierCurveTo(-s*0.5,s*0.7, -s*0.7,-s*0.2, 0,-s);
      ctx.fill();
      ctx.fillStyle=DS.bg;
      ctx.beginPath(); ctx.arc(0,-s*0.2, s*0.32, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle=color;
      ctx.beginPath(); ctx.arc(0,-s*0.2, s*0.14, 0, Math.PI*2); ctx.fill();
      break;
    }
    case 'floral': {
      const petals=6;
      for(let i=0;i<petals;i++){
        ctx.save(); ctx.rotate((i/petals)*Math.PI*2);
        ctx.beginPath(); ctx.ellipse(0,-s*0.55,s*0.22,s*0.5,0,0,Math.PI*2); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle=DS.accent===color?DS.fg:DS.accent;
      ctx.beginPath(); ctx.arc(0,0,s*0.28,0,Math.PI*2); ctx.fill();
      break;
    }
    case 'bandhani': {
      // ring of small reserved dots
      for(let i=0;i<8;i++){
        const a=(i/8)*Math.PI*2;
        ctx.beginPath(); ctx.arc(Math.cos(a)*s*0.55, Math.sin(a)*s*0.55, s*0.10,0,Math.PI*2); ctx.fill();
      }
      ctx.beginPath(); ctx.arc(0,0,s*0.16,0,Math.PI*2); ctx.fill();
      break;
    }
    case 'block': {
      // geometric block-print diamond
      ctx.beginPath();
      ctx.moveTo(0,-s); ctx.lineTo(s,0); ctx.lineTo(0,s); ctx.lineTo(-s,0); ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0,-s*0.5); ctx.lineTo(s*0.5,0); ctx.lineTo(0,s*0.5); ctx.lineTo(-s*0.5,0); ctx.closePath();
      ctx.fill();
      break;
    }
    case 'stripes': {
      ctx.lineWidth=s*0.35;
      ctx.beginPath(); ctx.moveTo(-s*1.4,-s); ctx.lineTo(s*1.4,-s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s*1.4,s*0.2); ctx.lineTo(s*1.4,s*0.2); ctx.stroke();
      break;
    }
    case 'checks': {
      ctx.fillRect(-s,-s,s,s); ctx.fillRect(0,0,s,s);
      break;
    }
    case 'dots': {
      ctx.beginPath(); ctx.arc(0,0,s*0.55,0,Math.PI*2); ctx.fill();
      break;
    }
    case 'chevron': {
      ctx.lineWidth=s*0.22;
      ctx.beginPath();
      ctx.moveTo(-s,s*0.4); ctx.lineTo(0,-s*0.4); ctx.lineTo(s,s*0.4); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s,s); ctx.lineTo(0,s*0.2); ctx.lineTo(s,s); ctx.stroke();
      break;
    }
  }
}

/* ---------- randomise / undo / download ---------- */
function randomiseDS(){
  const pals=Object.keys(DS_PALETTES);
  const motifs=DS_MOTIFS.map(m=>m.id);
  applyDSPalette(pals[Math.floor(Math.random()*pals.length)], false);
  setDSMotif(motifs[Math.floor(Math.random()*motifs.length)]);
  setDSDensity(3+Math.floor(Math.random()*5));
  document.getElementById('dsDensity').value=DS.density;
  setDSRotation(Math.floor(Math.random()*4)*15);
  document.getElementById('dsRot').value=DS.rotation;
  renderPattern();
}

function downloadDS(){
  const a=document.createElement('a');
  a.download='silai-seekho-design.png';
  a.href=DS.canvas.toDataURL('image/png');
  a.click();
}

/* ============================================================
   3D DRAPE PREVIEW  (Three.js, lazy CDN load)
   ============================================================ */
function loadThree(){
  if(window.THREE) return Promise.resolve();
  if(DS._threePromise) return DS._threePromise;
  DS._threePromise = new Promise((res,rej)=>{
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
    s.onload=()=>res(); s.onerror=()=>rej(new Error('three load failed'));
    document.head.appendChild(s);
  });
  return DS._threePromise;
}

async function init3D(){
  const host=document.getElementById('ds3d');
  if(!host) return;
  try{ await loadThree(); }catch(e){
    host.innerHTML='<p class="ds-3d-fallback"><span class="hi-only">3D लोड नहीं हो सका — 2D डिज़ाइन ऊपर देखें।</span><span class="en-only">3D could not load — see the 2D design above.</span></p>';
    return;
  }
  const THREE=window.THREE;
  if(DS.renderer){ resize3D(); return; } // already built

  const w=host.clientWidth||400, h=host.clientHeight||340;
  DS.scene=new THREE.Scene();
  DS.scene.background=new THREE.Color(0xfdf8f2);
  DS.cam=new THREE.PerspectiveCamera(45, w/h, 0.1, 100);
  DS.cam.position.set(0,0.3,3.8);
  DS.renderer=new THREE.WebGLRenderer({antialias:true});
  DS.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  DS.renderer.setSize(w,h);
  host.innerHTML=''; host.appendChild(DS.renderer.domElement);

  // lights
  DS.scene.add(new THREE.AmbientLight(0xffffff,0.7));
  const dir=new THREE.DirectionalLight(0xffffff,0.9); dir.position.set(2,3,4); DS.scene.add(dir);
  const fill=new THREE.DirectionalLight(0xffeedd,0.3); fill.position.set(-2,1,-2); DS.scene.add(fill);

  DS.three=THREE;
  buildMannequin();

  // drag-to-rotate the mannequin group
  let down=false,lx=0,ly=0;
  const el=DS.renderer.domElement;
  el.style.cursor='grab';
  el.addEventListener('pointerdown',e=>{down=true;lx=e.clientX;ly=e.clientY;el.style.cursor='grabbing';DS.anim=false;});
  window.addEventListener('pointerup',()=>{down=false;el.style.cursor='grab';});
  window.addEventListener('pointermove',e=>{
    if(!down||!DS.mannequin)return;
    DS.mannequin.rotation.y+=(e.clientX-lx)*0.01;
    DS.mannequin.rotation.x+=(e.clientY-ly)*0.005;
    lx=e.clientX;ly=e.clientY;
  });

  window.addEventListener('resize',resize3D);
  animate3D();
}

function updateThreeTexture(){
  if(DS.mesh && DS.mesh.material.map){ DS.mesh.material.map.needsUpdate=true; }
}
function resize3D(){
  const host=document.getElementById('ds3d'); if(!host||!DS.renderer)return;
  const w=host.clientWidth||400,h=host.clientHeight||340;
  DS.cam.aspect=w/h; DS.cam.updateProjectionMatrix(); DS.renderer.setSize(w,h);
}
function animate3D(){
  DS.raf=requestAnimationFrame(animate3D);
  if(DS.anim && DS.mannequin) DS.mannequin.rotation.y+=0.004;
  if(DS.renderer) DS.renderer.render(DS.scene,DS.cam);
}
function toggleDSAnim(){ DS.anim=!DS.anim; const b=document.getElementById('dsAnimBtn'); if(b)b.classList.toggle('active',DS.anim); }

/* ============================================================
   REPLICATION INSIGHTS — how to make this design on real fabric
   ============================================================ */
function updateInsights(){
  const el=document.getElementById('dsInsights'); if(!el) return;
  const motif=DS_MOTIFS.find(m=>m.id===DS.motif)||{hi:'',en:''};
  const repeatCm=Math.round((30/DS.density)*10)/10;       // repeat tile ~ across a 30cm width
  const stitchCount=Math.round((DS.density*DS.density));
  const method = DS_REPLICATION[DS.motif] || DS_REPLICATION.default;

  el.innerHTML = `
    <div class="ds-insight-grid">
      <div class="ds-insight-stat"><b>${repeatCm} cm</b><span class="hi-only">रिपीट आकार</span><span class="en-only">Repeat size</span></div>
      <div class="ds-insight-stat"><b>${stitchCount}</b><span class="hi-only">प्रति टाइल मोटिफ</span><span class="en-only">Motifs / tile</span></div>
      <div class="ds-insight-stat"><b>${method.colors}</b><span class="hi-only">रंग / स्क्रीन</span><span class="en-only">Colours / screens</span></div>
    </div>
    <h5>🖐️ <span class="hi-only">${method.title.hi}</span><span class="en-only">${method.title.en}</span></h5>
    <ol class="ds-steps">
      ${method.steps.map(s=>`<li><span class="hi-only">${s.hi}</span><span class="en-only">${s.en}</span></li>`).join('')}
    </ol>
    <p class="ds-tip">💡 <span class="hi-only">${method.tip.hi}</span><span class="en-only">${method.tip.en}</span></p>`;
}

const DS_REPLICATION = {
  default: {
    colors:'2–3',
    title:{hi:'हाथ की कढ़ाई / प्रिंट',en:'Hand embroidery / print'},
    steps:[
      {hi:'डिज़ाइन को ट्रेसिंग पेपर पर उतारें और कपड़े पर चॉक से अंकित करें।',en:'Trace the design onto tracing paper and chalk it onto the fabric.'},
      {hi:'रिपीट को कपड़े की चौड़ाई के अनुसार दोहराएँ।',en:'Repeat the tile across the fabric width to keep alignment.'},
      {hi:'मुख्य रंग पहले भरें, फिर विवरण जोड़ें।',en:'Fill the main colour first, then add detail colours.'},
    ],
    tip:{hi:'पहले स्क्रैप कपड़े पर परीक्षण करें।',en:'Always test on a fabric scrap first.'},
  },
  block:{
    colors:'1–4',
    title:{hi:'ब्लॉक प्रिंटिंग (हाथ-ब्लॉक)',en:'Hand block printing'},
    steps:[
      {hi:'लकड़ी/लिनोलियम पर मोटिफ खोदकर ब्लॉक बनवाएँ — हर रंग के लिए अलग ब्लॉक।',en:'Carve a wooden/lino block per colour with the motif.'},
      {hi:'कपड़े को टेबल पर कसकर पिन करें; रंग को पैड पर फैलाएँ।',en:'Pin fabric taut on a padded table; spread dye on a pad.'},
      {hi:'ब्लॉक को पैड में डुबोकर ग्रिड में दबाएँ — रजिस्ट्रेशन डॉट्स से संरेखित रखें।',en:'Dip block, stamp in a grid, aligning by registration dots.'},
      {hi:'सुखाएँ और भाप/धूप से रंग पक्का करें।',en:'Dry and fix the dye with steam or sunlight.'},
    ],
    tip:{hi:'रजिस्ट्रेशन के लिए ब्लॉक के कोनों पर छोटे निशान बनाएँ।',en:'Add corner pitch marks on the block for clean registration.'},
  },
  bandhani:{
    colors:'2–3',
    title:{hi:'बांधनी (टाई-डाई)',en:'Bandhani tie-dye'},
    steps:[
      {hi:'डॉट ग्रिड को कपड़े पर अंकित करें।',en:'Mark the dot grid onto the fabric.'},
      {hi:'हर डॉट पर कपड़ा उठाकर मज़बूत धागे से कसकर बाँधें।',en:'Pinch each dot and bind tightly with thread.'},
      {hi:'सबसे हल्के रंग में पहले रंगें, फिर गहरे रंग में।',en:'Dye lightest colour first, then darker shades.'},
      {hi:'धागे खोलकर सुखाएँ — रिज़र्व डॉट्स उभर आएँगे।',en:'Untie and dry — reserved dots reveal the pattern.'},
    ],
    tip:{hi:'गांठें जितनी कसी, डॉट उतने साफ़।',en:'Tighter knots give crisper reserved dots.'},
  },
  paisley:{
    colors:'3–5',
    title:{hi:'ज़री/रेशम कढ़ाई (आरी/ज़रदोज़ी)',en:'Zari / silk embroidery (aari)'},
    steps:[
      {hi:'कपड़े को कढ़ाई फ्रेम में कसें और पैस्ली आउटलाइन ट्रेस करें।',en:'Frame the fabric and trace the paisley outline.'},
      {hi:'चेन-स्टिच (आरी) से आउटलाइन भरें।',en:'Fill the outline with chain stitch using an aari hook.'},
      {hi:'भीतर सैटिन-स्टिच और ज़री से भराई करें।',en:'Fill interiors with satin stitch and zari thread.'},
      {hi:'मनके/सेक्विन से केंद्र सजाएँ।',en:'Embellish the centre with beads or sequins.'},
    ],
    tip:{hi:'धागे का तनाव एक समान रखें ताकि कपड़ा सिकुड़े नहीं।',en:'Keep even thread tension so the cloth does not pucker.'},
  },
  floral:{
    colors:'3–4',
    title:{hi:'स्क्रीन प्रिंट / कढ़ाई',en:'Screen print / embroidery'},
    steps:[
      {hi:'हर रंग के लिए अलग स्क्रीन तैयार करें।',en:'Prepare one screen per colour layer.'},
      {hi:'कपड़े पर स्क्रीन रखें, स्क्वीजी से रंग खींचें।',en:'Place screen on fabric, pull ink with a squeegee.'},
      {hi:'रंग सूखने के बाद अगली स्क्रीन संरेखित करें।',en:'Let each colour dry before aligning the next screen.'},
    ],
    tip:{hi:'फूल के केंद्र को आख़िर में प्रिंट करें।',en:'Print flower centres last for clean overlap.'},
  },
  stripes:{ colors:'2', title:{hi:'बुनाई / प्रिंट धारियाँ',en:'Woven or printed stripes'},
    steps:[
      {hi:'ताने (warp) में रंगीन धागे क्रम से लगाएँ।',en:'Arrange coloured yarns in the warp in sequence.'},
      {hi:'या मास्किंग टेप से धारियाँ मास्क करके रंग लगाएँ।',en:'Or mask stripes with tape and apply dye.'},
    ],
    tip:{hi:'धारी की चौड़ाई = रिपीट ÷ रंगों की संख्या।',en:'Stripe width = repeat ÷ number of colours.'} },
  checks:{ colors:'2–3', title:{hi:'चेक बुनाई',en:'Checked weave'},
    steps:[
      {hi:'ताने और बाने दोनों में एक जैसा रंग-क्रम रखें।',en:'Use the same colour sequence in warp and weft.'},
      {hi:'सादी बुनाई से वर्ग बनते हैं।',en:'A plain weave forms the check squares.'},
    ],
    tip:{hi:'बराबर चेक के लिए धागों की गिनती समान रखें।',en:'Equal yarn counts give even checks.'} },
  dots:{ colors:'2', title:{hi:'पोल्का डॉट प्रिंट',en:'Polka-dot print'},
    steps:[
      {hi:'गोल स्टैम्प/स्क्रीन से समान दूरी पर डॉट छापें।',en:'Stamp evenly spaced dots with a round stamp/screen.'},
    ],
    tip:{hi:'डॉट का व्यास = सेल ÷ 2 रखें।',en:'Keep dot diameter ≈ half the cell for balance.'} },
  chevron:{ colors:'2', title:{hi:'ज़िगज़ैग प्रिंट/बुनाई',en:'Chevron print/weave'},
    steps:[
      {hi:'V-आकार स्टेंसिल बनाएँ और पंक्तियों में दोहराएँ।',en:'Cut a V stencil and repeat it row by row.'},
    ],
    tip:{hi:'पंक्तियों के बीच की दूरी समान रखें।',en:'Keep equal spacing between zigzag rows.'} },
};

/* ============================================================
   GARMENT DATA — measurements (inches), cutting pieces, stitching steps
   ============================================================ */
const DS_GARMENTS = {
  blouse: {
    hi:'ब्लाउज़', en:'Blouse', icon:'🥻',
    cols:['Bust','Waist','Length','Sleeve','Fabric Needed'],
    sizes:{
      XS:{bust:30,waist:24,length:13,sleeve:6,fabric:'0.75m'},
      S: {bust:32,waist:26,length:14,sleeve:7,fabric:'0.75m'},
      M: {bust:34,waist:28,length:15,sleeve:8,fabric:'1m'},
      L: {bust:36,waist:30,length:16,sleeve:9,fabric:'1m'},
      XL:{bust:38,waist:32,length:17,sleeve:10,fabric:'1.25m'},
    },
    pieces:{hi:['फ्रंट बॉडिस × 1 (fold पर)','बैक बॉडिस × 2','स्लीव × 2','नेकलाइन फेसिंग × 1'],
            en:['Front Bodice × 1 (on fold)','Back Bodice × 2','Sleeve × 2','Neckline Facing × 1']},
    stitching:[
      {hi:'फ्रंट व बैक के कंधे की सीमें जोड़ें।',en:'Join front & back at shoulder seams.'},
      {hi:'बस्ट डार्ट और कमर डार्ट सिलें।',en:'Stitch bust darts and waist darts.'},
      {hi:'स्लीव को ease के साथ आर्महोल में लगाएं।',en:'Set sleeves into the armhole with ease.'},
      {hi:'साइड सीम + स्लीव सीम एक साथ सिलें।',en:'Sew side seams and sleeve seams in one run.'},
      {hi:'नेकलाइन फेसिंग लगाएं; नीचे का किनारा हेम करें।',en:'Attach neckline facing; hem the bottom edge.'},
      {hi:'हुक-आई या ज़िप लगाएं।',en:'Attach hook-and-eye or zipper at back.'},
    ],
    tip:{hi:'छाती पर 2–3 सेमी ease ज़रूरी है।',en:'Allow 2–3 cm ease at the bust.'},
  },
  kurta:{
    hi:'कुर्ता', en:'Kurta', icon:'👘',
    cols:['Chest','Waist','Length','Sleeve','Fabric Needed'],
    sizes:{
      XS:{chest:34,waist:30,length:38,sleeve:22,fabric:'2.5m'},
      S: {chest:36,waist:32,length:40,sleeve:23,fabric:'2.5m'},
      M: {chest:38,waist:34,length:42,sleeve:23.5,fabric:'2.75m'},
      L: {chest:40,waist:36,length:44,sleeve:24,fabric:'3m'},
      XL:{chest:42,waist:38,length:46,sleeve:24.5,fabric:'3m'},
    },
    pieces:{hi:['फ्रंट × 1 (fold पर)','बैक × 1 (fold पर)','स्लीव × 2','कॉलर/नेकबैंड × 1'],
            en:['Front × 1 (on fold)','Back × 1 (on fold)','Sleeve × 2','Collar/Neckband × 1']},
    stitching:[
      {hi:'फ्रंट और बैक के कंधे जोड़ें।',en:'Join front and back at shoulders.'},
      {hi:'नेकलाइन काटें और नेकबैंड लगाएं।',en:'Cut neckline and attach neckband.'},
      {hi:'स्लीव आर्महोल में set करें।',en:'Set sleeves into armholes.'},
      {hi:'साइड सीम और स्लीव सीम सिलें।',en:'Sew side seams and sleeve seams.'},
      {hi:'फ्रंट प्लैकेट और बटन लगाएं।',en:'Stitch front placket and attach buttons.'},
      {hi:'नीचे का किनारा हेम करें।',en:'Hem the bottom edge.'},
    ],
    tip:{hi:'कुर्ते में chest पर 4–5 सेमी ease रखें।',en:'Allow 4–5 cm ease at the chest for a kurta.'},
  },
  salwar:{
    hi:'सलवार', en:'Salwar', icon:'👗',
    cols:['Waist','Hip','Crotch Depth','Inseam','Fabric Needed'],
    sizes:{
      XS:{waist:24,hip:34,crotch:10,inseam:36,fabric:'2m'},
      S: {waist:26,hip:36,crotch:10.5,inseam:37,fabric:'2m'},
      M: {waist:28,hip:38,crotch:11,inseam:38,fabric:'2.25m'},
      L: {waist:30,hip:40,crotch:11.5,inseam:39,fabric:'2.25m'},
      XL:{waist:32,hip:42,crotch:12,inseam:40,fabric:'2.5m'},
    },
    pieces:{hi:['आगे का पैनल × 2','पीछे का पैनल × 2','नाड़े की पट्टी × 1'],
            en:['Front panel × 2','Back panel × 2','Waistband drawstring strip × 1']},
    stitching:[
      {hi:'आगे के दोनों पैनल इनसीम पर जोड़ें।',en:'Join front panels at inseam.'},
      {hi:'पीछे के पैनल इनसीम पर जोड़ें।',en:'Join back panels at inseam.'},
      {hi:'आगे + पीछे को crotch सीम से जोड़ें।',en:'Join front & back at crotch seam.'},
      {hi:'साइड सीमें सिलें।',en:'Sew side seams.'},
      {hi:'कमर पर नाड़े की पट्टी fold करके सिलें।',en:'Fold and sew waistband, leaving drawstring opening.'},
      {hi:'टखनों पर हेम करें।',en:'Hem the ankles.'},
    ],
    tip:{hi:'सलवार में crotch पर 2–3 सेमी ease ज़रूरी है।',en:'Allow 2–3 cm ease at the crotch.'},
  },
  shirt:{
    hi:'शर्ट', en:'Shirt', icon:'👔',
    cols:['Chest','Waist','Length','Sleeve','Fabric Needed'],
    sizes:{
      XS:{chest:34,waist:30,length:27,sleeve:23,fabric:'1.5m'},
      S: {chest:36,waist:32,length:28,sleeve:24,fabric:'1.5m'},
      M: {chest:38,waist:34,length:29,sleeve:24.5,fabric:'1.75m'},
      L: {chest:40,waist:36,length:30,sleeve:25,fabric:'1.75m'},
      XL:{chest:42,waist:38,length:31,sleeve:25.5,fabric:'2m'},
    },
    pieces:{hi:['फ्रंट × 2','बैक × 1','स्लीव × 2','कॉलर × 2 (ऊपर+नीचे)','कॉलर स्टैंड × 2','कफ × 4'],
            en:['Front × 2','Back × 1 (on fold)','Sleeve × 2','Collar × 2 (top+under)','Collar stand × 2','Cuff × 4']},
    stitching:[
      {hi:'फ्रंट प्लैकेट सिलें (दोनों तरफ)।',en:'Sew front plackets on both fronts.'},
      {hi:'फ्रंट + बैक के कंधे जोड़ें।',en:'Join front and back at shoulders.'},
      {hi:'कॉलर स्टैंड के साथ कॉलर तैयार करें और नेकलाइन पर लगाएं।',en:'Construct collar with stand and attach to neckline.'},
      {hi:'स्लीव को आर्महोल में ease के साथ लगाएं।',en:'Set sleeves into armholes with ease.'},
      {hi:'साइड सीम और स्लीव सीम एक साथ सिलें।',en:'Sew side and sleeve seams in one run.'},
      {hi:'कफ तैयार करके स्लीव के निचले सिरे पर लगाएं।',en:'Construct cuffs and attach to sleeve openings.'},
      {hi:'हेम और बटन लगाएं।',en:'Hem and attach buttons.'},
    ],
    tip:{hi:'कॉलर को iron करके ही लगाएं — crisp edge बेहतर दिखता है।',en:'Always press the collar before attaching for crisp edges.'},
  },
  dress:{
    hi:'ड्रेस', en:'Dress', icon:'👗',
    cols:['Bust','Waist','Hip','Length','Fabric Needed'],
    sizes:{
      XS:{bust:30,waist:24,hip:32,length:38,fabric:'2.5m'},
      S: {bust:32,waist:26,hip:34,length:40,fabric:'2.5m'},
      M: {bust:34,waist:28,hip:36,length:42,fabric:'2.75m'},
      L: {bust:36,waist:30,hip:38,length:44,fabric:'3m'},
      XL:{bust:38,waist:32,hip:40,length:46,fabric:'3m'},
    },
    pieces:{hi:['फ्रंट बॉडिस × 1','बैक बॉडिस × 2','फ्रंट स्कर्ट × 1','बैक स्कर्ट × 2','स्लीव × 2 (ऑप्शनल)'],
            en:['Front Bodice × 1','Back Bodice × 2','Front Skirt × 1','Back Skirt × 2','Sleeve × 2 (optional)']},
    stitching:[
      {hi:'बॉडिस के कंधे और साइड सीम सिलें।',en:'Sew bodice shoulder and side seams.'},
      {hi:'डार्ट सिलें।',en:'Stitch darts.'},
      {hi:'स्कर्ट के साइड सीम सिलें।',en:'Sew skirt side seams.'},
      {hi:'बॉडिस और स्कर्ट को कमर पर जोड़ें।',en:'Join bodice and skirt at the waist seam.'},
      {hi:'ज़िप या हुक लगाएं।',en:'Insert zipper or hooks.'},
      {hi:'नेकलाइन/आर्महोल फिनिश करें और हेम करें।',en:'Finish neckline/armhole and hem.'},
    ],
    tip:{hi:'waist seam press करके सिलें — join सटीक रहेगा।',en:'Press the waist seam before joining for a clean join.'},
  },
  tshirt:{
    hi:'टी-शर्ट', en:'T-Shirt', icon:'👕',
    cols:['Chest','Waist','Length','Sleeve','Fabric Needed'],
    sizes:{
      XS:{chest:32,waist:28,length:26,sleeve:7,fabric:'1m'},
      S: {chest:34,waist:30,length:27,sleeve:7.5,fabric:'1m'},
      M: {chest:36,waist:32,length:28,sleeve:8,fabric:'1.25m'},
      L: {chest:38,waist:34,length:29,sleeve:8.5,fabric:'1.25m'},
      XL:{chest:40,waist:36,length:30,sleeve:9,fabric:'1.5m'},
    },
    pieces:{hi:['फ्रंट × 1 (fold पर)','बैक × 1 (fold पर)','स्लीव × 2','नेकबैंड × 1'],
            en:['Front × 1 (on fold)','Back × 1 (on fold)','Sleeve × 2','Neckband ribbing × 1']},
    stitching:[
      {hi:'फ्रंट + बैक के कंधे जोड़ें।',en:'Join front and back at shoulders.'},
      {hi:'नेकबैंड (ribbing) नेकलाइन पर सिलें।',en:'Attach ribbing neckband to the neckline.'},
      {hi:'स्लीव को flat method से आर्महोल में लगाएं।',en:'Attach sleeves using the flat method before sewing side seams.'},
      {hi:'साइड और स्लीव सीम एक साथ सिलें।',en:'Sew side and sleeve seams in one run.'},
      {hi:'नीचे और स्लीव के किनारे double-fold hem से सिलें।',en:'Double-fold hem the bottom and sleeve hems.'},
    ],
    tip:{hi:'jersey/knit कपड़े के लिए बॉलपॉइंट सुई और stretch stitch इस्तेमाल करें।',en:'Use a ballpoint needle and stretch stitch for jersey/knit fabrics.'},
  },
  pants:{
    hi:'पैंट', en:'Pants', icon:'👖',
    cols:['Waist','Hip','Inseam','Rise','Fabric Needed'],
    sizes:{
      XS:{waist:26,hip:34,inseam:28,rise:10,fabric:'1.75m'},
      S: {waist:28,hip:36,inseam:29,rise:10.5,fabric:'1.75m'},
      M: {waist:30,hip:38,inseam:30,rise:11,fabric:'2m'},
      L: {waist:32,hip:40,inseam:31,rise:11.5,fabric:'2m'},
      XL:{waist:34,hip:42,inseam:32,rise:12,fabric:'2.25m'},
    },
    pieces:{hi:['आगे का पैनल × 2','पीछे का पैनल × 2','वेस्टबैंड × 1','पॉकेट बैग × 4 (ऑप्शनल)'],
            en:['Front panel × 2','Back panel × 2','Waistband × 1','Pocket bags × 4 (optional)']},
    stitching:[
      {hi:'आगे के पैनल पर पॉकेट बनाएं।',en:'Construct pockets on front panels.'},
      {hi:'आगे के पैनल crotch सीम पर जोड़ें।',en:'Join front panels at crotch seam.'},
      {hi:'पीछे के पैनल crotch सीम पर जोड़ें।',en:'Join back panels at crotch seam.'},
      {hi:'साइड सीमें सिलें।',en:'Sew side seams.'},
      {hi:'इनसीम एक साथ सिलें (एक लंबी सीम)।',en:'Sew inseam in one long seam.'},
      {hi:'वेस्टबैंड और ज़िप लगाएं।',en:'Attach waistband and insert zipper.'},
      {hi:'पैर के किनारे हेम करें।',en:'Hem the leg openings.'},
    ],
    tip:{hi:'crotch curve को notch करके ही press करें — नहीं तो twist होगा।',en:'Notch the crotch curve before pressing to prevent twisting.'},
  },
};

/* ============================================================
   GARMENT SELECTOR — state setters + info renderer
   ============================================================ */
function setDSGarment(type){
  DS.garmentType=type;
  document.querySelectorAll('[data-garment]').forEach(b=>b.classList.toggle('active',b.dataset.garment===type));
  updateGarmentInfo();
  rebuildMannequin();
}
function setDSGender(gender){
  DS.gender=gender;
  document.querySelectorAll('[data-gender]').forEach(b=>b.classList.toggle('active',b.dataset.gender===gender));
  rebuildMannequin();
}
function setDSSize(size){
  DS.garmentSize=size;
  document.querySelectorAll('[data-size]').forEach(b=>b.classList.toggle('active',b.dataset.size===size));
  updateGarmentInfo();
}

function updateGarmentInfo(){
  const el=document.getElementById('dsGarmentInfo'); if(!el) return;
  const g=DS_GARMENTS[DS.garmentType]; if(!g) return;
  const sz=g.sizes[DS.garmentSize]||g.sizes['M'];
  const cols=g.cols||[];

  // Measurement table
  const thCells=cols.map(c=>`<th>${c}</th>`).join('');
  const vals=Object.values(sz);
  const tdCells=vals.map((v,i)=>`<td>${v}${i<vals.length-1?'″':''}</td>`).join('');

  // Cutting pieces
  const piecesHi=(g.pieces.hi||[]).map(p=>`<li>${p}</li>`).join('');
  const piecesEn=(g.pieces.en||[]).map(p=>`<li>${p}</li>`).join('');

  // Stitching steps
  const stitchHtml=(g.stitching||[]).map((s,i)=>`
    <div class="ds-stitch-step">
      <span class="ds-stitch-num">${i+1}</span>
      <span><span class="hi-only">${s.hi}</span><span class="en-only">${s.en}</span></span>
    </div>`).join('');

  el.innerHTML=`
    <h4>${g.icon} <span class="hi-only">${g.hi} — ${DS.garmentSize} साइज़</span><span class="en-only">${g.en} — Size ${DS.garmentSize}</span></h4>
    <h5 style="font-size:var(--text-sm);color:var(--color-text-muted);margin:0 0 var(--space-3)">
      <span class="hi-only">📐 मानक नाप (इंच में)</span><span class="en-only">📐 Standard Measurements (inches)</span>
    </h5>
    <table class="ds-size-table">
      <thead><tr>${thCells}</tr></thead>
      <tbody><tr>${tdCells}</tr></tbody>
    </table>
    <h5 style="font-size:var(--text-sm);color:var(--color-text-muted);margin:var(--space-4) 0 var(--space-2)">
      <span class="hi-only">✂️ कटाई के पीस</span><span class="en-only">✂️ Cutting Pieces</span>
    </h5>
    <ul class="ds-cutting-list hi-only">${piecesHi}</ul>
    <ul class="ds-cutting-list en-only">${piecesEn}</ul>
    <h5 style="font-size:var(--text-sm);color:var(--color-text-muted);margin:var(--space-4) 0 var(--space-2)">
      <span class="hi-only">🧵 सिलाई के चरण</span><span class="en-only">🧵 Stitching Steps</span>
    </h5>
    <div class="ds-stitch-steps">${stitchHtml}</div>
    <p class="ds-tip" style="margin-top:var(--space-4)">💡 <span class="hi-only">${g.tip.hi}</span><span class="en-only">${g.tip.en}</span></p>`;
}

/* ============================================================
   3D MANNEQUIN — simple LatheGeometry torso + garment drape
   ============================================================ */
function rebuildMannequin(){
  if(!DS.threeLoaded||!DS.scene) return;
  // Remove old mannequin group if present
  if(DS.mannequin){ DS.scene.remove(DS.mannequin); DS.mannequin=null; }
  buildMannequin();
}

function buildMannequin(){
  if(!DS.three||!DS.scene) return;
  const THREE=DS.three;
  const isFemale=DS.gender==='female';
  const sz=DS.garmentSize||'S';
  // Scale factor by size (XS=0.88, S=0.94, M=1.0, L=1.06, XL=1.12)
  const scaleMap={XS:0.88,S:0.94,M:1.0,L:1.06,XL:1.12};
  const sc=scaleMap[sz]||1.0;

  // Lathe profile: [radius, y] pairs bottom to top (head at top)
  // Female profile
  const femalePoints=[
    [0.08,0],[0.09,0.05],[0.15,0.12],[0.18,0.22],  // legs/thighs
    [0.22,0.35],[0.20,0.42],                         // hip
    [0.16,0.52],[0.15,0.56],                         // waist
    [0.20,0.63],[0.22,0.70],                         // bust
    [0.18,0.78],[0.14,0.84],                         // shoulders/neck
    [0.07,0.88],[0.07,0.96],                         // neck
    [0.12,1.00],[0.10,1.06],[0.04,1.10],            // head
  ];
  // Male profile (broader shoulders, less waist curve)
  const malePoints=[
    [0.09,0],[0.10,0.05],[0.16,0.12],[0.18,0.22],
    [0.20,0.35],[0.18,0.44],
    [0.17,0.52],[0.16,0.56],
    [0.22,0.63],[0.25,0.70],
    [0.24,0.78],[0.15,0.84],
    [0.07,0.88],[0.07,0.96],
    [0.12,1.00],[0.10,1.06],[0.04,1.10],
  ];
  const pts=(isFemale?femalePoints:malePoints).map(([r,y])=>new THREE.Vector2(r*sc,(y-0.55)*2.2*sc));
  const geo=new THREE.LatheGeometry(pts,32);

  // Skin-tone material for the mannequin base
  const mat=new THREE.MeshStandardMaterial({color:0xd4a574,roughness:0.8,metalness:0.0,side:THREE.FrontSide});
  const mesh=new THREE.Mesh(geo,mat);
  mesh.rotation.x=0;

  DS.mannequin=new THREE.Group();
  DS.mannequin.add(mesh);

  // Add a thin garment "shell" slightly inflated
  const garmentScale=1.04;
  const garmentPts=pts.map(v=>new THREE.Vector2(v.x*garmentScale,v.y));
  const gGeo=new THREE.LatheGeometry(garmentPts,32);
  const tex=new THREE.CanvasTexture(DS.canvas);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(2,3);
  const gMat=new THREE.MeshStandardMaterial({map:tex,side:THREE.DoubleSide,roughness:0.75,metalness:0.0,transparent:true,opacity:0.92});
  const gMesh=new THREE.Mesh(gGeo,gMat);
  DS.mannequin.add(gMesh);
  DS.mesh=gMesh; // keep DS.mesh pointing to garment for texture updates

  DS.scene.add(DS.mannequin);
}

/* expose for inline handlers */
window.initDesignStudio=initDesignStudio;
window.applyDSPalette=applyDSPalette;
window.setDSColor=setDSColor;
window.setDSMotif=setDSMotif;
window.setDSDensity=setDSDensity;
window.setDSScale=setDSScale;
window.setDSRotation=setDSRotation;
window.randomiseDS=randomiseDS;
window.downloadDS=downloadDS;
window.init3D=init3D;
window.toggleDSAnim=toggleDSAnim;
window.setDSGarment=setDSGarment;
window.setDSGender=setDSGender;
window.setDSSize=setDSSize;

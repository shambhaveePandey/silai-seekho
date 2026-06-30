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
  { id:'lotus',   hi:'कमल',        en:'Lotus' },
  { id:'trellis', hi:'जाली',       en:'Trellis' },
  { id:'wave',    hi:'लहर',        en:'Wave' },
  { id:'leaf',    hi:'पत्ती',      en:'Leaf' },
  { id:'cross',   hi:'क्रॉस',      en:'Cross' },
  { id:'hex',     hi:'षट्भुज',     en:'Hexagon' },
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
    case 'lotus': {
      for(let i=0;i<4;i++){ ctx.save(); ctx.rotate(i*Math.PI/2);
        ctx.beginPath(); ctx.ellipse(0,-s*0.55,s*0.22,s*0.5,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }
      const pf=ctx.fillStyle; ctx.fillStyle='rgba(255,255,255,.45)';
      ctx.beginPath(); ctx.arc(0,0,s*0.22,0,Math.PI*2); ctx.fill(); ctx.fillStyle=pf;
      break;
    }
    case 'trellis': {
      ctx.lineWidth=s*0.09;
      for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++){
        ctx.beginPath();
        ctx.moveTo(dx*s+s*0.5,dy*s); ctx.lineTo(dx*s,dy*s-s*0.5);
        ctx.lineTo(dx*s-s*0.5,dy*s); ctx.lineTo(dx*s,dy*s+s*0.5); ctx.closePath(); ctx.stroke();
      }
      break;
    }
    case 'wave': {
      ctx.lineWidth=s*0.14;
      for(let row=-1;row<=1;row++){
        ctx.beginPath(); ctx.moveTo(-s,row*s*0.55);
        ctx.bezierCurveTo(-s*0.4,-s*0.3+row*s*0.55, s*0.4,s*0.3+row*s*0.55, s,row*s*0.55);
        ctx.stroke();
      }
      break;
    }
    case 'leaf': {
      ctx.beginPath();
      ctx.moveTo(0,-s); ctx.bezierCurveTo(s*0.8,-s*0.5, s*0.8,s*0.5, 0,s);
      ctx.bezierCurveTo(-s*0.8,s*0.5, -s*0.8,-s*0.5, 0,-s); ctx.fill();
      const sv=ctx.strokeStyle; ctx.strokeStyle='rgba(255,255,255,.4)'; ctx.lineWidth=s*0.07;
      ctx.beginPath(); ctx.moveTo(0,-s*0.8); ctx.lineTo(0,s*0.8); ctx.stroke(); ctx.strokeStyle=sv;
      break;
    }
    case 'cross': {
      const arm=s*0.32; ctx.fillRect(-arm,-s,arm*2,s*2); ctx.fillRect(-s,-arm,s*2,arm*2);
      break;
    }
    case 'hex': {
      ctx.beginPath();
      for(let i=0;i<6;i++){ const a=i*Math.PI/3-Math.PI/6;
        i===0?ctx.moveTo(Math.cos(a)*s,Math.sin(a)*s):ctx.lineTo(Math.cos(a)*s,Math.sin(a)*s); }
      ctx.closePath(); ctx.fill();
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
  setDSDensity(3+Math.floor(Math.random()*7));
  document.getElementById('dsDensity').value=DS.density;
  setDSRotation(Math.floor(Math.random()*7)*15);
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

  const dark=document.documentElement.getAttribute('data-theme')==='dark';
  const w=host.clientWidth||400, h=host.clientHeight||340;
  DS.scene=new THREE.Scene();
  DS.scene.background=new THREE.Color(dark?0x18100e:0xd8c8ba);
  DS.cam=new THREE.PerspectiveCamera(40, w/h, 0.1, 100);
  DS.cam.position.set(0,0.3,4.5);
  DS.cam.lookAt(0,0.3,0);
  DS.renderer=new THREE.WebGLRenderer({antialias:true});
  DS.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  DS.renderer.setSize(w,h);
  host.innerHTML=''; host.appendChild(DS.renderer.domElement);

  // 3-point studio lighting
  DS.scene.add(new THREE.AmbientLight(0xfff5ea,0.5));
  const key=new THREE.DirectionalLight(0xfff0e0,1.1); key.position.set(2,4,3); DS.scene.add(key);
  const fill=new THREE.DirectionalLight(0xddeeff,0.45); fill.position.set(-3,1,1); DS.scene.add(fill);
  const rim=new THREE.DirectionalLight(0xffddcc,0.5); rim.position.set(0,3,-4); DS.scene.add(rim);
  // ground disc under the figure
  const disc=new THREE.Mesh(new THREE.CircleGeometry(0.9,40),
    new THREE.MeshStandardMaterial({color:dark?0x2a1820:0xc4b0a0,roughness:0.95}));
  disc.rotation.x=-Math.PI/2; disc.position.y=-1.28; DS.scene.add(disc);

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
    hi:'ब्लाउज़', en:'Blouse', icon:'🥻', band:{yMin:.55,yMax:.88},
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
    hi:'कुर्ता', en:'Kurta', icon:'👘', band:{yMin:.26,yMax:.88},
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
    hi:'सलवार', en:'Salwar', icon:'👗', band:{yMin:.0,yMax:.52},
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
    hi:'शर्ट', en:'Shirt', icon:'👔', band:{yMin:.40,yMax:.88},
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
    hi:'ड्रेस', en:'Dress', icon:'👗', band:{yMin:.20,yMax:.88},
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
    hi:'टी-शर्ट', en:'T-Shirt', icon:'👕', band:{yMin:.42,yMax:.88},
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
    hi:'पैंट', en:'Pants', icon:'👖', band:{yMin:.0,yMax:.52},
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
  kurti:{
    hi:'कुर्ती', en:'Kurti', icon:'👘', band:{yMin:.28,yMax:.88},
    cols:['Chest','Waist','Length','Sleeve','Fabric Needed'],
    sizes:{
      XS:{chest:32,waist:28,length:34,sleeve:18,fabric:'2m'},
      S: {chest:34,waist:30,length:36,sleeve:18.5,fabric:'2m'},
      M: {chest:36,waist:32,length:38,sleeve:19,fabric:'2.25m'},
      L: {chest:38,waist:34,length:40,sleeve:19.5,fabric:'2.5m'},
      XL:{chest:40,waist:36,length:42,sleeve:20,fabric:'2.5m'},
    },
    pieces:{hi:['फ्रंट × 1 (fold पर)','बैक × 1 (fold पर)','स्लीव × 2','नेकबैंड × 1'],
            en:['Front × 1 (on fold)','Back × 1 (on fold)','Sleeve × 2','Neckband × 1']},
    stitching:[
      {hi:'फ्रंट और बैक के कंधे जोड़ें।',en:'Join front and back at shoulders.'},
      {hi:'नेकबैंड लगाएं।',en:'Attach the neckband.'},
      {hi:'स्लीव आर्महोल में set करें।',en:'Set sleeves into armholes.'},
      {hi:'साइड और स्लीव सीम सिलें।',en:'Sew side and sleeve seams.'},
      {hi:'नीचे का किनारा हेम करें।',en:'Hem the bottom edge.'},
    ],
    tip:{hi:'साइड स्लिट को साफ हेम करें — कुर्ती का लुक निखरता है।',en:'Finish the side slits neatly for a crisp kurti look.'},
  },
  lehenga:{
    hi:'लहंगा', en:'Lehenga', icon:'👗', band:{yMin:.0,yMax:.52},
    cols:['Waist','Hip','Length','Flare','Fabric Needed'],
    sizes:{
      XS:{waist:26,hip:36,length:38,flare:'3m',fabric:'3.5m'},
      S: {waist:28,hip:38,length:40,flare:'3.2m',fabric:'3.5m'},
      M: {waist:30,hip:40,length:41,flare:'3.5m',fabric:'4m'},
      L: {waist:32,hip:42,length:42,flare:'3.8m',fabric:'4m'},
      XL:{waist:34,hip:44,length:43,flare:'4m',fabric:'4.5m'},
    },
    pieces:{hi:['स्कर्ट पैनल × 8','वेस्टबैंड × 1','लाइनिंग × 1'],
            en:['Skirt panel × 8','Waistband × 1','Lining × 1']},
    stitching:[
      {hi:'8 स्कर्ट पैनल जोड़ें।',en:'Join the 8 skirt panels.'},
      {hi:'कमर पर gather करके वेस्टबैंड लगाएं।',en:'Gather to the waistband.'},
      {hi:'लाइनिंग लगाएं।',en:'Attach the lining.'},
      {hi:'साइड ज़िप लगाएं।',en:'Insert the side zip.'},
      {hi:'horsehair braid से हेम करें।',en:'Hem with horsehair braid for body.'},
    ],
    tip:{hi:'flare के लिए कली (gore) पैनल बायस पर काटें।',en:'Cut gore panels on the bias for fuller flare.'},
  },
  anarkali:{
    hi:'अनारकली', en:'Anarkali', icon:'🥻', band:{yMin:.0,yMax:.88},
    cols:['Bust','Waist','Length','Flare','Fabric Needed'],
    sizes:{
      XS:{bust:32,waist:26,length:50,flare:'4m',fabric:'4m'},
      S: {bust:34,waist:28,length:52,flare:'4.5m',fabric:'4m'},
      M: {bust:36,waist:30,length:54,flare:'5m',fabric:'4.5m'},
      L: {bust:38,waist:32,length:55,flare:'5.5m',fabric:'4.5m'},
      XL:{bust:40,waist:34,length:56,flare:'6m',fabric:'5m'},
    },
    pieces:{hi:['बॉडिस फ्रंट × 1 (fold पर)','बॉडिस बैक × 2','फ्लेयर पैनल × 12','स्लीव × 2'],
            en:['Bodice Front × 1 (on fold)','Bodice Back × 2','Flare panel × 12','Sleeve × 2']},
    stitching:[
      {hi:'फिटेड बॉडिस तैयार करें।',en:'Construct the fitted bodice.'},
      {hi:'12 फ्लेयर पैनल जोड़ें।',en:'Join the 12 flare panels.'},
      {hi:'फ्लेयर को बॉडिस से gather करके जोड़ें।',en:'Gather flare to the bodice.'},
      {hi:'स्लीव set करें।',en:'Set the sleeves.'},
      {hi:'लंबी फ्लेयर हेम करें।',en:'Hem the long flare.'},
    ],
    tip:{hi:'बॉडिस–फ्लेयर सीम पर ज़रूर press करें।',en:'Press the bodice-to-flare seam well for a clean fall.'},
  },
  skirt:{
    hi:'स्कर्ट', en:'Skirt', icon:'🩱', band:{yMin:.0,yMax:.52},
    cols:['Waist','Hip','Length','Fabric Needed'],
    sizes:{
      XS:{waist:24,hip:34,length:22,fabric:'1.25m'},
      S: {waist:26,hip:36,length:23,fabric:'1.25m'},
      M: {waist:28,hip:38,length:24,fabric:'1.5m'},
      L: {waist:30,hip:40,length:25,fabric:'1.5m'},
      XL:{waist:32,hip:42,length:26,fabric:'1.75m'},
    },
    pieces:{hi:['फ्रंट पैनल × 1 (fold पर)','बैक पैनल × 2','वेस्टबैंड × 1'],
            en:['Front panel × 1 (on fold)','Back panel × 2','Waistband × 1']},
    stitching:[
      {hi:'साइड सीमें सिलें।',en:'Sew the side seams.'},
      {hi:'ज़िप लगाएं।',en:'Insert the zip.'},
      {hi:'वेस्टबैंड लगाएं।',en:'Attach the waistband.'},
      {hi:'हेम करें।',en:'Hem the bottom.'},
      {hi:'हुक क्लोज़र लगाएं।',en:'Add the hook closure.'},
    ],
    tip:{hi:'darts को waist की तरफ press करें।',en:'Press the darts toward the centre for a smooth waist.'},
  },
  sharara:{
    hi:'शरारा', en:'Sharara', icon:'👗', band:{yMin:.0,yMax:.52},
    cols:['Waist','Hip','Length','Flare','Fabric Needed'],
    sizes:{
      XS:{waist:26,hip:36,length:38,flare:'2.5m',fabric:'3m'},
      S: {waist:28,hip:38,length:39,flare:'2.7m',fabric:'3m'},
      M: {waist:30,hip:40,length:40,flare:'3m',fabric:'3.25m'},
      L: {waist:32,hip:42,length:41,flare:'3.2m',fabric:'3.5m'},
      XL:{waist:34,hip:44,length:42,flare:'3.5m',fabric:'3.5m'},
    },
    pieces:{hi:['टॉप योक × 2','फ्लेयर पैनल × 8','वेस्टबैंड × 1'],
            en:['Top yoke × 2','Flare panel × 8','Waistband × 1']},
    stitching:[
      {hi:'योक के टुकड़े जोड़ें।',en:'Join the yoke pieces.'},
      {hi:'फ्लेयर पैनल लगाएं।',en:'Attach the flared panels.'},
      {hi:'कमर पर gather करें।',en:'Gather to the waistband.'},
      {hi:'साइड ज़िप लगाएं।',en:'Insert the side zip.'},
      {hi:'चौड़ी फ्लेयर हेम करें।',en:'Hem the wide flare.'},
    ],
    tip:{hi:'घुटने पर योक सीम रखें — असली शरारा सिल्हूट यहीं से बनता है।',en:'Place the yoke seam at the knee — that defines the sharara silhouette.'},
  },
  jacket:{
    hi:'जैकेट', en:'Jacket', icon:'🧥', band:{yMin:.52,yMax:.88},
    cols:['Chest','Waist','Length','Sleeve','Fabric Needed'],
    sizes:{
      XS:{chest:36,waist:32,length:25,sleeve:23,fabric:'2m'},
      S: {chest:38,waist:34,length:26,sleeve:23.5,fabric:'2m'},
      M: {chest:40,waist:36,length:27,sleeve:24,fabric:'2.25m'},
      L: {chest:42,waist:38,length:28,sleeve:24.5,fabric:'2.25m'},
      XL:{chest:44,waist:40,length:29,sleeve:25,fabric:'2.5m'},
    },
    pieces:{hi:['फ्रंट × 2','बैक × 1 (fold पर)','स्लीव × 2','कॉलर × 2','लाइनिंग × 3'],
            en:['Front × 2','Back × 1 (on fold)','Sleeve × 2','Collar × 2','Lining × 3']},
    stitching:[
      {hi:'शेल और लाइनिंग तैयार करें।',en:'Construct the shell and lining.'},
      {hi:'कॉलर लगाएं।',en:'Attach the collar.'},
      {hi:'स्लीव set करें।',en:'Set the sleeves.'},
      {hi:'साइड और स्लीव सीम सिलें।',en:'Sew side and sleeve seams.'},
      {hi:'लाइनिंग bag-out करें।',en:'Bag out the lining.'},
      {hi:'बटन और टॉपस्टिच लगाएं।',en:'Add buttons and topstitch.'},
    ],
    tip:{hi:'कॉलर और lapel को रोल press करें — flat नहीं।',en:'Roll-press the collar and lapel rather than flattening them.'},
  },
  saree:{
    hi:'साड़ी', en:'Saree Drape', icon:'🥻', band:{yMin:.0,yMax:.88},
    cols:['Length','Width','Pallu','Blouse','Fabric Needed'],
    sizes:{
      XS:{length:'5.5m',width:'1.1m',pallu:'0.9m',blouse:'0.8m',fabric:'5.5m'},
      S: {length:'5.5m',width:'1.1m',pallu:'0.9m',blouse:'0.8m',fabric:'5.5m'},
      M: {length:'5.5m',width:'1.15m',pallu:'1m',blouse:'0.9m',fabric:'5.5m'},
      L: {length:'6m',width:'1.15m',pallu:'1m',blouse:'0.9m',fabric:'6m'},
      XL:{length:'6m',width:'1.2m',pallu:'1.1m',blouse:'1m',fabric:'6m'},
    },
    pieces:{hi:['साड़ी बॉडी × 1','पल्लू × 1','बॉर्डर × 2','ब्लाउज़ पीस × 1'],
            en:['Saree body × 1','Pallu × 1','Border × 2','Blouse piece × 1']},
    stitching:[
      {hi:'कच्चे किनारे फिनिश करें।',en:'Finish the raw edges.'},
      {hi:'हेम पर fall लगाएं।',en:'Attach the fall to the hem.'},
      {hi:'पल्लू को pico edge करें।',en:'Pico-edge the pallu.'},
      {hi:'बॉर्डर पक्का करें।',en:'Secure the border.'},
      {hi:'pleat करके निवी शैली में drape करें।',en:'Pleat and drape in the Nivi style.'},
    ],
    tip:{hi:'fall को साड़ी के रंग से मिलाएं — drape भारी और साफ गिरती है।',en:'Match the fall to the saree colour so the drape falls cleanly.'},
  },
};

/* Extend every garment with an XXL size (scaled up from XL) so the
   6-size selector and 3D measurement labels stay consistent. */
Object.values(DS_GARMENTS).forEach(g=>{
  if(g.sizes && g.sizes.XL && !g.sizes.XXL){
    const xl=g.sizes.XL, xxl={};
    for(const k in xl){
      const v=xl[k];
      xxl[k]=(typeof v==='number') ? Math.round((v+2)*10)/10 : v;
    }
    g.sizes.XXL=xxl;
  }
});

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
  rebuildMannequin();
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
   3D MANNEQUIN — parametric human figure + garment drape band
   Per-gender body profiles, 6 sizes, head/hair/arms + measurement
   label sprites. The selected garment is built only across its own
   body band ([yMin,yMax]) and textured with the live 2D pattern.
   ============================================================ */

// Body silhouette profiles: [radius, y] points, feet (y=0) → crown (y~1.10)
const DS_PROFILES = {
  female:[[.08,0],[.09,.05],[.15,.12],[.18,.22],[.22,.35],[.20,.42],[.16,.52],[.15,.56],[.20,.63],[.22,.70],[.18,.78],[.14,.84],[.07,.88],[.07,.96],[.12,1.0],[.10,1.06],[.04,1.10]],
  male:  [[.09,0],[.10,.05],[.16,.12],[.18,.22],[.20,.35],[.18,.44],[.17,.52],[.16,.56],[.22,.63],[.25,.70],[.24,.78],[.15,.84],[.07,.88],[.07,.96],[.12,1.0],[.10,1.06],[.04,1.10]],
  child: [[.06,0],[.07,.05],[.11,.12],[.13,.22],[.16,.35],[.15,.42],[.12,.52],[.11,.56],[.14,.63],[.16,.70],[.14,.78],[.11,.84],[.06,.88],[.06,.96],[.11,1.0],[.09,1.06],[.04,1.10]],
};
const DS_SIZE_SCALE = { XS:.88, S:.94, M:1.0, L:1.06, XL:1.12, XXL:1.18 };
// Body measurements [bust, waist, hip] in inches, per gender + size
const DS_BODY = {
  female:{XS:[32,24,34],S:[34,26,36],M:[36,28,38],L:[38,30,40],XL:[40,32,42],XXL:[42,34,44]},
  male:  {XS:[34,28,34],S:[36,30,36],M:[38,32,38],L:[40,34,40],XL:[42,36,42],XXL:[44,38,44]},
  child: {XS:[24,22,26],S:[26,23,28],M:[28,24,30],L:[30,25,32],XL:[32,26,34],XXL:[34,27,36]},
};

function rebuildMannequin(){
  if(!DS.threeLoaded||!DS.scene) return;
  if(DS.mannequin){ DS.scene.remove(DS.mannequin); DS.mannequin=null; DS.mesh=null; }
  buildMannequin();
}

function buildMannequin(){
  if(!DS.three||!DS.scene) return;
  const THREE=DS.three;
  const gender=DS.gender, sz=DS.garmentSize||'S';
  const prof=DS_PROFILES[gender]||DS_PROFILES.female;
  const sc=DS_SIZE_SCALE[sz]||1.0, SC=2.2*sc;

  // Skin / hair palette per gender
  const C={
    female:{skin:0xd4987a,hair:0x1a0808},
    male:  {skin:0xb87856,hair:0x100606},
    child: {skin:0xe0b090,hair:0x3a2010},
  }[gender]||{skin:0xd4987a,hair:0x1a0808};
  const sM=new THREE.MeshStandardMaterial({color:C.skin,roughness:.72,metalness:.03});
  const hM=new THREE.MeshStandardMaterial({color:C.hair,roughness:.88,metalness:0});

  const group=new THREE.Group();

  // Body base (torso + legs) up to the neckline
  const bPts=prof.filter(([,y])=>y<=.90).map(([r,y])=>new THREE.Vector2(r*sc,(y-.55)*SC));
  group.add(new THREE.Mesh(new THREE.LatheGeometry(bPts,32),sM));

  // Neck
  const nY=(0.88-.55)*SC, nH=.065*SC, nR=.05*sc;
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(nR,nR*1.1,nH,12),sM);
  neck.position.y=nY+nH/2; group.add(neck);

  // Head
  const hY=nY+nH+0.115*SC;
  const hRx=0.105*sc, hRy=0.118*sc, hRz=0.11*sc;
  const headGeo=new THREE.SphereGeometry(1,22,18); headGeo.scale(hRx,hRy,hRz);
  const head=new THREE.Mesh(headGeo,sM.clone()); head.position.y=hY; group.add(head);

  // Hair (per gender)
  if(gender==='female'){
    const cap=new THREE.SphereGeometry(1,16,12,0,Math.PI*2,0,Math.PI*.62); cap.scale(hRx*1.04,hRy*1.04,hRz*1.04);
    const capM=new THREE.Mesh(cap,hM); capM.position.y=hY; group.add(capM);
    const tail=new THREE.Mesh(new THREE.CylinderGeometry(hRx*.38,hRx*.18,.3*SC,10),hM);
    tail.position.set(0,hY-.19*SC,-hRz*.5); group.add(tail);
  } else if(gender==='male'){
    const cap=new THREE.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI*.44); cap.scale(hRx*1.03,hRy*1.03,hRz*1.03);
    const capM=new THREE.Mesh(cap,hM); capM.position.y=hY; group.add(capM);
  } else {
    const cap=new THREE.SphereGeometry(1,16,10,0,Math.PI*2,0,Math.PI*.58); cap.scale(hRx*1.05,hRy*1.05,hRz*1.05);
    const capM=new THREE.Mesh(cap,hM); capM.position.y=hY; group.add(capM);
  }

  // Eyes
  const eM=new THREE.MeshStandardMaterial({color:0x100608,roughness:.5});
  for(const sx of [-1,1]){ const em=new THREE.Mesh(new THREE.SphereGeometry(.016*SC,8,8),eM);
    em.position.set(sx*hRx*.44,hY+hRy*.08,hRz*.87); group.add(em); }

  // Arms (upper + lower + hand)
  const shW=(gender==='male'?.22:gender==='female'?.18:.14)*sc;
  const shY=(0.78-.55)*SC, aR=.038*sc, aL=(gender==='child'?.3:.38)*SC;
  for(const sx of [-1,1]){
    const ua=new THREE.Mesh(new THREE.CylinderGeometry(aR,aR*1.1,aL*.52,10),sM); ua.rotation.z=sx*Math.PI*.08; ua.position.set(sx*(shW+aL*.15),shY-aL*.26,0); group.add(ua);
    const la=new THREE.Mesh(new THREE.CylinderGeometry(aR*.85,aR,aL*.44,10),sM); la.rotation.z=sx*Math.PI*.1; la.position.set(sx*(shW+aL*.3),shY-aL*.73,0); group.add(la);
    const hd=new THREE.Mesh(new THREE.SphereGeometry(aR*1.05,8,8),sM); hd.position.set(sx*(shW+aL*.4),shY-aL*.99,0); group.add(hd);
  }

  // Garment — built only across its own body band, textured with the 2D pattern
  const gDef=DS_GARMENTS[DS.garmentType];
  const band=(gDef&&gDef.band)||{yMin:.40,yMax:.88};
  const interp=yT=>{ for(let i=0;i<prof.length-1;i++){ const [r0,y0]=prof[i],[r1,y1]=prof[i+1];
    if((y0<=yT&&y1>=yT)||(y0>=yT&&y1<=yT)){ const t=(yT-y0)/(y1-y0||1); return [r0+(r1-r0)*t,yT]; } } return null; };
  let gPts=prof.filter(([,y])=>y>band.yMin&&y<band.yMax);
  const tb=interp(band.yMax), bb=interp(band.yMin);
  if(tb)gPts=[...gPts,tb]; if(bb)gPts=[bb,...gPts];
  gPts.sort((a,b)=>a[1]-b[1]);
  if(gPts.length>=2){
    const gV=gPts.map(([r,y])=>new THREE.Vector2(r*sc*1.06,(y-.55)*SC));
    const tex=new THREE.CanvasTexture(DS.canvas);
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(2,3);
    const gMat=new THREE.MeshStandardMaterial({map:tex,side:THREE.DoubleSide,roughness:.62,metalness:0,transparent:true,opacity:.94});
    const gMesh=new THREE.Mesh(new THREE.LatheGeometry(gV,32),gMat);
    group.add(gMesh);
    DS.mesh=gMesh; // texture-update target

    // Measurement label sprites (Bust / Waist / Hip)
    const body=DS_BODY[gender]?.[sz]||[36,28,38];
    [{t:`Bust ${body[0]}"`,y:(0.68-.55)*SC},{t:`Waist ${body[1]}"`,y:0},{t:`Hip ${body[2]}"`,y:(0.38-.55)*SC}].forEach(({t,y})=>{
      const lc=document.createElement('canvas'); lc.width=140; lc.height=32;
      const lx=lc.getContext('2d');
      lx.fillStyle='rgba(200,104,90,.88)';
      if(lx.roundRect){ lx.beginPath(); lx.roundRect(0,0,140,32,6); lx.fill(); } else lx.fillRect(0,0,140,32);
      lx.fillStyle='#fff'; lx.font='bold 14px Work Sans,sans-serif'; lx.textBaseline='middle'; lx.fillText(t,10,16);
      const lt=new THREE.CanvasTexture(lc);
      const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:lt,transparent:true}));
      sp.position.set(-.8,y,0); sp.scale.set(.55,.13,1); group.add(sp);
      const lineGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.53,y,0),new THREE.Vector3(.05*sc,y,0)]);
      group.add(new THREE.Line(lineGeo,new THREE.LineBasicMaterial({color:0xc8685a,opacity:.5,transparent:true})));
    });
  }

  DS.mannequin=group;
  DS.scene.add(group);
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

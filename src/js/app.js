// ── STATE ─────────────────────────────────────────────────
let currentChapter = 0;
let score = 0;
let chapDone = [false,false,false,false,false,false];
let currentLang = 'hi';
let dragData = null;
let matchScore = 0;

const CHAPTERS = 6;

// ── LANG ──────────────────────────────────────────────────
function setLang(l){
  currentLang = l;
  document.body.setAttribute('data-lang', l==='bi'?'bi':l);
  ['langHi','langBi','langEn'].forEach(id=>document.getElementById(id).classList.remove('active'));
  document.getElementById(l==='bi'?'langBi':l==='en'?'langEn':'langHi').classList.add('active');
  if(l==='bi') document.body.removeAttribute('data-lang');
  else document.body.setAttribute('data-lang',l);
}

// ── THEME ─────────────────────────────────────────────────
(function(){
  const btn=document.getElementById('themeBtn');
  const html=document.documentElement;
  let dark = matchMedia('(prefers-color-scheme:dark)').matches;
  html.setAttribute('data-theme', dark?'dark':'light');
  btn.textContent = dark ? '☀️' : '🌙';
  btn.addEventListener('click',()=>{
    dark=!dark; html.setAttribute('data-theme',dark?'dark':'light');
    btn.textContent=dark?'☀️':'🌙';
  });
})();

// ── CHAPTER NAV ───────────────────────────────────────────
function goChapter(n){
  document.querySelectorAll('.chapter-section').forEach(s=>s.classList.remove('active'));
  document.getElementById('ch-'+n).classList.add('active');
  document.querySelectorAll('.chapter-pill').forEach((p,i)=>{
    p.classList.toggle('active',i===n);
  });
  currentChapter=n;
  startChapter(n);
  window.scrollTo({top:0,behavior:'smooth'});
}

function startChapter(n){
  // enable options
  const opts=document.getElementById('opts-'+n);
  if(opts) opts.querySelectorAll('.option-btn').forEach(b=>{
    b.disabled=false; b.classList.remove('correct','wrong');
    b.querySelector('.option-result-icon').style.opacity='0';
  });
  const fb=document.getElementById('fb-'+n);
  if(fb){fb.className='feedback';fb.style.display='';}
  // reset fill
  ['fill-warp','fill-warp-en','fill-warp-en2'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){el.value='';el.classList.remove('correct-input','wrong-input');}
  });
  ['fb-fill-1','fb-fill-2'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){el.className='feedback';el.style.display='';}
  });
}

// ── QUIZ CHECK ────────────────────────────────────────────
const feedbackData = {
  0:{
    correct:{hi:'बिल्कुल सही! चॉक या फैब्रिक मार्कर कपड़े पर निशान लगाने के लिए इस्तेमाल होता है।',en:'Correct! Chalk or fabric marker is used to mark cutting lines on fabric.'},
    wrong:{hi:'गलत — चॉक (Chalk) सही जवाब है। चॉक से कपड़े पर लाइन खींची जाती है।',en:'Wrong — Chalk is the correct answer. It is used to draw cutting lines.'}
  },
  1:{
    correct:{hi:'बिल्कुल सही! सूती कपड़ा धोने, काटने और सिलने में सबसे आसान है।',en:'Correct! Cotton is the easiest fabric to wash, cut, and stitch for beginners.'},
    wrong:{hi:'गलत — सूती (Cotton) शुरुआती दर्जियों के लिए सबसे उपयुक्त है।',en:'Wrong — Cotton is best for beginners as it is easy to handle.'}
  },
  3:{
    correct:{hi:'एकदम सही! पैर से पेडल दबाने पर बेल्ट के ज़रिए पहिया घूमता है — बिजली की ज़रूरत नहीं।',en:'Exactly right! The foot pedal drives a belt that turns the wheel mechanically.'},
    wrong:{hi:'गलत — पैर-चालित मशीन में सिर्फ पैर की ताकत से काम होता है।',en:'Wrong — a treadle machine is entirely human-powered via the foot pedal.'}
  },
  4:{
    correct:{hi:'सही! डार्ट कपड़े में एक मोड़ बनाता है जो गारमेंट को शरीर की आकृति देता है।',en:'Correct! A dart is a folded tuck that shapes the garment to fit the body contours.'},
    wrong:{hi:'गलत — डार्ट का काम है शरीर के अनुसार कपड़े को आकार देना।',en:'Wrong — a dart shapes the garment to fit body curves.'}
  }
};

function checkQ(chap, result, optsId, fbId, vizId, vizClass){
  const opts=document.getElementById(optsId);
  opts.querySelectorAll('.option-btn').forEach(b=>b.disabled=true);
  const clicked = event.currentTarget;
  clicked.classList.add(result);
  // feedback
  const fb=document.getElementById(fbId);
  const data=feedbackData[chap]?.[result];
  if(fb && data){
    fb.innerHTML=`<span class="feedback-icon">${result==='correct'?'✅':'❌'}</span>
      <div class="feedback-text">
        <strong class="hi-only">${result==='correct'?'शाबाश!':'दोबारा सोचें!'}</strong>
        <strong class="en-only">${result==='correct'?'Well done!':'Try again!'}</strong>
        <p class="hi-only">${data.hi}</p>
        <p class="en-only">${data.en}</p>
      </div>`;
    fb.className=`feedback show ${result==='correct'?'correct-fb':'wrong-fb'}`;
    fb.style.display='';
  }
  // visual zone update
  updateViz(vizId, result==='correct');
  // xp star
  if(result==='correct'){
    spawnStar(event.clientX, event.clientY);
    if(!chapDone[chap]){
      score++;
      chapDone[chap]=true;
      updateProgress();
      markChapterDone(chap);
    }
  }
}

function updateViz(vizId, correct){
  const viz=document.getElementById(vizId);
  if(!viz) return;
  viz.classList.remove('viz-correct','viz-wrong');
  viz.classList.add(correct?'viz-correct':'viz-wrong');
  // animate border
  viz.style.borderColor = correct ? 'var(--color-success)' : 'var(--color-error)';
  setTimeout(()=>{ viz.style.borderColor=''; viz.classList.remove('viz-correct','viz-wrong'); }, 2000);
  // fabric highlight on ch1
  if(vizId==='viz-1'){
    const ids=['fab-cotton','fab-silk','fab-georgette','fab-poly'];
    ids.forEach(id=>{const el=document.getElementById(id);if(el)el.style.filter='';});
    const target = correct ? 'fab-cotton' : null;
    if(target){
      const el=document.getElementById(target);
      if(el){el.style.filter='drop-shadow(0 0 8px var(--color-success))';}
    }
  }
}

// ── FILL IN BLANK ─────────────────────────────────────────
function checkFill(inputId, answer, fbId){
  const inp=document.getElementById(inputId);
  const fb=document.getElementById(fbId);
  if(!inp||!fb) return;
  const val=inp.value.trim().toLowerCase();
  if(val===answer.toLowerCase()){
    inp.classList.add('correct-input'); inp.classList.remove('wrong-input');
    fb.innerHTML=`<span class="feedback-icon">✅</span><div class="feedback-text"><strong>सही!</strong> <p>${answer}</p></div>`;
    fb.className='feedback show correct-fb'; fb.style.display='';
    spawnStar(inp.getBoundingClientRect().left+60, inp.getBoundingClientRect().top);
    if(!chapDone[2]){score++;chapDone[2]=true;updateProgress();markChapterDone(2);}
  } else if(val.length>=answer.length){
    inp.classList.add('wrong-input'); inp.classList.remove('correct-input');
    fb.innerHTML=`<span class="feedback-icon">❌</span><div class="feedback-text"><strong>गलत</strong><p>सही जवाब: ${answer}</p></div>`;
    fb.className='feedback show wrong-fb'; fb.style.display='';
  }
}

// ── HOTSPOT ───────────────────────────────────────────────
const hotspotData = {
  1:{hi:'सुई (Needle) — धागा इसी से गुज़रता है',en:'Needle — thread passes through its eye'},
  2:{hi:'प्रेसर फुट (Presser Foot) — कपड़े को थामता है',en:'Presser Foot — holds fabric in place'},
  3:{hi:'फीड डॉग (Feed Dog) — कपड़े को आगे खींचता है',en:'Feed Dog — advances fabric under the needle'},
  4:{hi:'हैंडव्हील (Handwheel) — सुई को ऊपर-नीचे करता है',en:'Handwheel — raises and lowers the needle'},
  5:{hi:'थ्रेड स्टैंड (Thread Stand) — धागे की रील रखता है',en:'Thread Stand — holds the thread reel/bobbin'},
  6:{hi:'पेडल (Treadle Pedal) — पैर से दबाकर मशीन चलाएं',en:'Treadle Pedal — press with foot to run the machine'}
};
let activeHotspot=null;

function showHotspot(btn, num){
  document.querySelectorAll('.hotspot-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  activeHotspot=num;
  const info=document.getElementById('hotspot-info');
  const d=hotspotData[num];
  info.innerHTML=`<span class="hi"><strong>${num}.</strong> ${d.hi}</span><br><em>${d.en}</em>`;
  const tt=btn.querySelector('.hotspot-tooltip');
  if(tt) tt.textContent=num+'. '+d.en.split('—')[0].trim();
  if(!chapDone[3]&&num===6){score++;chapDone[3]=true;updateProgress();markChapterDone(3);}
}

// ── DRAG & DROP ───────────────────────────────────────────
function dragStart(e){
  dragData=e.target.dataset.val;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed='move';
}
function dragOver(e){e.preventDefault();e.currentTarget.classList.add('drag-over');}
function dragLeave(e){e.currentTarget.classList.remove('drag-over');}
function drop(e){
  e.preventDefault();
  const zone=e.currentTarget;
  zone.classList.remove('drag-over');
  const accept=zone.dataset.accept;
  const card=document.getElementById('drag-'+dragData);
  if(dragData===accept){
    zone.innerHTML=card.outerHTML.replace('draggable="true"','draggable="false"');
    zone.classList.add('filled');
    card.style.opacity='0.3'; card.draggable=false;
    card.classList.add('matched');
    matchScore++;
    spawnStar(zone.getBoundingClientRect().left+60, zone.getBoundingClientRect().top+20);
    if(matchScore===4){
      const fb=document.getElementById('fb-match');
      fb.innerHTML=`<span class="feedback-icon">🎊</span><div class="feedback-text"><strong class="hi-only">शाबाश! सभी नाप सही मिलाए!</strong><strong class="en-only">Excellent! All measurements matched!</strong></div>`;
      fb.className='feedback show correct-fb'; fb.style.display='flex';
      if(!chapDone[5]){score++;chapDone[5]=true;updateProgress();markChapterDone(5);}
    }
  } else {
    zone.style.borderColor='var(--color-error)';
    setTimeout(()=>zone.style.borderColor='',800);
  }
  if(card) card.classList.remove('dragging');
}
function resetMatch(){
  matchScore=0;
  document.getElementById('drag-col').querySelectorAll('.match-card').forEach(c=>{
    c.draggable=true;c.style.opacity='';c.classList.remove('matched','dragging');
  });
  document.getElementById('drop-col').querySelectorAll('.match-drop').forEach(z=>{
    z.classList.remove('filled','drag-over');z.style.borderColor='';
    const accept=z.dataset.accept;
    const labels={chest:'Bust / Chest (छाती)',waist:'Waist (कमर)',hip:'Hip (कूल्हा)',shoulder:'Shoulder (कंधा)'};
    z.textContent=labels[accept]||'';
  });
  const fb=document.getElementById('fb-match');
  if(fb){fb.style.display='none';}
}

// ── CONCEPT CARD TOGGLE ───────────────────────────────────
function toggleCard(card){card.classList.toggle('open');}

// ── PROGRESS ──────────────────────────────────────────────
function updateProgress(){
  const pct = Math.round((score/CHAPTERS)*100);
  document.getElementById('progressBar').style.width=pct+'%';
  document.getElementById('progressLabel').textContent=`${score} / ${CHAPTERS} पाठ पूरे हुए · ${score} / ${CHAPTERS} completed`;
}
function markChapterDone(n){
  const pill=document.getElementById('cpill-'+n);
  if(pill) pill.classList.add('done');
}

// ── XP STAR ───────────────────────────────────────────────
function spawnStar(x,y){
  const s=document.createElement('div');
  s.className='xp-star'; s.textContent='⭐';
  s.style.left=x+'px'; s.style.top=(y+window.scrollY)+'px';
  document.body.appendChild(s);
  setTimeout(()=>s.remove(),1300);
}

// ── FINISH LESSON ─────────────────────────────────────────
function finishLesson(){
  document.querySelectorAll('.chapter-section').forEach(s=>s.classList.remove('active'));
  const sc=document.getElementById('ch-score');
  sc.classList.add('active','show');
  document.getElementById('scoreCircle').textContent=score+'/'+CHAPTERS;
  window.scrollTo({top:0,behavior:'smooth'});
  if(score===CHAPTERS) launchConfetti();
}

function restartAll(){
  score=0; chapDone=[false,false,false,false,false,false];
  updateProgress();
  document.querySelectorAll('.chapter-pill').forEach(p=>p.classList.remove('done'));
  document.getElementById('ch-score').classList.remove('show');
  goChapter(0);
}

// ── CONFETTI ──────────────────────────────────────────────
function launchConfetti(){
  const canvas=document.getElementById('confettiCanvas');
  const ctx=canvas.getContext('2d');
  canvas.width=window.innerWidth; canvas.height=window.innerHeight;
  const bits=[];
  const colors=['#b35c00','#016b6f','#c89000','#3a7a1e','#e0b060','#ffd700'];
  for(let i=0;i<120;i++) bits.push({
    x:Math.random()*canvas.width, y:-20,
    vx:(Math.random()-0.5)*4, vy:2+Math.random()*3,
    r:4+Math.random()*6, c:colors[Math.floor(Math.random()*colors.length)],
    rot:Math.random()*360, vr:(Math.random()-0.5)*6
  });
  let frame=0;
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    bits.forEach(b=>{
      ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(b.rot*Math.PI/180);
      ctx.fillStyle=b.c; ctx.fillRect(-b.r/2,-b.r/2,b.r,b.r*0.6);
      ctx.restore();
      b.x+=b.vx; b.y+=b.vy; b.rot+=b.vr; b.vy+=0.05;
    });
    frame++;
    if(frame<200) requestAnimationFrame(draw);
    else ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  draw();
}

// ── VIEW SWITCHER (Lessons ↔ Knowledge Base) ───────────────
function switchView(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.view-tab').forEach(t=>t.classList.remove('active'));
  const target=document.getElementById('view-'+view);
  const tab=document.getElementById('vtab-'+view);
  if(target) target.classList.add('active');
  if(tab) tab.classList.add('active');
  if(view==='kb' && typeof loadKnowledgeBase==='function') loadKnowledgeBase();
  if(view==='studio' && typeof initDesignStudio==='function'){ initDesignStudio(); if(typeof init3D==='function') setTimeout(init3D,60); }
  window.scrollTo({top:0,behavior:'smooth'});
}

// ── INIT ──────────────────────────────────────────────────
(function init(){
  if(typeof mountAllIllustrations==='function') mountAllIllustrations();
  goChapter(0);
  setLang('bi'); // default bilingual
})();

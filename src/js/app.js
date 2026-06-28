// ── STATE ─────────────────────────────────────────────────
let currentChapter = 0;
let score = 0;
let chapDone = [false,false,false,false,false,false];
let currentLang = 'hi';
let dragData = null;
let matchScore = 0;
let answersMap = {};      // "ch-q" → "correct"|"wrong"
let fillAnswered = {};    // ch → true when fill-in-blank solved
let savedMatchDone = false;

const CHAPTERS = 6;

// ── LANG ──────────────────────────────────────────────────
function setLang(l){
  currentLang = l;
  document.body.setAttribute('data-lang', l);
  // Update <html lang> for screen readers & browser spell-check
  document.documentElement.lang = l === 'en' ? 'en' : 'hi';
  ['langHi','langBi','langEn'].forEach(id=>document.getElementById(id).classList.remove('active'));
  document.getElementById(l==='bi'?'langBi':l==='en'?'langEn':'langHi').classList.add('active');
  const placeholders = { hi:'खोजें…', en:'Search…', bi:'खोजें… / Search…' };
  const navInput = document.getElementById('navSearch');
  if (navInput) navInput.placeholder = placeholders[l] || placeholders.bi;
  ss_save({ lang: l });
}

// ── THEME ─────────────────────────────────────────────────
(function(){
  const btn=document.getElementById('themeBtn');
  const html=document.documentElement;
  const saved = ss_load();
  let dark = saved.theme ? saved.theme === 'dark' : matchMedia('(prefers-color-scheme:dark)').matches;
  html.setAttribute('data-theme', dark?'dark':'light');
  btn.textContent = dark ? '☀️' : '🌙';
  btn.addEventListener('click',()=>{
    dark=!dark; html.setAttribute('data-theme',dark?'dark':'light');
    btn.textContent=dark?'☀️':'🌙';
    ss_save({ theme: dark ? 'dark' : 'light' });
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
  startChapter(n);       // resets chapter UI to clean state
  _restoreChapter(n);    // re-applies any saved answers for this chapter
  ss_save({ chapter: n });
  window.scrollTo({top:0,behavior:'smooth'});
}

function startChapter(n){
  // Reset all qblock-N-* quiz blocks (multi-question support)
  let q=0;
  while(true){
    const block=document.getElementById('qblock-'+n+'-'+q);
    if(!block) break;
    if(q>0) block.classList.add('qblock-locked');
    else block.classList.remove('qblock-locked');
    const opts=document.getElementById('opts-'+n+'-'+q);
    if(opts) opts.querySelectorAll('.option-btn').forEach(b=>{
      b.disabled=false; b.classList.remove('correct','wrong');
      const icon=b.querySelector('.option-result-icon');
      if(icon) icon.style.opacity='0';
    });
    const fb=document.getElementById('fb-'+n+'-'+q);
    if(fb){fb.className='feedback';fb.style.display='';}
    q++;
  }
  // Chapter 2: reset fill-in-blank
  if(n===2){
    ['fill-warp','fill-warp-en','fill-warp-en2'].forEach(id=>{
      const el=document.getElementById(id);
      if(el){el.value='';el.classList.remove('correct-input','wrong-input');}
    });
    ['fb-fill-1','fb-fill-2'].forEach(id=>{
      const el=document.getElementById(id);
      if(el){el.className='feedback';el.style.display='';}
    });
  }
  // Chapter 5: reset match game
  if(n===5) resetMatch();
}

// ── QUIZ FEEDBACK DATA ────────────────────────────────────
const feedbackData = {
  0:{
    0:{correct:{hi:'बिल्कुल सही! चॉक कपड़े पर कटाई की रेखाएं बनाता है जो बाद में मिट जाती हैं।',en:'Correct! Chalk draws cutting lines on fabric that brush or wash away cleanly.'},
       wrong:{hi:'गलत — चॉक (Chalk) सही जवाब है। यह कपड़े पर रेखाएं खींचता है जो मिट जाती हैं।',en:'Wrong — Chalk is correct. It marks cutting lines that brush or wash away.'}},
    1:{correct:{hi:'सही! पिन सिलाई से पहले कपड़े की परतों को एक साथ पकड़े रखते हैं।',en:'Correct! Pins hold fabric layers together before stitching.'},
       wrong:{hi:'गलत — पिन का काम है सिलाई से पहले कपड़े की परतें जोड़ना।',en:'Wrong — Pins hold fabric layers in place before sewing.'}},
    2:{correct:{hi:'सही! फैब्रिक कैंची सिर्फ कपड़े के लिए रखें — कागज़ काटने से धार जल्दी खराब होती है।',en:'Correct! Fabric scissors must be used only on fabric — paper quickly dulls the blade.'},
       wrong:{hi:'गलत — सिर्फ फैब्रिक/ड्रेसमेकिंग कैंची ही कपड़े के लिए अलग रखनी चाहिए।',en:'Wrong — Only fabric/dressmaking scissors should be kept exclusively for fabric.'}},
    3:{correct:{hi:'सही! सीम रिपर गलत टांकों को काटकर हटाता है — हर दर्जी के लिए ज़रूरी।',en:'Correct! A seam ripper cuts and removes incorrect stitches — every tailor needs one.'},
       wrong:{hi:'गलत — सीम रिपर गलत सिलाई काटकर निकालता है।',en:'Wrong — A seam ripper removes incorrect stitches by cutting them.'}},
    4:{correct:{hi:'बिल्कुल सही! मशीन सुई 11/75 हल्के सूती कपड़े के लिए उपयुक्त है।',en:'Correct! Machine needle size 11/75 is ideal for lightweight cotton fabric.'},
       wrong:{hi:'गलत — हल्के सूती के लिए 11/75 मशीन सुई सही है।',en:'Wrong — Size 11/75 is the correct machine needle for lightweight cotton.'}},
    5:{correct:{hi:'सही! रेशम पर कम तापमान की इस्त्री — ज़्यादा गर्मी से कपड़ा जल सकता है।',en:'Correct! Use low heat for silk — high temperatures can scorch or melt the fibres.'},
       wrong:{hi:'गलत — रेशम के लिए कम तापमान (Low heat) ज़रूरी है।',en:'Wrong — Always iron silk at a low heat setting to avoid scorching.'}},
    6:{correct:{hi:'सही! प्रेस क्लॉथ लोहे और नाज़ुक कपड़े के बीच रखा जाता है — सुरक्षा के लिए।',en:'Correct! A press cloth goes between the iron and delicate fabric to prevent damage.'},
       wrong:{hi:'गलत — प्रेस क्लॉथ नाज़ुक कपड़े को लोहे की सीधी गर्मी से बचाता है।',en:'Wrong — A press cloth protects delicate fabric from direct iron contact.'}},
    7:{correct:{hi:'बिल्कुल सही! L-स्केल से पैटर्न ड्राफ्टिंग में सटीक समकोण (90°) बनते हैं।',en:'Correct! An L-scale creates precise right angles (90°) essential for pattern drafting.'},
       wrong:{hi:'गलत — L-स्केल / सेट स्क्वायर सही कोण बनाने का उपकरण है।',en:'Wrong — An L-scale or set square is used to create precise right angles in pattern drafting.'}},
    8:{correct:{hi:'सही! टेलर चॉक के निशान ब्रश करने या धोने पर मिट जाते हैं।',en:'Correct! Tailor\'s chalk marks are removed easily by brushing or washing.'},
       wrong:{hi:'गलत — टेलर चॉक के निशान ब्रश या पानी से आसानी से मिट जाते हैं।',en:'Wrong — Tailor\'s chalk marks brush or wash away easily.'}},
    9:{correct:{hi:'बिल्कुल सही! रोटरी कटर के नीचे cutting mat ज़रूरी है — बिना mat के मेज़ कट जाती है।',en:'Correct! A cutting mat must always go under the fabric when using a rotary cutter.'},
       wrong:{hi:'गलत — रोटरी कटर के नीचे self-healing cutting mat रखना अनिवार्य है।',en:'Wrong — A self-healing cutting mat must always be placed under a rotary cutter.'}}
  },
  1:{
    0:{correct:{hi:'बिल्कुल सही! सूती कपड़ा धोने, काटने और सिलने में सबसे आसान है।',en:'Correct! Cotton is the easiest fabric to wash, cut and stitch for beginners.'},
       wrong:{hi:'गलत — सूती (Cotton) शुरुआती दर्जियों के लिए सबसे उपयुक्त है।',en:'Wrong — Cotton is best for beginners as it is easy to handle.'}},
    1:{correct:{hi:'सही! रेशम जलाने पर बालों जैसी गंध आती है और मनके जैसी राख बनती है।',en:'Correct! Silk burns with a hair-like smell and leaves a small bead-like ash.'},
       wrong:{hi:'गलत — रेशम burn test: बालों जैसी गंध + मनके जैसी राख।',en:'Wrong — Silk burns with a hair-like smell and leaves a bead-like residue.'}},
    2:{correct:{hi:'सही! जॉर्जेट हल्का और फिसलन वाला होता है — इसीलिए सिलाई कठिन होती है।',en:'Correct! Georgette is lightweight and slippery — that is what makes it challenging to sew.'},
       wrong:{hi:'गलत — जॉर्जेट हल्का और फिसलन वाला होता है, इसलिए मुश्किल होता है।',en:'Wrong — Georgette is challenging because it is lightweight and slippery.'}},
    3:{correct:{hi:'सही! खादी हाथ से काते धागे से हाथ से बुना कपड़ा है — सूती या रेशमी।',en:'Correct! Khadi is handwoven from hand-spun cotton or silk thread.'},
       wrong:{hi:'गलत — खादी हाथ से बुना हुआ कपड़ा है (सूती या रेशमी)।',en:'Wrong — Khadi is handwoven fabric made from hand-spun cotton or silk.'}},
    4:{correct:{hi:'सही! पॉलिएस्टर कम तापमान पर इस्त्री होता है — ज़्यादा गर्मी से पिघल सकता है।',en:'Correct! Polyester must be ironed at low temperature — high heat can melt the fibres.'},
       wrong:{hi:'गलत — पॉलिएस्टर के लिए कम तापमान की इस्त्री ज़रूरी है।',en:'Wrong — Polyester requires low heat ironing — high temperatures can melt it.'}},
    5:{correct:{hi:'सही! जॉर्जेट और रेशम के कच्चे किनारे छिपाने के लिए फ्रेंच सीम आदर्श है।',en:'Correct! French seams enclose raw edges on delicate fabrics like georgette and silk.'},
       wrong:{hi:'गलत — नाज़ुक कपड़ों जैसे जॉर्जेट और रेशम के लिए फ्रेंच सीम ज़रूरी है।',en:'Wrong — Georgette and silk need French seams to prevent fraying.'}},
    6:{correct:{hi:'बिल्कुल सही! रेशम के लिए पतली सुई 9/65 — मोटी सुई से कपड़ा फटता है।',en:'Correct! Fine needle size 9/65 is used for silk — a larger needle damages the fabric.'},
       wrong:{hi:'गलत — रेशम के लिए पतली सुई 9/65 इस्तेमाल करें।',en:'Wrong — A fine needle size 9/65 is recommended for sewing silk.'}},
    7:{correct:{hi:'सही! पॉली-कॉटन में पॉलिएस्टर की टिकाऊता और सूती की सांस लेने की क्षमता दोनों होती हैं।',en:'Correct! Poly-cotton blends combine polyester\'s durability with cotton\'s breathability.'},
       wrong:{hi:'गलत — पॉली-कॉटन दोनों रेशों का मिश्रण है।',en:'Wrong — Poly-cotton is a blend combining properties of both polyester and cotton.'}},
    8:{correct:{hi:'सही! सूती प्राकृतिक रेशा है जो हवा गुज़रने देता है — गर्मियों के लिए सबसे अच्छा।',en:'Correct! Cotton is a natural fibre that allows air circulation — ideal for hot weather.'},
       wrong:{hi:'गलत — गर्मियों के लिए सांस लेने के लिए सूती कपड़ा सबसे उपयुक्त है।',en:'Wrong — Cotton is the most breathable fabric choice for summer garments.'}},
    9:{correct:{hi:'बिल्कुल सही! लिनेन धोने पर 10% तक सिकुड़ सकता है — पहले धोएं, फिर काटें।',en:'Correct! Linen can shrink up to 10% — always pre-wash before cutting.'},
       wrong:{hi:'गलत — लिनेन 10% तक सिकुड़ सकता है, इसलिए काटने से पहले धो लें।',en:'Wrong — Linen can shrink up to 10%, so always pre-wash before cutting.'}}
  },
  2:{
    1:{correct:{hi:'बिल्कुल सही! आड़े/चौड़े धागों को बाना (Weft) कहते हैं।',en:'Correct! Horizontal crosswise threads are called weft (बाना).'},
       wrong:{hi:'गलत — आड़े धागे बाना (Weft) कहलाते हैं।',en:'Wrong — Horizontal threads running across the width are called weft (बाना).'}},
    2:{correct:{hi:'सही! सेल्वेज कपड़े के दोनों किनारों की बनी-बनाई पट्टी है — इसे न काटें।',en:'Correct! The selvedge is the finished woven edge on both sides of the fabric — never cut it.'},
       wrong:{hi:'गलत — सेल्वेज कपड़े के किनारों पर पक्की बनी-बनाई धारी है।',en:'Wrong — The selvedge is the finished woven edge running along both sides of the fabric.'}},
    3:{correct:{hi:'सही! बायस ताने और बाने के बीच ठीक 45° के कोण पर होता है।',en:'Correct! The bias runs at exactly 45 degrees between the warp and weft threads.'},
       wrong:{hi:'गलत — बायस ताने और बाने के बीच 45° कोण पर होता है।',en:'Wrong — The bias cuts at a 45-degree angle to both the warp and weft.'}},
    4:{correct:{hi:'बिल्कुल सही! पैटर्न पीस हमेशा ताने की दिशा (grain line) में काटने चाहिए — कपड़ा मुड़ेगा नहीं।',en:'Correct! Pattern pieces must be cut along the grain line (warp) — the garment will not twist.'},
       wrong:{hi:'गलत — पैटर्न पीस ताने की दिशा (grain line) में काटें।',en:'Wrong — Pattern pieces must always be cut along the grain line (warp direction).'}},
    5:{correct:{hi:'बिल्कुल सही! प्लेन वीव में हर धागा बारी-बारी एक ऊपर, एक नीचे जाता है — सबसे सरल बुनावट।',en:'Correct! In a plain weave, each thread passes alternately over one and under one — the simplest weave.'},
       wrong:{hi:'गलत — प्लेन वीव में धागे एक ऊपर, एक नीचे — बारी-बारी बुने जाते हैं।',en:'Wrong — In plain weave, threads alternate over one and under one thread.'}},
    6:{correct:{hi:'सही! ट्वील वीव में तिरछी रेखाएं बनती हैं — डेनिम इसका सबसे प्रसिद्ध उदाहरण है।',en:'Correct! Twill weave creates diagonal lines — denim is the most well-known example.'},
       wrong:{hi:'गलत — ट्वील वीव से डेनिम बनता है — इसकी पहचान तिरछी रेखाएं हैं।',en:'Wrong — Denim is made using a twill weave, recognisable by its diagonal lines.'}},
    7:{correct:{hi:'सही! बायस कट कपड़ा शरीर पर लहराता है और खिंचाव के साथ ढलता है।',en:'Correct! Fabric cut on the bias drapes fluidly and stretches to follow the body.'},
       wrong:{hi:'गलत — बायस पर काटा कपड़ा शरीर पर लहराता और खिंचता है।',en:'Wrong — Bias-cut fabric drapes and stretches fluidly around the body.'}},
    8:{correct:{hi:'सही! भाप की इस्त्री से कपड़े के धागे सीधे हो जाते हैं — ग्रेन सही हो जाती है।',en:'Correct! Steam pressing straightens the fabric threads and restores the correct grain.'},
       wrong:{hi:'गलत — भाप इस्त्री से ग्रेन सीधी की जाती है।',en:'Wrong — Use steam pressing to straighten the fabric grain.'}},
    9:{correct:{hi:'बिल्कुल सही! साटन वीव में 4 या अधिक धागे तैरते हैं — इसीलिए कपड़ा चमकीला और चिकना होता है।',en:'Correct! In satin weave, 4 or more threads float before interlacing — this gives the smooth, shiny surface.'},
       wrong:{hi:'गलत — साटन वीव में 4 या अधिक धागों के बाद एक अंतर्गुंफन होता है।',en:'Wrong — Satin weave has 4 or more floating threads before one interlacement occurs.'}}
  },
  3:{
    0:{correct:{hi:'एकदम सही! पैर से पेडल दबाने पर बेल्ट के ज़रिए पहिया घूमता है — बिजली नहीं चाहिए।',en:'Exactly right! The foot pedal drives a belt that turns the wheel mechanically — no electricity needed.'},
       wrong:{hi:'गलत — पैर-चालित मशीन में सिर्फ पैर की ताकत से काम होता है।',en:'Wrong — A treadle machine is entirely human-powered via the foot pedal.'}},
    1:{correct:{hi:'सही! बॉबिन में निचला धागा लिपटा होता है जो सिलाई में लॉक-स्टिच बनाता है।',en:'Correct! The bobbin holds the lower thread which interlocks with the upper thread to form stitches.'},
       wrong:{hi:'गलत — बॉबिन में निचला (lower) धागा रहता है जो लॉक-स्टिच बनाता है।',en:'Wrong — The bobbin holds the lower thread that forms the lock-stitch from below.'}},
    2:{correct:{hi:'सही! प्रेसर फुट कपड़े को फीड डॉग के खिलाफ दबाए रखता है ताकि सिलाई सही हो।',en:'Correct! The presser foot holds fabric against the feed dog so it moves evenly under the needle.'},
       wrong:{hi:'गलत — प्रेसर फुट कपड़े को फीड डॉग के खिलाफ दबाए रखता है।',en:'Wrong — The presser foot holds fabric against the feed dogs during sewing.'}},
    3:{correct:{hi:'बिल्कुल सही! बारीक कपड़े के लिए 1–1.5 मिमी छोटे टांके बेहतर फिटिंग देते हैं।',en:'Correct! A short 1–1.5 mm stitch length gives clean results on fine, delicate fabric.'},
       wrong:{hi:'गलत — बारीक/नाज़ुक कपड़े के लिए 1–1.5 मिमी स्टिच लेंथ रखें।',en:'Wrong — Fine fabric needs a shorter stitch length of 1–1.5 mm.'}},
    4:{correct:{hi:'सही! ऊपरी धागा बहुत टाइट होने पर निचला धागा ऊपर की तरफ खिंच आता है।',en:'Correct! When upper tension is too tight, the lower bobbin thread is pulled up to the top surface.'},
       wrong:{hi:'गलत — ऊपरी तनाव बहुत अधिक हो तो निचला धागा ऊपर आता है।',en:'Wrong — Excessive upper tension pulls the lower thread up to the top surface of the fabric.'}},
    5:{correct:{hi:'सही! मशीन के ब्रांड के निर्देश पढ़ें — आमतौर पर हर 8–10 घंटे सिलाई के बाद तेल डालें।',en:'Correct! Follow the manufacturer\'s manual — typically oil after every 8–10 hours of sewing.'},
       wrong:{hi:'गलत — निर्माता के निर्देशानुसार, आमतौर पर हर 8–10 घंटे सिलाई के बाद तेल डालें।',en:'Wrong — Follow manufacturer instructions — typically every 8–10 hours of use.'}},
    6:{correct:{hi:'सही! ओवरलॉक मशीन एक साथ किनारा काटती है और धागों से लूप बनाकर बाँध देती है।',en:'Correct! An overlocker simultaneously trims the edge and loops thread over it to prevent fraying.'},
       wrong:{hi:'गलत — ओवरलॉक मशीन किनारे काटती और लूप में बाँधती है ताकि कपड़ा न उधड़े।',en:'Wrong — An overlocker trims the seam edge and loops thread over it to prevent fraying.'}},
    7:{correct:{hi:'सही! फीड डॉग्स दाँतेदार धातु की पट्टियाँ हैं जो कपड़े को सुई के नीचे से आगे खींचती हैं।',en:'Correct! Feed dogs are toothed metal strips that pull the fabric forward under the needle.'},
       wrong:{hi:'गलत — फीड डॉग्स कपड़े को सुई के नीचे से आगे खींचते हैं।',en:'Wrong — Feed dogs move the fabric forward automatically under the needle.'}},
    8:{correct:{hi:'सही! बैकस्टिच टांकों की गाँठ को बंद कर देता है — बिना बैकस्टिच के टांके खुल सकते हैं।',en:'Correct! Backstitching locks the stitch ends so they cannot unravel during wear.'},
       wrong:{hi:'गलत — बैकस्टिच टांकों को खुलने से रोकता है।',en:'Wrong — Backstitching prevents stitches from unravelling at seam ends.'}},
    9:{correct:{hi:'बिल्कुल सही! सुई बदलने से पहले बिजली/पैडल बंद करें — सुई अचानक नीचे आ सकती है।',en:'Correct! Always switch off power/release pedal before changing a needle — it can drop suddenly.'},
       wrong:{hi:'गलत — सुई बदलने से पहले सबसे पहले मशीन की बिजली या पैडल बंद करें।',en:'Wrong — Always switch off the machine power before changing the needle for safety.'}}
  },
  4:{
    0:{correct:{hi:'सही! डार्ट कपड़े में एक मोड़ बनाता है जो गारमेंट को शरीर की आकृति देता है।',en:'Correct! A dart is a folded tuck that shapes the garment to fit the body contours.'},
       wrong:{hi:'गलत — डार्ट का काम है शरीर के अनुसार कपड़े को आकार देना।',en:'Wrong — A dart shapes the garment to fit the body\'s curves.'}},
    1:{correct:{hi:'सही! सीम भत्ता सिलाई की रेखा और कपड़े के कच्चे किनारे के बीच की दूरी होती है।',en:'Correct! Seam allowance is the distance between the stitch line and the raw fabric edge.'},
       wrong:{hi:'गलत — सीम भत्ता सिलाई रेखा और कपड़े के किनारे के बीच का हिस्सा है।',en:'Wrong — Seam allowance is the strip of fabric between the stitch line and the raw edge.'}},
    2:{correct:{hi:'सही! हेम परिधान के निचले किनारे पर होता है — कपड़े को मोड़कर सिला जाता है।',en:'Correct! A hem is at the bottom/lower edge of a garment — the edge is folded and stitched.'},
       wrong:{hi:'गलत — हेम परिधान के निचले किनारे पर होता है।',en:'Wrong — A hem finishes the lower/bottom edge of a garment.'}},
    3:{correct:{hi:'सही! नाज़ुक कपड़े जैसे जॉर्जेट और रेशम के कच्चे किनारे छिपाने के लिए फ्रेंच सीम आदर्श है।',en:'Correct! French seams enclose raw edges of sheer fabrics like georgette and silk perfectly.'},
       wrong:{hi:'गलत — फ्रेंच सीम नाज़ुक कपड़ों जैसे रेशम और जॉर्जेट के लिए है।',en:'Wrong — French seams are used for delicate fabrics such as silk and georgette.'}},
    4:{correct:{hi:'बिल्कुल सही! जींस पर दिखने वाली दोहरी सिलाई फ्लैट-फेल्ड सीम है — बहुत मज़बूत।',en:'Correct! The double row of stitching on jeans is a flat-felled seam — very strong and flat.'},
       wrong:{hi:'गलत — जींस पर दिखने वाली दोहरी सिलाई फ्लैट-फेल्ड सीम है।',en:'Wrong — The visible double stitching on jeans is called a flat-felled seam.'}},
    5:{correct:{hi:'सही! सीम को press करने से वह सपाट और साफ होती है — बिना pressing के परिधान कच्चा लगता है।',en:'Correct! Pressing flattens and crisps a seam — unpressed seams make a garment look unfinished.'},
       wrong:{hi:'गलत — सीम press करने से वह सपाट और साफ होती है।',en:'Wrong — Pressing a seam flattens and crisps it for a professional finish.'}},
    6:{correct:{hi:'सही! घुमावदार सीम में clip करने से कपड़े का भत्ता सपाट बिछ जाता है बिना सिलवट के।',en:'Correct! Clipping curves allows the seam allowance to spread flat without puckering.'},
       wrong:{hi:'गलत — घुमावदार सीम में clip करने से भत्ता सपाट हो जाता है।',en:'Wrong — Clipping curved seam allowances allows them to lie flat without puckers.'}},
    7:{correct:{hi:'सही! ग्रेडिंग से सीम का उभार (bulk) कम होता है ताकि वह सपाट बिछे।',en:'Correct! Grading trims seam layers to different widths to reduce bulk and help the seam lie flat.'},
       wrong:{hi:'गलत — ग्रेडिंग सीम भत्ते का उभार कम करने के लिए की जाती है।',en:'Wrong — Grading reduces seam bulk so the seam allowance lies flat inside the garment.'}},
    8:{correct:{hi:'सही! टॉपस्टिच सजावटी भी है और सीम को सपाट भी रखता है — जींस और कुर्ते पर दिखता है।',en:'Correct! Topstitching is both decorative and functional — it keeps seams flat and adds design detail.'},
       wrong:{hi:'गलत — टॉपस्टिच सजावट के साथ-साथ सीम को सपाट रखता है।',en:'Wrong — Topstitching serves both a decorative and structural function in garments.'}},
    9:{correct:{hi:'सही! ease (ढील) आरामदायक हलचल के लिए ज़रूरी है — बिना ease कपड़ा सांस नहीं लेने देता।',en:'Correct! Ease allows comfortable movement — without it the garment restricts breathing and motion.'},
       wrong:{hi:'गलत — ease हिलने-डुलने की सुविधा के लिए कपड़े के नाप में जोड़ी जाती है।',en:'Wrong — Ease is extra room added to measurements so the wearer can move comfortably.'}}
  },
  5:{
    1:{correct:{hi:'सही! छाती का नाप सीने के सबसे चौड़े हिस्से से, बाँहों के नीचे से गोल लिया जाता है।',en:'Correct! Bust is measured around the fullest part of the chest, under the arms.'},
       wrong:{hi:'गलत — छाती का नाप सीने के सबसे चौड़े हिस्से के गोल से लिया जाता है।',en:'Wrong — Bust is measured around the fullest part of the chest under the arms.'}},
    2:{correct:{hi:'सही! कमर का नाप पेट के सबसे पतले हिस्से के चारों ओर लिया जाता है।',en:'Correct! Waist is measured around the narrowest part of the torso.'},
       wrong:{hi:'गलत — कमर का नाप पेट के सबसे पतले हिस्से का घेरा होता है।',en:'Wrong — Waist measurement is taken around the narrowest part of the torso.'}},
    3:{correct:{hi:'सही! ब्लाउज़ में हिलने-डुलने के लिए 1–2 इंच ease allowance जोड़ा जाता है।',en:'Correct! A fitted blouse needs 1–2 inches of ease for comfortable movement.'},
       wrong:{hi:'गलत — ब्लाउज़ में 1–2 इंच ease जोड़ें — आराम के लिए।',en:'Wrong — A blouse needs 1–2 inches of ease added to the bust measurement.'}},
    4:{correct:{hi:'सही! टेप सपाट रखें — न बहुत कसा, न बहुत ढीला — ताकि सही नाप मिले।',en:'Correct! Hold the tape flat and snug — not tight, not loose — for an accurate measurement.'},
       wrong:{hi:'गलत — टेप सपाट और snug पकड़ें — न कसा, न ढीला।',en:'Wrong — The tape should be flat and snug — neither tight nor loose when measuring.'}},
    5:{correct:{hi:'सही! आस्तीन की लंबाई कंधे की नोक से कलाई तक नापी जाती है।',en:'Correct! Sleeve length is measured from the shoulder point to the wrist.'},
       wrong:{hi:'गलत — आस्तीन कंधे की नोक (shoulder point) से कलाई तक नापते हैं।',en:'Wrong — Sleeve length goes from the shoulder point down to the wrist.'}},
    6:{correct:{hi:'सही! कूल्हे का नाप कमर से 7–9 इंच नीचे, सबसे चौड़े हिस्से से लिया जाता है।',en:'Correct! Hip is measured 7–9 inches below the waist, at the fullest part.'},
       wrong:{hi:'गलत — कूल्हे का नाप कमर से 7–9 इंच नीचे लिया जाता है।',en:'Wrong — Hip is measured 7–9 inches below the waist at the fullest point.'}},
    7:{correct:{hi:'सही! पीठ की लंबाई गर्दन की हड्डी (nape) से कमर तक नापी जाती है।',en:'Correct! Back length is measured from the nape of the neck down to the waist.'},
       wrong:{hi:'गलत — पीठ की लंबाई गर्दन की हड्डी से कमर तक होती है।',en:'Wrong — Back length is measured from the nape of the neck to the waist.'}},
    8:{correct:{hi:'सही! कॉलर बनाने के लिए गर्दन के चारों ओर का घेरा (neck circumference) नापते हैं।',en:'Correct! The neck circumference is the measurement taken to construct a collar.'},
       wrong:{hi:'गलत — कॉलर के लिए गर्दन का घेरा (neck circumference) ज़रूरी है।',en:'Wrong — The neck circumference measurement is needed to draft and sew a collar.'}},
    9:{correct:{hi:'बिल्कुल सही! पेटाइट पैटर्न छोटे कद के लिए आनुपातिक रूप से छोटा होता है — सिर्फ संकरा नहीं।',en:'Correct! A petite pattern is proportionally shorter for smaller heights — not just narrower.'},
       wrong:{hi:'गलत — पेटाइट पैटर्न छोटे कद के लिए आनुपातिक रूप से छोटा होता है।',en:'Wrong — Petite patterns are proportionally shorter for smaller heights, not just narrower.'}}
  }
};

// ── QUIZ CHECK (multi-question) ────────────────────────────
function checkQ(chap, qnum, result, optsId, fbId){
  const opts=document.getElementById(optsId);
  opts.querySelectorAll('.option-btn').forEach(b=>b.disabled=true);
  const clicked=event.currentTarget;
  clicked.classList.add(result);
  // show feedback
  const fb=document.getElementById(fbId);
  const data=feedbackData[chap]?.[qnum]?.[result];
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
  // score: first correct answer per chapter earns a point
  if(result==='correct'){
    spawnStar(event.clientX,event.clientY);
    if(!chapDone[chap]){score++;chapDone[chap]=true;updateProgress();markChapterDone(chap);}
  }
  // persist answer
  answersMap[chap+'-'+qnum] = result;
  ss_save({ answers: answersMap, score, chapDone });
  // unlock next question block
  const next=document.getElementById('qblock-'+chap+'-'+(qnum+1));
  if(next){
    setTimeout(()=>{
      next.classList.remove('qblock-locked');
      next.scrollIntoView({behavior:'smooth',block:'nearest'});
    },700);
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
    fillAnswered[2] = true;
    ss_save({ fillAnswered, score, chapDone });
    // unlock next question in chapter 2
    const next=document.getElementById('qblock-2-1');
    if(next) setTimeout(()=>{next.classList.remove('qblock-locked');next.scrollIntoView({behavior:'smooth',block:'nearest'});},700);
  } else if(val.length>=answer.length){
    inp.classList.add('wrong-input'); inp.classList.remove('correct-input');
    fb.innerHTML=`<span class="feedback-icon">❌</span><div class="feedback-text"><strong>गलत</strong><p>सही जवाब: ${answer}</p></div>`;
    fb.className='feedback show wrong-fb'; fb.style.display='';
  }
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
      savedMatchDone = true;
      ss_save({ matchDone: true, score, chapDone });
      // unlock next questions in chapter 5
      const next=document.getElementById('qblock-5-1');
      if(next) setTimeout(()=>{next.classList.remove('qblock-locked');next.scrollIntoView({behavior:'smooth',block:'nearest'});},800);
    }
  } else {
    zone.style.borderColor='var(--color-error)';
    setTimeout(()=>zone.style.borderColor='',800);
  }
  if(card) card.classList.remove('dragging');
}
function resetMatch(){
  matchScore=0;
  const dragCol=document.getElementById('drag-col');
  const dropCol=document.getElementById('drop-col');
  if(dragCol) dragCol.querySelectorAll('.match-card').forEach(c=>{
    c.draggable=true;c.style.opacity='';c.classList.remove('matched','dragging');
  });
  if(dropCol) dropCol.querySelectorAll('.match-drop').forEach(z=>{
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
  answersMap={}; fillAnswered={}; savedMatchDone=false;
  ss_clear();
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

// ── SESSION TIME & VISIT TRACKING ────────────────────────
(function(){
  const today = new Date().toISOString().slice(0, 10);
  const sv = ss_load();
  const dates = sv.visitDates || [];
  if (!dates.includes(today)) dates.push(today);
  if (dates.length > 30) dates.splice(0, dates.length - 30);
  ss_save({ visitDates: dates, lastVisit: today, firstVisit: sv.firstVisit || today });

  let _t0 = Date.now();
  function _flushTime() {
    const elapsed = Date.now() - _t0;
    if (elapsed < 500) return;
    const s = ss_load();
    ss_save({ totalTimeMs: (s.totalTimeMs || 0) + elapsed });
    _t0 = Date.now();
  }
  document.addEventListener('visibilitychange', _flushTime);
  window.addEventListener('beforeunload', _flushTime);
  // Flush every 30s while active
  setInterval(() => { if (!document.hidden) _flushTime(); }, 30000);
})();

// ── NAV SEARCH ────────────────────────────────────────────
function navSearchGo(val) {
  if (typeof KB !== 'undefined') KB.filters.q = val.trim();
  switchView('kb');
  if (typeof KB !== 'undefined' && KB.data && typeof renderKB === 'function') renderKB();
}

// ── VIEW SWITCHER ──────────────────────────────────────────
function switchView(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.view-tab').forEach(t=>t.classList.remove('active'));
  const target=document.getElementById('view-'+view);
  const tab=document.getElementById('vtab-'+view);
  if(target) target.classList.add('active');
  if(tab) tab.classList.add('active');
  if(view==='kb'        && typeof loadKnowledgeBase==='function') loadKnowledgeBase();
  if(view==='studio'    && typeof initDesignStudio==='function'){ initDesignStudio(); if(typeof init3D==='function') setTimeout(init3D,60); }
  if(view==='dashboard' && typeof initDashboard==='function') initDashboard();
  if(view==='kb-lesson'){ const kbTab=document.getElementById('vtab-kb'); if(kbTab) kbTab.classList.add('active'); }
  const hero = document.querySelector('.hero');
  if(hero) hero.style.display = view==='lesson' ? '' : 'none';
  const chNav = document.querySelector('.hero-content .chapter-nav');
  if(chNav) chNav.style.display = view==='lesson' ? '' : 'none';
  const navSearch = document.querySelector('.nav-search-wrap');
  if(navSearch) navSearch.style.display = view==='studio' ? 'none' : '';
  window.scrollTo({top:0,behavior:'smooth'});
}

// ── RESTORE HELPERS ───────────────────────────────────────
function _restoreQuestionUI(ch, q, result){
  const optsEl = document.getElementById('opts-'+ch+'-'+q);
  const fbEl   = document.getElementById('fb-'+ch+'-'+q);
  if(!optsEl) return;
  optsEl.querySelectorAll('.option-btn').forEach(btn=>{
    btn.disabled = true;
    const oc = btn.getAttribute('onclick') || '';
    if(oc.includes("'"+result+"'")){
      btn.classList.add(result);
      const icon = btn.querySelector('.option-result-icon');
      if(icon) icon.style.opacity='1';
    }
  });
  const data = feedbackData[ch]?.[q]?.[result];
  if(fbEl && data){
    fbEl.innerHTML=`<span class="feedback-icon">${result==='correct'?'✅':'❌'}</span>
      <div class="feedback-text">
        <strong class="hi-only">${result==='correct'?'शाबाश!':'दोबारा सोचें!'}</strong>
        <strong class="en-only">${result==='correct'?'Well done!':'Try again!'}</strong>
        <p class="hi-only">${data.hi}</p>
        <p class="en-only">${data.en}</p>
      </div>`;
    fbEl.className=`feedback show ${result==='correct'?'correct-fb':'wrong-fb'}`;
    fbEl.style.display='';
  }
  const next = document.getElementById('qblock-'+ch+'-'+(q+1));
  if(next) next.classList.remove('qblock-locked');
}

function _restoreFillUI(){
  ['fill-warp','fill-warp-en','fill-warp-en2'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){el.value='ताना';el.classList.add('correct-input');el.disabled=true;}
  });
  ['fb-fill-1','fb-fill-2'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){
      el.innerHTML='<span class="feedback-icon">✅</span><div class="feedback-text"><strong>सही!</strong><p>ताना (Warp)</p></div>';
      el.className='feedback show correct-fb'; el.style.display='';
    }
  });
  const next=document.getElementById('qblock-2-1');
  if(next) next.classList.remove('qblock-locked');
}

function _restoreMatchUI(){
  const fb=document.getElementById('fb-match');
  if(fb){
    fb.innerHTML='<span class="feedback-icon">🎊</span><div class="feedback-text"><strong class="hi-only">शाबाश! सभी नाप सही मिलाए!</strong><strong class="en-only">Excellent! All measurements matched!</strong></div>';
    fb.className='feedback show correct-fb'; fb.style.display='flex';
  }
  const next=document.getElementById('qblock-5-1');
  if(next) next.classList.remove('qblock-locked');
  const dragCol=document.getElementById('drag-col');
  if(dragCol) dragCol.querySelectorAll('.match-card').forEach(c=>{
    c.draggable=false; c.style.opacity='0.3'; c.classList.add('matched');
  });
}

function _restoreChapter(n){
  // Re-apply saved MCQ answers in question order (so unlock chain is correct)
  Object.entries(answersMap)
    .filter(([key])=>key.startsWith(n+'-'))
    .sort((a,b)=>parseInt(a[0].split('-')[1])-parseInt(b[0].split('-')[1]))
    .forEach(([key,result])=>_restoreQuestionUI(n,parseInt(key.split('-')[1]),result));
  if(n===2 && fillAnswered[2]) _restoreFillUI();
  if(n===5 && savedMatchDone) _restoreMatchUI();
}

// ── INIT ──────────────────────────────────────────────────
(function init(){
  if(typeof mountAllIllustrations==='function') mountAllIllustrations();

  const s = ss_load();
  // Restore chapDone & score before goChapter so markChapterDone works
  if(s.chapDone && Array.isArray(s.chapDone)){
    chapDone = s.chapDone;
    score = s.score || 0;
  }
  answersMap    = s.answers      || {};
  fillAnswered  = s.fillAnswered || {};
  savedMatchDone= s.matchDone    || false;

  // updateProgress after state loaded
  updateProgress();
  chapDone.forEach((done,i)=>{ if(done) markChapterDone(i); });

  // goChapter calls startChapter (reset) then _restoreChapter (re-apply saved)
  goChapter(typeof s.chapter==='number' ? s.chapter : 0);
  setLang(s.lang || 'hi');
})();

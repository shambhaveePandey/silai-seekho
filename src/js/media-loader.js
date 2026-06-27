// ════════════════════════════════════════════════════════════
//  MEDIA LOADER
//  Renders externalised SVG illustrations into each lesson's
//  .illus-wrap via <img>, with a graceful fallback if a file
//  fails to load (the root cause of "SVGs/GIFs not showing").
//  Using <img src="*.svg"> + onerror fallback works reliably on
//  GitHub Pages because .nojekyll keeps every asset published and
//  basePath() resolves the correct relative URL.
// ════════════════════════════════════════════════════════════
function mountIllustration(wrap) {
  const src = wrap.getAttribute('data-illus');
  const alt = wrap.getAttribute('data-alt') || 'Illustration';
  if (!src) return;
  const url = (typeof assetUrl === 'function') ? assetUrl(src) : src;
  wrap.setAttribute('data-failed', 'false');
  wrap.innerHTML =
    `<img class="illus" alt="${alt}" loading="lazy" src="${url}" ` +
    `onerror="this.closest('.illus-wrap').setAttribute('data-failed','true')">` +
    `<div class="illus-fallback"><span class="hi-only">चित्र लोड नहीं हुआ — रिफ्रेश करें</span>` +
    `<span class="en-only">Illustration could not load — try refreshing</span></div>`;
}

function mountAllIllustrations() {
  document.querySelectorAll('.illus-wrap[data-illus]').forEach(mountIllustration);
}

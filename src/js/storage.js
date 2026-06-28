// ── SILAI SEEKHO — LOCAL STORAGE ─────────────────────────
// Single-key namespaced store. All state is merged on write
// so partial saves never clobber unrelated fields.
// Key bumped (v2, v3…) when schema changes incompatibly.

const SS_KEY = 'silaiSeekho_v1';

function ss_save(patch) {
  try {
    const cur = ss_load();
    localStorage.setItem(SS_KEY, JSON.stringify(Object.assign({}, cur, patch)));
  } catch (_) {}
}

function ss_load() {
  try { return JSON.parse(localStorage.getItem(SS_KEY)) || {}; }
  catch (_) { return {}; }
}

function ss_clear() {
  try { localStorage.removeItem(SS_KEY); } catch (_) {}
}

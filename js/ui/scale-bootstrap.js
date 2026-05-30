/* ── Bootstrap scale — runs synchronously before first paint ──────────────
   Mirrors computeScale() in renderer.js exactly.                          */
(function () {
  var NATIVE_W       = 596;
  var NATIVE_TOTAL_H = 478;
  var PAD            = 12;

  var vw    = window.innerWidth;
  var vh    = window.innerHeight;
  var scale = Math.min(1, (vw - PAD * 2) / NATIVE_W, (vh - PAD * 2) / NATIVE_TOTAL_H);

  var visualH = NATIVE_TOTAL_H * scale;
  var marginV = ((NATIVE_TOTAL_H - visualH) / 2) * -1;

  document.documentElement.style.setProperty('--scale',          scale);
  document.documentElement.style.setProperty('--scale-margin-v', marginV + 'px');
})();

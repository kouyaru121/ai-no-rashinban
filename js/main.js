/* ==========================================================
   愛の羅針盤 — LP の挙動 (ヘッダー / 年齢確認)
   ========================================================== */
(function () {
  "use strict";

  // ---------- スクロールでヘッダーに背景 ----------
  var header = document.getElementById("site-header");
  window.addEventListener(
    "scroll",
    function () {
      header.classList.toggle("scrolled", window.scrollY > 40);
    },
    { passive: true }
  );

  // ---------- 年齢確認 (初回のみ表示) ----------
  var gate = document.getElementById("age-gate");
  if (gate && !localStorage.getItem("rashinban_age_ok")) {
    gate.hidden = false;
    document.body.style.overflow = "hidden";
    document.getElementById("age-yes").addEventListener("click", function () {
      localStorage.setItem("rashinban_age_ok", "1");
      gate.hidden = true;
      document.body.style.overflow = "";
    });
  }
})();

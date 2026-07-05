/* ==========================================================
   愛の羅針盤 — 計測 (GA4)
   測定IDを設定するまでは何も送信しない安全設計。
   使い方: Track.event("fortune_start", {genre: "aisho"})
   ========================================================== */
var Track = (function () {
  "use strict";

  // ★ GA4 の測定IDをここに貼る (例: "G-XXXXXXXXXX")。空なら計測オフ
  var GA_ID = "";

  var enabled = /^G-[A-Z0-9]+$/.test(GA_ID);

  if (enabled) {
    // gtag.js を動的ロード
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { anonymize_ip: true });
  }

  function event(name, params) {
    if (!enabled) return;
    try { window.gtag("event", name, params || {}); } catch (e) {}
  }

  return { event: event, enabled: enabled };
})();

/* ==========================================================
   愛の羅針盤 — アニメーションFX
   クリック時のきらめき・ハートの舞い。全ページ共通。
   (rAF 非依存: CSS transition + setTimeout で必ず完了する)
   ========================================================== */
var FX = (function () {
  "use strict";

  var GLYPHS = ["✦", "✧", "♥", "❀", "·"];
  var COLORS = ["#f3cfa6", "#f295b5", "#f7c6d5", "#ffffff"];

  // 指定座標から粒子を放射する
  function burst(x, y, opts) {
    opts = opts || {};
    var n = opts.count || 10;
    var dist = opts.dist || 90;
    var glyphs = opts.glyphs || GLYPHS;
    for (var i = 0; i < n; i++) {
      (function () {
        var p = document.createElement("span");
        p.className = "fx-p";
        p.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
        p.style.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        p.style.left = x + "px";
        p.style.top = y + "px";
        p.style.fontSize = (9 + Math.random() * (opts.size || 10)) + "px";
        document.body.appendChild(p);
        // リフローを挟んでから目標位置へ (transition を発火させる)
        void p.offsetWidth;
        var a = Math.random() * Math.PI * 2;
        var d = dist * (0.4 + Math.random() * 0.6);
        p.style.transform =
          "translate(" + Math.cos(a) * d + "px," + (Math.sin(a) * d - 24) + "px) " +
          "rotate(" + (Math.random() * 240 - 120) + "deg) scale(0.1)";
        p.style.opacity = "0";
        setTimeout(function () { p.remove(); }, 950);
      })();
    }
  }

  // 要素の中心からハートを舞わせる (羅針盤が止まった時など)
  function heartBurst(el) {
    var r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, {
      count: 16, dist: 150, size: 16, glyphs: ["♥", "♡", "✦"]
    });
  }

  // 操作要素のクリックに自動できらめきを付ける
  document.addEventListener("click", function (e) {
    var hit = e.target.closest(
      ".btn, .choice-btn, .moon-btn, .color-swatch, .omikuji-seal, .shelf-item, .tarot-card, .paywall-plan"
    );
    if (!hit) return;
    // クリック座標が取れない場合 (キーボード操作等) は要素中心
    var x = e.clientX, y = e.clientY;
    if (!x && !y) {
      var r = hit.getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top + r.height / 2;
    }
    burst(x, y, { count: 8 });
  }, { passive: true });

  return { burst: burst, heartBurst: heartBurst };
})();

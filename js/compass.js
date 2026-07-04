/* ==========================================================
   愛の羅針盤 — コンパス(羅針盤) SVG モジュール
   サイトの象徴。LPヒーロー / 鑑定中演出 / スコアダイヤル /
   「羅針盤を回す」アクションで共用する。
   ========================================================== */
var Compass = (function () {
  "use strict";

  // ---------- 目盛りを生成 ----------
  function ticks(cx, cy, rOut, rIn, count, cls) {
    var out = "";
    for (var i = 0; i < count; i++) {
      var a = (i / count) * Math.PI * 2;
      var x1 = cx + Math.sin(a) * rIn, y1 = cy - Math.cos(a) * rIn;
      var x2 = cx + Math.sin(a) * rOut, y2 = cy - Math.cos(a) * rOut;
      out += '<line class="' + cls + '" x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) +
        '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '"/>';
    }
    return out;
  }

  // ---------- コンパスローズ本体 ----------
  // size: 一辺のpx / needleId: 針グループに付けるid (nullなら針なし)
  // 東西南北の代わりに 愛・縁・情・運 を刻む
  function svg(size, needleId, opts) {
    opts = opts || {};
    var c = 100; // viewBox中心
    var letters = opts.letters !== false
      ? '<g class="cmp-letters">' +
        '<text x="100" y="24" text-anchor="middle">愛</text>' +
        '<text x="179" y="106" text-anchor="middle">縁</text>' +
        '<text x="100" y="188" text-anchor="middle">情</text>' +
        '<text x="21" y="106" text-anchor="middle">運</text></g>'
      : "";

    // 8方位の星型ローズ (長い4枚 + 短い4枚)
    function rosePoint(angleDeg, len, half) {
      var a = (angleDeg * Math.PI) / 180;
      var tx = c + Math.sin(a) * len, ty = c - Math.cos(a) * len;
      var lx = c + Math.sin(a - Math.PI / 2) * half, ly = c - Math.cos(a - Math.PI / 2) * half;
      var rx = c + Math.sin(a + Math.PI / 2) * half, ry = c - Math.cos(a + Math.PI / 2) * half;
      return '<path class="cmp-rose-blade" d="M' + tx.toFixed(1) + " " + ty.toFixed(1) +
        " L" + lx.toFixed(1) + " " + ly.toFixed(1) +
        " L" + rx.toFixed(1) + " " + ry.toFixed(1) + ' Z"/>';
    }
    var rose = "";
    [0, 90, 180, 270].forEach(function (a) { rose += rosePoint(a, 62, 7); });
    [45, 135, 225, 315].forEach(function (a) { rose += rosePoint(a, 40, 5); });

    // 針 (ハート先端の恋の針)
    var needle = needleId
      ? '<g id="' + needleId + '" class="cmp-needle-g" style="transform-origin:100px 100px">' +
        '<path class="cmp-needle-n" d="M100 34 L106 96 L100 104 L94 96 Z"/>' +
        '<path class="cmp-needle-s" d="M100 166 L94 104 L100 96 L106 104 Z"/>' +
        '<path class="cmp-heart" d="M100 26 c-3.5-5 -10-4 -10 1.5 c0 4 5.5 7.5 10 11 c4.5-3.5 10-7 10-11 c0-5.5 -6.5-6.5 -10-1.5 Z"/>' +
        "</g>"
      : "";

    return (
      '<svg class="compass-svg" viewBox="0 0 200 200" width="' + size + '" height="' + size + '" xmlns="http://www.w3.org/2000/svg">' +
      '<circle class="cmp-ring-outer" cx="100" cy="100" r="96"/>' +
      '<circle class="cmp-ring" cx="100" cy="100" r="88"/>' +
      '<circle class="cmp-ring-thin" cx="100" cy="100" r="70"/>' +
      ticks(100, 100, 88, 82, 72, "cmp-tick") +
      ticks(100, 100, 88, 78, 8, "cmp-tick-major") +
      '<g class="cmp-rose">' + rose + "</g>" +
      letters +
      needle +
      '<circle class="cmp-pivot" cx="100" cy="100" r="5"/>' +
      "</svg>"
    );
  }

  // ---------- ダイヤル型スコア (結果画面用) ----------
  // 目盛り270度分の弧 + スコア位置へ針がスイングする
  function dial(score) {
    var start = -135, sweep = 270;
    var angle = start + (score / 100) * sweep;
    // 弧のパス (r=84, -135度 → +135度)
    function pt(deg, r) {
      var a = (deg * Math.PI) / 180;
      return (100 + Math.sin(a) * r).toFixed(1) + " " + (100 - Math.cos(a) * r).toFixed(1);
    }
    var scoreArcEnd = start + (score / 100) * sweep;
    var largeArc = (score / 100) * sweep > 180 ? 1 : 0;
    return (
      '<div class="score-dial">' +
      '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="dialGrad" x1="0" y1="1" x2="1" y2="0">' +
      '<stop offset="0%" stop-color="#d9a67c"/><stop offset="100%" stop-color="#f295b5"/></linearGradient></defs>' +
      '<path class="dial-track" d="M ' + pt(start, 84) + " A 84 84 0 1 1 " + pt(start + sweep, 84) + '"/>' +
      '<path class="dial-arc" d="M ' + pt(start, 84) + " A 84 84 0 " + largeArc + " 1 " + pt(scoreArcEnd, 84) + '"/>' +
      ticks(100, 100, 78, 72, 54, "cmp-tick") +
      '<g class="dial-needle" style="transform-origin:100px 100px" data-angle="' + angle.toFixed(1) + '">' +
      '<path class="cmp-needle-n" d="M100 30 L105 95 L100 102 L95 95 Z"/>' +
      '<path class="cmp-heart" d="M100 24 c-3-4.5 -9-3.5 -9 1.3 c0 3.6 5 6.8 9 10 c4-3.2 9-6.4 9-10 c0-4.8 -6-5.8 -9-1.3 Z"/></g>' +
      '<circle class="cmp-pivot" cx="100" cy="100" r="5"/>' +
      "</svg>" +
      '<div class="score-num"><strong>0</strong><span>総合相性</span></div>' +
      "</div>"
    );
  }

  // ダイヤルのアニメーション起動 (針スイング + 数字カウントアップ)
  function animateDial(root, score) {
    var needle = root.querySelector(".dial-needle");
    var num = root.querySelector(".score-num strong");
    if (!needle || !num) return;
    requestAnimationFrame(function () {
      setTimeout(function () {
        needle.style.transform = "rotate(" + needle.dataset.angle + "deg)";
      }, 120);
    });
    var t0 = null;
    function count(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / 1700);
      var eased = 1 - Math.pow(1 - p, 3);
      num.textContent = Math.round(score * eased);
      if (p < 1) requestAnimationFrame(count);
    }
    requestAnimationFrame(count);
    // rAF が止まる環境 (非表示タブ等) でも最終値を保証
    setTimeout(function () { num.textContent = score; }, 1900);
  }

  // ---------- 「羅針盤を回す」インタラクション ----------
  // ドラッグ(スワイプ)で回し、離すと勢いに応じて減速回転。
  // 回転は CSS トランジション、完了検知はタイマー
  // (rAF はバックグラウンドで止まり settle しないことがあるため使わない)
  function spinnable(el, onSettle) {
    var rose = el.querySelector(".compass-svg");
    var angle = 0, dragging = false, lastA = 0, lastT = 0, vel = 0, settled = false, spinning = false;

    function pointerAngle(e) {
      var r = el.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      return (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
    }
    function launch(velocity) {
      if (settled || spinning) return;
      spinning = true;
      // 勢いに応じた総回転量 (最低でも2回転して儀式感を出す)
      var extra = Math.min(1800, Math.max(720, Math.abs(velocity) * 60)) * (velocity < 0 ? -1 : 1);
      var final = angle + extra + Math.random() * 360 * (velocity < 0 ? -1 : 1);
      var dur = 3.6;
      rose.style.transition = "transform " + dur + "s cubic-bezier(0.12, 0.68, 0.18, 1)";
      rose.style.transform = "rotate(" + final + "deg)";
      setTimeout(function () {
        if (settled) return;
        settled = true;
        el.classList.add("cmp-settled");
        onSettle(((final % 360) + 360) % 360);
      }, dur * 1000 + 250);
    }
    el.addEventListener("pointerdown", function (e) {
      if (settled || spinning) return;
      dragging = true;
      lastA = pointerAngle(e);
      lastT = performance.now();
      vel = 0;
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    });
    el.addEventListener("pointermove", function (e) {
      if (!dragging || settled || spinning) return;
      var a = pointerAngle(e);
      var d = a - lastA;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      angle += d;
      var now = performance.now();
      vel = (d / Math.max(1, now - lastT)) * 16;
      lastA = a;
      lastT = now;
      rose.style.transition = "none";
      rose.style.transform = "rotate(" + angle + "deg)";
    });
    function release() {
      if (!dragging || settled || spinning) return;
      dragging = false;
      // 弱いスワイプでも気持ちよく回るよう最低速度を保証
      if (Math.abs(vel) < 6) vel = (vel < 0 ? -1 : 1) * (14 + Math.random() * 10);
      launch(vel);
    }
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    // タップだけでも回せるように
    el.addEventListener("click", function () {
      if (settled || spinning || dragging) return;
      launch(16 + Math.random() * 14);
    });
  }

  return { svg: svg, dial: dial, animateDial: animateDial, spinnable: spinnable };
})();

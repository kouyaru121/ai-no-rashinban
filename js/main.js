/* ==========================================================
   愛の羅針盤 — LP の挙動
   (ヘッダー / 年齢確認 / ヒーロー羅針盤 / 恋みくじ / 花びら)
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

  // ---------- ヒーローの巨大羅針盤 (針がカーソルを追う) ----------
  var heroCompass = document.getElementById("hero-compass");
  if (heroCompass && window.Compass) {
    heroCompass.innerHTML = Compass.svg(640, "hero-needle");
    var needle = document.getElementById("hero-needle");
    needle.style.transition = "none"; // rAF 追従するので CSS 遷移は切る
    var targetA = 0, currentA = 0;

    // カーソル方向へ針を向ける (スマホはスクロールでゆらぐ)
    document.addEventListener("pointermove", function (e) {
      var r = heroCompass.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      targetA = (Math.atan2(e.clientX - cx, -(e.clientY - cy)) * 180) / Math.PI;
    }, { passive: true });
    window.addEventListener("scroll", function () {
      targetA = Math.sin(window.scrollY / 300) * 40;
    }, { passive: true });

    // なめらかに追従
    (function follow() {
      var d = targetA - currentA;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      currentA += d * 0.06;
      needle.style.transform = "rotate(" + currentA + "deg)";
      requestAnimationFrame(follow);
    })();
  }

  // ---------- 今日の恋みくじ ----------
  var omikujiBtn = document.getElementById("omikuji-btn");
  if (omikujiBtn && window.Engine && window.DATA) {
    var today = new Date();
    var dateStr = today.getFullYear() + "年" + (today.getMonth() + 1) + "月" + today.getDate() + "日";
    document.getElementById("omikuji-date").textContent = dateStr + " の恋みくじ";

    omikujiBtn.addEventListener("click", function () {
      // 日付でシード固定: 同じ日は同じ結果 (引き直し不可の建て付け)
      var seed = Engine.hashSeed("omikuji|" + today.toDateString());
      var rng = Engine.createRng(seed);
      var rank = Engine.pick(rng, DATA.omikuji.ranks);
      var text = Engine.fill(Engine.pick(rng, DATA.omikuji.texts), {
        hour: Engine.pick(rng, DATA.hours),
        color: Engine.pick(rng, DATA.luckyColors),
        place: Engine.pick(rng, DATA.luckyPlaces),
        word: Engine.pick(rng, DATA.luckyWords)
      });
      var shareText = encodeURIComponent(
        "【愛の羅針盤】今日の恋みくじは「" + rank + "」🧭\n" + text +
        "\nhttps://kouyaru121.github.io/ai-no-rashinban/ #愛の羅針盤"
      );
      document.getElementById("omikuji-area").innerHTML =
        '<div class="omikuji-result">' +
        '<p class="omikuji-rank">' + rank + "</p>" +
        '<p class="omikuji-text">' + text + "</p>" +
        '<a class="btn btn-gold omikuji-cta" href="fortune.html?g=aisho">この先を、本鑑定で視る →</a>' +
        '<p class="omikuji-share"><a target="_blank" rel="noopener" href="https://www.threads.net/intent/post?text=' + shareText + '">🧭 みくじを Threads でシェア</a></p>' +
        "</div>";
    });
  }

  // ---------- 漂う花びら ----------
  var PETALS = 7;
  for (var i = 0; i < PETALS; i++) {
    var p = document.createElement("span");
    p.className = "petal";
    p.textContent = Math.random() > 0.5 ? "❀" : "✿";
    p.style.left = Math.random() * 100 + "vw";
    p.style.setProperty("--sway", (Math.random() * 160 - 80) + "px");
    p.style.animationDuration = (14 + Math.random() * 14) + "s";
    p.style.animationDelay = (Math.random() * 18) + "s";
    p.style.fontSize = (10 + Math.random() * 8) + "px";
    document.body.appendChild(p);
  }
})();

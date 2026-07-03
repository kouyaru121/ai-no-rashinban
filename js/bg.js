/* ==========================================================
   愛の羅針盤 — スクロール連動の背景演出 (LP / 鑑定ページ共通)
   ========================================================== */
(function () {
  "use strict";

  // ---------- 星を層ごとに生成 ----------
  // 各層に星をランダム配置。層ごとに視差速度を変えて奥行きを出す
  function seedStars(layerId, count, size, opacity) {
    var layer = document.getElementById(layerId);
    if (!layer) return;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      var s = document.createElement("span");
      s.className = "star-dot";
      s.style.left = Math.random() * 100 + "%";
      s.style.top = Math.random() * 140 + "%";
      s.style.width = s.style.height = size + "px";
      s.style.opacity = opacity;
      s.style.animationDelay = (Math.random() * 4).toFixed(2) + "s";
      s.style.animationDuration = (3 + Math.random() * 4).toFixed(2) + "s";
      frag.appendChild(s);
    }
    layer.appendChild(frag);
  }

  seedStars("stars-far", 130, 1, 0.55);
  seedStars("stars-mid", 70, 2, 0.75);
  seedStars("stars-near", 30, 3, 0.95);

  // ---------- スクロール視差 ----------
  var far = document.getElementById("stars-far");
  var mid = document.getElementById("stars-mid");
  var near = document.getElementById("stars-near");
  var moon = document.getElementById("moon");
  var fog1 = document.getElementById("fog1");
  var fog2 = document.getElementById("fog2");
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY || 0;
      // 奥の層ほどゆっくり動かす
      if (far)  far.style.transform  = "translateY(" + (-y * 0.06) + "px)";
      if (mid)  mid.style.transform  = "translateY(" + (-y * 0.14) + "px)";
      if (near) near.style.transform = "translateY(" + (-y * 0.26) + "px)";
      // 月はゆっくり沈みながら少し横へ、深く読むほど霞んで消える
      if (moon) {
        moon.style.transform = "translate(" + (-y * 0.04) + "px," + (y * 0.18) + "px)";
        moon.style.opacity = Math.max(0, 1 - y / 1200);
      }
      // 霧は左右にたなびく
      if (fog1) fog1.style.transform = "translate(" + (y * 0.08) + "px," + (-y * 0.05) + "px)";
      if (fog2) fog2.style.transform = "translate(" + (-y * 0.06) + "px," + (-y * 0.08) + "px)";
      ticking = false;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---------- スクロール出現 (.reveal) ----------
  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("shown");
          observer.unobserve(e.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  document.querySelectorAll(".reveal").forEach(function (el) {
    observer.observe(el);
  });
})();

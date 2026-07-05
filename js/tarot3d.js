/* ==========================================================
   愛の羅針盤 — 3Dタロット (three.js)
   紫苑がオーラの中でカードを配り、ユーザーが3枚選ぶ。
   WebGL が使えない環境では mount() が false を返し、
   呼び出し側が従来のCSS版にフォールバックする。
   ========================================================== */
var Tarot3D = (function () {
  "use strict";

  // ---------- カード面のテクスチャを Canvas で生成 ----------
  function makeCanvas(w, h, draw) {
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"));
    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  function backTexture() {
    return makeCanvas(256, 416, function (g) {
      var grad = g.createLinearGradient(0, 0, 256, 416);
      grad.addColorStop(0, "#3a2340");
      grad.addColorStop(1, "#241226");
      g.fillStyle = grad;
      g.fillRect(0, 0, 256, 416);
      // 金の縁
      g.strokeStyle = "#d9a67c";
      g.lineWidth = 6;
      g.strokeRect(10, 10, 236, 396);
      g.strokeStyle = "rgba(217,166,124,0.45)";
      g.lineWidth = 2;
      g.strokeRect(22, 22, 212, 372);
      // 中央の紋
      g.fillStyle = "#f3cfa6";
      g.font = "64px serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("✦", 128, 200);
      g.font = "22px serif";
      g.fillStyle = "rgba(242,149,181,0.85)";
      g.fillText("愛 の 羅 針 盤", 128, 260);
    });
  }

  function frontTexture(glyph, name) {
    return makeCanvas(256, 416, function (g) {
      var grad = g.createLinearGradient(0, 0, 256, 416);
      grad.addColorStop(0, "#52305a");
      grad.addColorStop(1, "#2c1730");
      g.fillStyle = grad;
      g.fillRect(0, 0, 256, 416);
      g.strokeStyle = "#f3cfa6";
      g.lineWidth = 6;
      g.strokeRect(10, 10, 236, 396);
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = "#f3cfa6";
      g.font = "110px serif";
      g.fillText(glyph, 128, 175);
      g.font = "34px serif";
      g.fillStyle = "#f7c6d5";
      g.fillText(name, 128, 320);
    });
  }

  // やわらかい光のスプライト (オーラ・粒子で共用)
  function glowTexture(inner, outer) {
    return makeCanvas(128, 128, function (g) {
      var grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
      grad.addColorStop(0, inner);
      grad.addColorStop(1, outer);
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
    });
  }

  // ---------- 簡易トゥイーン ----------
  var tweens = [];
  function tween(obj, to, dur, delay, ease, onEnd) {
    var from = {};
    Object.keys(to).forEach(function (k) { from[k] = obj[k]; });
    tweens.push({ obj: obj, from: from, to: to, dur: dur, delay: delay || 0, t: 0, ease: ease, onEnd: onEnd });
  }
  function easeOut(p) { return 1 - Math.pow(1 - p, 3); }
  function easeBack(p) { var s = 1.4; p -= 1; return p * p * ((s + 1) * p + s) + 1; }
  function stepTweens(dt) {
    for (var i = tweens.length - 1; i >= 0; i--) {
      var tw = tweens[i];
      if (tw.delay > 0) { tw.delay -= dt; continue; }
      tw.t += dt;
      var p = Math.min(1, tw.t / tw.dur);
      var e = (tw.ease || easeOut)(p);
      Object.keys(tw.to).forEach(function (k) {
        tw.obj[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
      });
      if (p >= 1) {
        tweens.splice(i, 1);
        if (tw.onEnd) tw.onEnd();
      }
    }
  }

  // ==========================================================
  // mount(container, cards, onProgress, onDone)
  //   cards: [["☽","月"], ...] / onProgress(残り枚数) / onDone([名前])
  // ==========================================================
  function mount(container, cards, onProgress, onDone) {
    if (!window.THREE) return false;
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      return false;
    }

    var W = container.clientWidth, H = container.clientHeight;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(W, H);
    container.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(0, 0, 14);

    // ---------- 背景: 紫苑 + オーラ ----------
    var loader = new THREE.TextureLoader();
    var aura = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture("rgba(242,149,181,0.55)", "rgba(242,149,181,0)"),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    aura.position.set(0, 0.4, -7.2);
    aura.scale.set(13, 13, 1);
    scene.add(aura);

    var aura2 = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture("rgba(243,207,166,0.4)", "rgba(243,207,166,0)"),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    aura2.position.set(0, 0.4, -7.1);
    aura2.scale.set(9, 9, 1);
    scene.add(aura2);

    loader.load("teller.jpg", function (tex) {
      var img = new THREE.Mesh(
        new THREE.CircleGeometry(3.4, 48),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92 })
      );
      img.position.set(0, 0.5, -7);
      scene.add(img);
    });

    // ---------- 舞い上がる光粒 ----------
    var P = 110;
    var pGeo = new THREE.BufferGeometry();
    var pos = new Float32Array(P * 3);
    var spd = [];
    for (var i = 0; i < P; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 18;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = -6 + Math.random() * 4;
      spd.push(0.15 + Math.random() * 0.45);
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    var points = new THREE.Points(pGeo, new THREE.PointsMaterial({
      map: glowTexture("rgba(255,235,245,0.9)", "rgba(255,235,245,0)"),
      size: 0.28,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    scene.add(points);

    // ---------- カード ----------
    var backTex = backTexture();
    var cardGroups = [];
    var picked = [];
    var CW = 1.5, CH = 2.44;

    // 扇形の目標配置 (2列×5枚)
    function slot(i) {
      var col = i % 5, row = Math.floor(i / 5);
      return {
        x: (col - 2) * 2.05,
        y: row === 0 ? 1.35 : -1.5,
        z: 0.6 + col * 0.02,
        rz: (col - 2) * -0.045
      };
    }

    cards.forEach(function (c, i) {
      var g = new THREE.Group();
      var back = new THREE.Mesh(
        new THREE.PlaneGeometry(CW, CH),
        new THREE.MeshBasicMaterial({ map: backTex })
      );
      var front = new THREE.Mesh(
        new THREE.PlaneGeometry(CW, CH),
        new THREE.MeshBasicMaterial({ map: frontTexture(c[0], c[1]) })
      );
      front.rotation.y = Math.PI; // 最初は裏向き
      g.add(back);
      g.add(front);

      // 配り: 紫苑の手元から扇形へ
      g.position.set(0, -1.6, -5.5);
      g.rotation.set(0.6, 0, (Math.random() - 0.5) * 1.2);
      g.scale.set(0.6, 0.6, 1);
      var s = slot(i);
      var d = 0.35 + i * 0.13;
      tween(g.position, { x: s.x, y: s.y, z: s.z }, 0.7, d, easeOut);
      tween(g.rotation, { x: 0, y: 0, z: s.rz }, 0.7, d, easeOut);
      tween(g.scale, { x: 1, y: 1 }, 0.7, d, easeOut);

      g.userData = { index: i, name: c[1], slot: s, picked: false, hovered: false };
      scene.add(g);
      cardGroups.push(g);
    });

    // ---------- 選択処理 ----------
    function pick(i) {
      var g = cardGroups[i];
      if (!g || g.userData.picked || picked.length >= 3) return;
      g.userData.picked = true;
      picked.push(g.userData.name);
      // 表へフリップしながら手前へ浮く
      tween(g.rotation, { y: Math.PI }, 0.7, 0, easeBack);
      tween(g.position, { z: g.position.z + 1.6, y: g.userData.slot.y + 0.25 }, 0.7);
      tween(g.scale, { x: 1.12, y: 1.12 }, 0.7);
      if (window.FX) {
        var r = container.getBoundingClientRect();
        FX.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 10 });
      }
      if (onProgress) onProgress(3 - picked.length);
      if (picked.length === 3) {
        // 選ばれなかったカードは静かに退場
        cardGroups.forEach(function (o) {
          if (!o.userData.picked) {
            tween(o.position, { y: o.position.y - 5 }, 0.8, 0.4);
          }
        });
        setTimeout(function () { onDone(picked.slice()); }, 1300);
      }
    }

    // レイキャストでタップ/ホバー
    var ray = new THREE.Raycaster();
    var ptr = new THREE.Vector2();
    function cardAt(e) {
      var r = renderer.domElement.getBoundingClientRect();
      ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(ptr, camera);
      var hits = ray.intersectObjects(cardGroups, true);
      return hits.length ? hits[0].object.parent : null;
    }
    renderer.domElement.addEventListener("pointerdown", function (e) {
      var g = cardAt(e);
      if (g) pick(g.userData.index);
    });
    renderer.domElement.addEventListener("pointermove", function (e) {
      var g = cardAt(e);
      cardGroups.forEach(function (o) {
        var want = (o === g && !o.userData.picked && picked.length < 3);
        if (want !== o.userData.hovered) {
          o.userData.hovered = want;
          tween(o.position, { z: o.userData.slot.z + (want ? 0.45 : 0) }, 0.25);
        }
      });
      renderer.domElement.style.cursor = g && !g.userData.picked ? "pointer" : "default";
    });

    // ---------- ループ ----------
    var clock = new THREE.Clock();
    var alive = true;
    (function loop() {
      if (!alive) return;
      if (!container.isConnected) { // ステップ遷移で DOM から外れたら停止
        alive = false;
        renderer.dispose();
        return;
      }
      requestAnimationFrame(loop);
      var dt = Math.min(0.05, clock.getDelta());
      var t = clock.elapsedTime;
      stepTweens(dt);
      // オーラの呼吸
      var b = 1 + Math.sin(t * 1.4) * 0.06;
      aura.scale.set(13 * b, 13 * b, 1);
      aura2.scale.set(9 / b, 9 / b, 1);
      aura.material.rotation = t * 0.06;
      // 光粒の上昇
      var arr = pGeo.attributes.position.array;
      for (var i = 0; i < P; i++) {
        arr[i * 3 + 1] += spd[i] * dt;
        arr[i * 3] += Math.sin(t + i) * 0.0015;
        if (arr[i * 3 + 1] > 6.5) arr[i * 3 + 1] = -6.5;
      }
      pGeo.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
    })();

    // リサイズ追従
    window.addEventListener("resize", function () {
      if (!container.isConnected) return;
      var w = container.clientWidth, h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });

    // テスト用フック (E2E検証でカードを選ぶために公開)
    window.__t3d = { pick: pick, count: function () { return picked.length; } };
    return true;
  }

  return { mount: mount };
})();

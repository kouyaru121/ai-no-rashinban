/* ==========================================================
   愛の羅針盤 — 鑑定室アプリ本体
   ウィザード進行 → 決定的生成 → 結果表示 → 課金導線
   ========================================================== */
(function () {
  "use strict";

  var $wizard = document.getElementById("wizard");
  var $result = document.getElementById("result");
  var $freeCount = document.getElementById("free-count");
  var $paywall = document.getElementById("paywall");
  var $register = document.getElementById("register");

  // ---------- 会員状態 ----------
  var LS = {
    used: "rashinban_free_used",
    reg: "rashinban_registered",
    prem: "rashinban_premium",
    lastDay: "rashinban_last_free_day"
  };

  function userTier() {
    if (localStorage.getItem(LS.prem)) return 2; // プレミアム
    if (localStorage.getItem(LS.reg)) return 1;  // 無料会員
    return 0;                                     // 未登録
  }

  // 無料鑑定の残り回数 (未登録:通算3回 / 無料会員:1日1回 / プレミアム:無制限)
  function freeLeft() {
    if (userTier() === 2) return Infinity;
    if (userTier() === 1) {
      var today = new Date().toDateString();
      if (localStorage.getItem(LS.lastDay) !== today) return 1;
      return 0;
    }
    return Math.max(0, 3 - (parseInt(localStorage.getItem(LS.used), 10) || 0));
  }

  function consumeFree() {
    if (userTier() === 2) return;
    if (userTier() === 1) {
      localStorage.setItem(LS.lastDay, new Date().toDateString());
    } else {
      var used = (parseInt(localStorage.getItem(LS.used), 10) || 0) + 1;
      localStorage.setItem(LS.used, used);
    }
    updateBadge();
  }

  function updateBadge() {
    var left = freeLeft();
    if (userTier() === 2) {
      $freeCount.textContent = "✦ プレミアム会員";
    } else if (left === 0) {
      $freeCount.textContent = "無料鑑定: 残り0回";
    } else {
      $freeCount.textContent = "無料鑑定: 残り" + left + "回";
    }
  }

  // ---------- モーダル ----------
  function openPaywall() {
    $paywall.hidden = false;
    Track.event("paywall_view", { genre: genre, tier: userTier() });
  }
  function closePaywall() { $paywall.hidden = true; }
  var pendingPlan = null;

  document.getElementById("paywall-close").addEventListener("click", closePaywall);
  document.getElementById("register-close").addEventListener("click", function () {
    $register.hidden = true;
  });

  document.querySelectorAll(".paywall-plan").forEach(function (btn) {
    btn.addEventListener("click", function () {
      pendingPlan = btn.dataset.plan;
      // 課金意思の計測 (反応テストの主要KPI)
      Track.event("plan_select", { plan: pendingPlan, genre: genre });
      closePaywall();
      document.getElementById("register-title").textContent =
        pendingPlan === "premium" ? "先行会員登録 (いまは無料)" : "無料会員登録";
      document.getElementById("register-submit").textContent =
        pendingPlan === "premium" ? "先行登録して全章を解放する" : "登録して続きを読む";
      $register.hidden = false;
    });
  });

  document.getElementById("register-form").addEventListener("submit", function (e) {
    e.preventDefault();
    localStorage.setItem(LS.reg, "1");
    if (pendingPlan === "premium") localStorage.setItem(LS.prem, "1");
    Track.event("register_submit", { plan: pendingPlan || "free", genre: genre });
    $register.hidden = true;
    updateBadge();
    // 結果表示中なら解放状態で再描画
    if (lastResultRenderer) lastResultRenderer();
  });

  // ==========================================================
  // ウィザード定義
  // ==========================================================
  var GENRES = {
    aisho: {
      title: "ふたりの相性 完全鑑定",
      steps: ["intro", "you", "partner", "relation", "want", "depth", "color", "contact", "tarot", "moon", "compass"]
    },
    renai: {
      title: "恋愛成就の行方",
      steps: ["intro", "you", "partner", "stage", "want", "depth", "color", "tarot", "compass"]
    },
    furin: {
      title: "許されない恋の結末",
      steps: ["intro", "you", "partner", "years", "hisword", "depth", "color", "tarot", "compass"]
    },
    uwaki: {
      title: "浮気の兆候 徹底診断",
      steps: ["intro", "you", "partner", "sign1", "sign2", "sign3", "depth", "compass"]
    }
  };

  // 動作確認用: ?reset=1 で状態を初期化 (無料回数・会員状態・鑑定書棚をリセット)
  if (new URLSearchParams(location.search).get("reset") === "1") {
    localStorage.clear();
    localStorage.setItem("rashinban_age_ok", "1");
  }

  var genre = (new URLSearchParams(location.search).get("g")) || "aisho";
  if (!GENRES[genre]) genre = "aisho";
  var conf = GENRES[genre];

  var answers = {};      // ユーザーの全回答
  var stepIndex = 0;
  var lastResultRenderer = null;

  // ---------- 進捗バー (2歩目以降は戻るボタン付き) ----------
  function progressHtml() {
    var pct = Math.round((stepIndex / conf.steps.length) * 100);
    var back = stepIndex > 1
      ? '<button class="wizard-back" data-back>‹ 戻る</button>'
      : "";
    return (
      '<div class="progress">' + back +
      '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
      '<span class="progress-text">' + stepIndex + " / " + conf.steps.length + "</span></div>"
    );
  }

  // 戻るボタン (イベント委譲で全ステップに対応)
  $wizard.addEventListener("click", function (e) {
    if (e.target.closest("[data-back]") && stepIndex > 1) {
      stepIndex--;
      renderStep();
    }
  });

  function next() {
    stepIndex++;
    if (stepIndex >= conf.steps.length) {
      startDivining();
    } else {
      renderStep();
    }
  }

  // ---------- 各ステップの描画 ----------
  var STEPS = {

    intro: function () {
      var leadMap = {
        aisho: "全20章・365日カレンダー付きの当館最大の鑑定です。<br>ふたりの情報を、星に照らします。",
        renai: "相手の本音と、動くべき日付までを鑑定します。",
        furin: "誰にも話せないその関係の、行き着く先を静かに視ます。<br>入力内容が外部に出ることはありません。",
        uwaki: "違和感の正体を、行動サインから割り出します。<br>覚悟ができたら、始めてください。"
      };
      // 保存済みの鑑定書があれば書棚として並べる (何度でも読み返せる)
      var history = loadHistory();
      var shelf = "";
      if (history.length) {
        shelf = '<div class="shelf"><p class="shelf-title">✦ あなたの鑑定書棚</p>';
        history.forEach(function (h, i) {
          var d = new Date(h.ts);
          var gname = { aisho: "相性完全鑑定", renai: "恋愛成就", furin: "許されない恋", uwaki: "浮気診断" }[h.genre] || "";
          shelf +=
            '<button class="shelf-item" data-h="' + i + '">' +
            '<span class="shelf-names">' + h.answers.you.name + " ✦ " + h.answers.partner.name + "</span>" +
            '<span class="shelf-meta">' + gname + " / " + (d.getMonth() + 1) + "月" + d.getDate() + "日</span></button>";
        });
        shelf += "</div>";
      }
      // 無料回数を使い切っている場合は、理由と次の一手を明示する
      var exhausted = freeLeft() <= 0;
      var startArea = exhausted
        ? '<div class="step-next"><button class="btn btn-gold btn-lg" id="go">先行登録して鑑定する<span class="btn-sub">無料・メールだけ</span></button></div>' +
          '<p class="step-sub" style="margin-top:14px">無料鑑定を使い切りました。先行会員登録 (無料) で' +
          (userTier() >= 1 ? "明日また1回鑑定できます。" : "続きが解放されます。") + "</p>"
        : '<div class="step-next"><button class="btn btn-gold btn-lg" id="go">鑑定をはじめる</button></div>';
      $wizard.innerHTML =
        progressHtml() +
        '<div class="step"><h1 class="step-q">' + conf.title + "</h1>" +
        '<p class="step-sub">' + leadMap[genre] + "</p>" +
        startArea + shelf + "</div>";
      document.getElementById("go").addEventListener("click", function () {
        if (freeLeft() <= 0) { openPaywall(); return; }
        Track.event("fortune_start", { genre: genre });
        next();
      });
      $wizard.querySelectorAll(".shelf-item").forEach(function (b) {
        b.addEventListener("click", function () {
          var h = history[parseInt(b.dataset.h, 10)];
          genre = h.genre;          // 別ジャンルの鑑定書もその場で開ける
          conf = GENRES[genre];
          answers = h.answers;      // 読み返しは無料 (回数を消費しない)
          showResult();
        });
      });
    },

    you: function () { personForm("あなた", "you"); },
    partner: function () {
      var label = genre === "uwaki" ? "パートナー" : "お相手";
      personForm(label, "partner");
    },

    relation: function () {
      choiceStep("ふたりの現在の関係は?", "この選択で鑑定の視点が変わります", [
        ["片想い・友人以上恋人未満", "rel_kataomoi"],
        ["交際中", "rel_kousai"],
        ["複雑な関係 (訳あり)", "rel_fukuzatsu"],
        ["夫婦・長年のパートナー", "rel_fufu"]
      ], "relation");
    },

    stage: function () {
      choiceStep("その恋は今、どの段階ですか?", "正直に選ぶほど精度が上がります", [
        ["まだ想いを伝えていない", "st_himitsu"],
        ["いい感じだが進展しない", "st_teitai"],
        ["一度離れた相手 (復縁希望)", "st_fukuen"],
        ["気持ちが読めなくて不安", "st_fuan"]
      ], "stage");
    },

    want: function () {
      choiceStep("いちばん知りたいことは?", "鑑定の重心をここに置きます", [
        ["相手の今の本音", "w_honne"],
        ["ふたりの未来・結末", "w_mirai"],
        ["私がとるべき行動", "w_koudou"],
        ["関係が動く時期", "w_jiki"]
      ], "want");
    },

    contact: function () {
      choiceStep("相手との連絡の頻度は?", "ふたりの「現在の温度」を測ります", [
        ["ほぼ毎日", "c_everyday"],
        ["週に数回", "c_week"],
        ["相手からは滅多に来ない", "c_rare"],
        ["今は途絶えている", "c_none"]
      ], "contact");
    },

    years: function () {
      choiceStep("その関係は、どのくらい続いていますか?", "", [
        ["半年未満", "y_half"],
        ["半年〜2年", "y_two"],
        ["2年〜5年", "y_five"],
        ["5年以上", "y_more"]
      ], "years");
    },

    hisword: function () {
      choiceStep("彼は「家庭」について、あなたに何と?", "言葉は鑑定の重要な材料です", [
        ["「いずれ別れる」と言っている", "h_wakareru"],
        ["家庭の話はほとんどしない", "h_shinai"],
        ["家庭の愚痴をよく話す", "h_guchi"],
        ["「今のままでいたい」と言う", "h_ima"]
      ], "hisword");
    },

    sign1: function () {
      choiceStep("スマホの扱いに変化はありますか?", "兆候診断 1/3", [
        ["画面を伏せて置くようになった", "s1_fuseru"],
        ["ロックや通知設定が変わった", "s1_lock"],
        ["風呂・トイレにも持っていく", "s1_furo"],
        ["特に変化はない", "s1_none"]
      ], "sign1");
    },

    sign2: function () {
      choiceStep("帰宅時間・外出に変化は?", "兆候診断 2/3", [
        ["残業や休日出勤が急に増えた", "s2_zangyo"],
        ["一人の外出が増えた", "s2_hitori"],
        ["身だしなみに気を遣い始めた", "s2_minari"],
        ["特に変化はない", "s2_none"]
      ], "sign2");
    },

    sign3: function () {
      choiceStep("あなたへの態度はどうですか?", "兆候診断 3/3", [
        ["急に優しくなる日がある", "s3_yasashii"],
        ["会話が減った・上の空", "s3_uwanosora"],
        ["些細なことで苛立つ", "s3_iradachi"],
        ["変わらない (だから逆に不安)", "s3_kawaranai"]
      ], "sign3");
    },

    depth: function () {
      var labels = ["まだ余裕がある", "時々考え込む", "毎日頭から離れない", "夜も眠れないほど", "限界が近い"];
      $wizard.innerHTML =
        progressHtml() +
        '<div class="step"><h2 class="step-q">いまの悩みの深さを教えてください</h2>' +
        '<p class="step-sub">直感で構いません。バーを動かして。</p>' +
        '<div class="slider-wrap">' +
        '<div class="slider-value" id="sv">50</div>' +
        '<div class="slider-label" id="sl">' + labels[2] + "</div>" +
        '<input type="range" id="sr" min="0" max="100" value="50">' +
        '<div class="slider-ends"><span>まだ浅い</span><span>とても深い</span></div>' +
        '</div><div class="step-next"><button class="btn btn-gold" id="go">これで決める</button></div></div>';
      var sr = document.getElementById("sr");
      sr.addEventListener("input", function () {
        var sv = document.getElementById("sv");
        sv.textContent = sr.value;
        document.getElementById("sl").textContent = labels[Math.min(4, Math.floor(sr.value / 21))];
        // 数値が弾むポップ
        sv.classList.remove("pop");
        void sv.offsetWidth;
        sv.classList.add("pop");
      });
      document.getElementById("go").addEventListener("click", function () {
        answers.depth = sr.value;
        next();
      });
    },

    tarot: function () {
      var CARDS = [
        ["☽", "月"], ["☀", "太陽"], ["★", "星"], ["♡", "恋人"], ["⚖", "正義"],
        ["♛", "女帝"], ["⚔", "塔"], ["✋", "力"], ["🕊", "審判"], ["∞", "魔術師"]
      ];
      $wizard.innerHTML =
        progressHtml() +
        '<div class="step"><h2 class="step-q">導きのカードを3枚、選んでください</h2>' +
        '<p class="step-sub" id="ts">紫苑が、あなたのためにカードを配っています——</p>' +
        '<div class="tarot3d" id="t3d"></div>' +
        '<p class="tarot-count" id="tc">あと 3 枚</p></div>';

      function onProgress(remain) {
        document.getElementById("tc").textContent =
          remain <= 0 ? "カードが揃いました…" : "あと " + remain + " 枚";
      }
      function onDone(picked) {
        answers.tarot = picked;
        next();
      }

      // 3D版 (three.js) → 失敗したら従来のCSS版へフォールバック
      var ok = false;
      try {
        ok = window.Tarot3D && Tarot3D.mount(document.getElementById("t3d"), CARDS, onProgress, onDone);
      } catch (e) { ok = false; }
      if (ok) return;

      // ---------- フォールバック (CSS版) ----------
      document.getElementById("ts").textContent = "考えず、指が止まったものを。あなたの無意識が選びます。";
      var t3d = document.getElementById("t3d");
      t3d.outerHTML = '<div class="tarot-field" id="tf"></div>';
      var tf = document.getElementById("tf");
      var picked = [];
      CARDS.forEach(function (c, i) {
        var card = document.createElement("div");
        card.className = "tarot-card";
        card.style.animationDelay = (i * 0.06) + "s";
        card.innerHTML =
          '<div class="tarot-face tarot-back">✦</div>' +
          '<div class="tarot-face tarot-front" style="display:flex">' + c[0] + "<small>" + c[1] + "</small></div>";
        card.addEventListener("click", function () {
          if (picked.length >= 3 || card.classList.contains("flipped")) return;
          card.classList.add("flipped");
          picked.push(c[1]);
          onProgress(3 - picked.length);
          if (picked.length === 3) setTimeout(function () { onDone(picked); }, 900);
        });
        tf.appendChild(card);
      });
    },

    // 直感の色選び
    color: function () {
      var html =
        progressHtml() +
        '<div class="step"><h2 class="step-q">いまのふたりを表す色は?</h2>' +
        '<p class="step-sub">考えないで。最初に目が留まった色に触れてください。</p>' +
        '<div class="color-grid">';
      DATA.colors.forEach(function (c, i) {
        html += '<button class="color-swatch" data-i="' + i + '" style="background:radial-gradient(circle at 32% 28%, rgba(255,255,255,0.35), transparent 40%), ' + c.code + ';animation-delay:' + (i * 0.05) + 's"><span>' + c.name + "</span></button>";
      });
      html += "</div></div>";
      $wizard.innerHTML = html;
      var picked = false;
      $wizard.querySelectorAll(".color-swatch").forEach(function (b) {
        b.addEventListener("click", function () {
          if (picked) return;
          picked = true;
          b.classList.add("chosen");
          answers.color = parseInt(b.dataset.i, 10);
          setTimeout(next, 340);
        });
      });
    },

    // 月相選び
    moon: function () {
      var html =
        progressHtml() +
        '<div class="step"><h2 class="step-q">いまの心に近い月は、どれですか</h2>' +
        '<p class="step-sub">月はあなたの深層を映します。直感で。</p>' +
        '<div class="moon-grid">';
      DATA.moons.forEach(function (m, i) {
        html += '<button class="moon-btn" data-i="' + i + '"><span class="moon-icon">' + ICONS.moons[i] + "</span>" + m.name + "</button>";
      });
      html += "</div></div>";
      $wizard.innerHTML = html;
      var picked = false;
      $wizard.querySelectorAll(".moon-btn").forEach(function (b) {
        b.addEventListener("click", function () {
          if (picked) return;
          picked = true;
          b.classList.add("chosen");
          answers.moon = parseInt(b.dataset.i, 10);
          setTimeout(next, 340);
        });
      });
    },

    // 羅針盤を回す (フィナーレの儀式)
    compass: function () {
      $wizard.innerHTML =
        progressHtml() +
        '<div class="step"><h2 class="step-q">最後に、羅針盤を回してください</h2>' +
        '<p class="step-sub">' + (answers.partner ? answers.partner.name + "さん" : "あの人") + "を思い浮かべながら、指で勢いをつけて。<br>針が止まった場所が、ふたりの縁の入口です。</p>" +
        '<div class="compass-tilt" id="ctilt"><div class="compass-stage" id="cstage">' + Compass.svg(320, null) + "</div></div>" +
        '<p class="compass-hint" id="chint">— 指でまわす —</p></div>';
      var stage = document.getElementById("cstage");

      // 3Dチルト: 指の位置へ盤面がわずかに傾く
      var tilt = document.getElementById("ctilt");
      tilt.addEventListener("pointermove", function (e) {
        var r = tilt.getBoundingClientRect();
        var dx = (e.clientX - r.left) / r.width - 0.5;
        var dy = (e.clientY - r.top) / r.height - 0.5;
        stage.style.transform = "rotateX(" + (-dy * 16) + "deg) rotateY(" + (dx * 16) + "deg)";
      });
      tilt.addEventListener("pointerleave", function () {
        stage.style.transform = "rotateX(0deg) rotateY(0deg)";
      });
      Compass.spinnable(stage, function (finalAngle) {
        answers.compassAngle = Math.round(finalAngle);
        var dirs = ["愛", "縁", "情", "運"];
        var dir = dirs[Math.round(finalAngle / 90) % 4];
        document.getElementById("chint").textContent = "針は「" + dir + "」を指しました";
        if (window.FX) FX.heartBurst(stage); // 止まった瞬間、ハートが舞う
        setTimeout(next, 1400);
      });
    }
  };

  // 名前+生年月日+血液型の共通フォーム
  function personForm(label, key) {
    var years = "";
    var nowY = new Date().getFullYear();
    for (var y = nowY - 18; y >= nowY - 80; y--) years += "<option>" + y + "</option>";
    var months = "", days = "";
    for (var m = 1; m <= 12; m++) months += "<option>" + m + "</option>";
    for (var d = 1; d <= 31; d++) days += "<option>" + d + "</option>";

    $wizard.innerHTML =
      progressHtml() +
      '<div class="step"><h2 class="step-q">' + label + "のことを教えてください</h2>" +
      '<p class="step-sub">生年月日は星を読むための必須情報です</p>' +
      '<form class="input-form" id="pf">' +
      "<label>お名前 (ニックネーム可)" +
      '<input type="text" id="f-name" placeholder="例: ' + (key === "you" ? "みさき" : "ゆうと") + '" required></label>' +
      "<label>生年月日" +
      '<div class="birth-row">' +
      '<select id="f-year" required><option value="">年</option>' + years + "</select>" +
      '<select id="f-month" required><option value="">月</option>' + months + "</select>" +
      '<select id="f-day" required><option value="">日</option>' + days + "</select>" +
      "</div></label>" +
      '<p class="live-sign" id="live-sign"></p>' +
      "<label>血液型" +
      '<select id="f-blood"><option>A</option><option>B</option><option>O</option><option>AB</option><option value="A">わからない</option></select></label>' +
      '<div class="step-next"><button type="submit" class="btn btn-gold">次へ</button></div>' +
      "</form></div>";

    // 戻ってきた時は前回の入力を復元
    var prev = answers[key];
    if (prev) {
      document.getElementById("f-name").value = prev.name;
      document.getElementById("f-year").value = prev.year;
      document.getElementById("f-month").value = prev.month;
      document.getElementById("f-day").value = prev.day;
      document.getElementById("f-blood").value = prev.blood;
    }

    // 生年月日が揃った瞬間に星座・干支を映す (視られている感)
    ["f-year", "f-month", "f-day"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", function () {
        var y = document.getElementById("f-year").value;
        var m = document.getElementById("f-month").value;
        var d = document.getElementById("f-day").value;
        var el = document.getElementById("live-sign");
        if (y && m && d) {
          var prof = Engine.buildProfile({ name: "", year: y, month: m, day: d });
          el.textContent = "✦ " + prof.zodiac + "・" + prof.eto + "年・運命数" + prof.lifePath;
          el.classList.add("shown");
        } else {
          el.textContent = "";
          el.classList.remove("shown");
        }
      });
    });

    document.getElementById("pf").addEventListener("submit", function (e) {
      e.preventDefault();
      answers[key] = {
        name: document.getElementById("f-name").value.trim(),
        year: document.getElementById("f-year").value,
        month: document.getElementById("f-month").value,
        day: document.getElementById("f-day").value,
        blood: document.getElementById("f-blood").value
      };
      next();
    });
  }

  // 選択肢ステップの共通描画
  function choiceStep(q, sub, options, key) {
    var html = progressHtml() + '<div class="step"><h2 class="step-q">' + q + "</h2>";
    if (sub) html += '<p class="step-sub">' + sub + "</p>";
    html += '<div class="choice-list">';
    options.forEach(function (o) {
      html += '<button class="choice-btn" data-v="' + o[1] + '">' + o[0] + "</button>";
    });
    html += "</div></div>";
    $wizard.innerHTML = html;
    var picked = false;
    $wizard.querySelectorAll(".choice-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        if (picked) return;
        picked = true;
        b.classList.add("chosen"); // 選んだ瞬間に光ってから進む
        answers[key] = b.dataset.v;
        answers[key + "_label"] = b.textContent;
        setTimeout(next, 300);
      });
    });
  }

  function renderStep() {
    STEPS[conf.steps[stepIndex]]();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ==========================================================
  // 鑑定中の演出 → 結果へ
  // ==========================================================
  function startDivining() {
    consumeFree();
    var msgs = [
      "ふたりの星を照合しています…",
      "月の巡りを読んでいます…",
      answers.tarot ? "カード「" + answers.tarot.join("・") + "」の声を聴いています…" : "気の流れを読んでいます…",
      "縁の糸を辿っています…",
      "鑑定書を綴っています…"
    ];
    $wizard.innerHTML =
      '<div class="divining"><div class="divining-compass">' + Compass.svg(170, "dvn") + "</div>" +
      '<p class="divining-msg" id="dm"></p></div>';
    var i = 0;
    var dm = document.getElementById("dm");
    dm.textContent = msgs[0];
    var timer = setInterval(function () {
      i++;
      if (i >= msgs.length) {
        clearInterval(timer);
        showResult();
        return;
      }
      dm.textContent = msgs[i];
    }, 1100);
  }

  // ==========================================================
  // 結果生成
  // ==========================================================
  // ---------- 鑑定書棚 (履歴) ----------
  function loadHistory() {
    var list = [];
    try { list = JSON.parse(localStorage.getItem("rashinban_history") || "[]"); } catch (e) {}
    // 旧形式 (rashinban_last_*) からの引き継ぎ
    if (!list.length) {
      ["aisho", "renai", "furin", "uwaki"].forEach(function (g) {
        var old = localStorage.getItem("rashinban_last_" + g);
        if (old) {
          try { list.push({ genre: g, answers: JSON.parse(old), ts: Date.now() }); } catch (e) {}
        }
      });
    }
    return list;
  }

  function saveToHistory() {
    var list = loadHistory();
    var key = genre + JSON.stringify(answers);
    list = list.filter(function (h) { return h.genre + JSON.stringify(h.answers) !== key; });
    list.unshift({ genre: genre, answers: answers, ts: Date.now() });
    if (list.length > 10) list = list.slice(0, 10); // 最大10冊
    try { localStorage.setItem("rashinban_history", JSON.stringify(list)); } catch (e) {}
  }

  function showResult() {
    // 鑑定書棚に保存 (リロード後も読み返せる)
    saveToHistory();
    Track.event("fortune_complete", { genre: genre, tier: userTier() });

    var u = Engine.buildProfile(answers.you);
    var p = Engine.buildProfile(answers.partner);

    // 同じ入力なら同じ結果になるシード (意図的な選択も織り込む)
    var seedStr = genre + "|" + JSON.stringify(answers.you) + "|" + JSON.stringify(answers.partner) +
      "|" + (answers.relation || answers.stage || answers.years || answers.sign1 || "") +
      "|" + (answers.color !== undefined ? answers.color : "") +
      "|" + (answers.moon !== undefined ? answers.moon : "");
    var seed = Engine.hashSeed(seedStr);

    // テンプレ差し込み用の共通コンテキスト
    var rng = Engine.createRng(seed);
    var d1 = Engine.futureDate(rng, 5, 30);
    var d2 = Engine.futureDate(rng, 31, 70);
    var d3 = Engine.futureDate(rng, 71, 120);
    var ctx = {
      u: u.name, p: p.name,
      uz: u.zodiac, pz: p.zodiac,
      ub: u.blood, pb: p.blood,
      ue: u.eto, pe: p.eto,
      uelem: u.element, pelem: p.element, elem: u.element,
      date1: Engine.fmtDate(d1), date2: Engine.fmtDate(d2), date3: Engine.fmtDate(d3),
      wd: Engine.pick(rng, ["月", "火", "水", "木", "金", "土", "日"]),
      hour: Engine.pick(rng, DATA.hours),
      month: Engine.rangeInt(rng, 1, 12),
      days: Engine.rangeInt(rng, 10, 24),
      hours: Engine.rangeInt(rng, 6, 12),
      item: Engine.pick(rng, DATA.luckyItems),
      color: Engine.pick(rng, DATA.luckyColors),
      place: Engine.pick(rng, DATA.luckyPlaces),
      score: 0, level: 0
    };

    // 相性スコア: 悩みが深い人ほど「希望と現実味」のある帯に寄せる
    var base = 62 + Math.floor(rng() * 27); // 62〜88
    ctx.score = base;
    ctx.level = Engine.rangeInt(rng, 3, 7);

    var renderers = { aisho: renderAisho, renai: renderSimple, furin: renderSimple, uwaki: renderSimple };
    lastResultRenderer = function () {
      renderers[genre](u, p, seed, ctx);
    };
    $wizard.innerHTML = "";
    $result.hidden = false;
    lastResultRenderer();
    initReadProgress();
    window.scrollTo({ top: 0 });
  }

  // ---------- 読了プログレスバー + モバイル固定CTA ----------
  var readProgressInit = false;
  function initReadProgress() {
    if (readProgressInit) return;
    readProgressInit = true;
    if (!document.querySelector(".read-progress")) {
      var bar = document.createElement("div");
      bar.className = "read-progress";
      document.body.appendChild(bar);
    }
    if (!document.querySelector(".sticky-cta") && userTier() < 2) {
      var cta = document.createElement("div");
      cta.className = "sticky-cta";
      cta.innerHTML =
        '<p class="sticky-cta-text"><strong>この鑑定書の続きを解放</strong>全章 + 365日カレンダー</p>' +
        '<button class="btn btn-gold">初月¥480</button>';
      cta.querySelector(".btn").addEventListener("click", openPaywall);
      document.body.appendChild(cta);
    }
    window.addEventListener("scroll", function () {
      var h = document.body.scrollHeight - window.innerHeight;
      var pct = h > 0 ? (window.scrollY / h) * 100 : 0;
      var bar = document.querySelector(".read-progress");
      if (bar) bar.style.width = pct + "%";
      // ある程度読み進めたら固定CTAを出す
      var cta = document.querySelector(".sticky-cta");
      if (cta) cta.classList.toggle("show", pct > 18 && userTier() < 2);
    }, { passive: true });
  }

  // 章HTMLの組み立て (tier: 0=無料 1=無料会員 2=プレミアム)
  function chapterHtml(no, title, bodyHtml, tier) {
    var tierNow = userTier();
    if (tier <= tierNow) {
      var openCls = no <= 1 ? " open" : "";
      return (
        '<section class="chapter' + openCls + '">' +
        '<button class="chapter-head" data-toggle><span class="chapter-no">第' + no + '章</span>' +
        title + '<span class="chapter-arrow">▾</span></button>' +
        '<div class="chapter-body">' + bodyHtml + "</div></section>"
      );
    }
    // ロック章: 冒頭をぼかして見せ、開こうとすると課金モーダル
    var teaser = bodyHtml.replace(/<[^>]+>/g, " ").slice(0, 90);
    var need = tier === 1 ? "無料会員登録で解放" : "プレミアムで解放";
    return (
      '<section class="chapter locked">' +
      '<button class="chapter-head" data-paywall><span class="chapter-no">第' + no + '章</span>' +
      title + '<span class="lock-icon">' + ICONS.lock + "</span></button>" +
      '<div class="locked-preview"><p class="locked-text">' + teaser + "…</p>" +
      '<div class="locked-cta"><p>✦ ' + need + " ✦</p></div></div></section>"
    );
  }

  function bindChapterEvents() {
    var chapters = Array.prototype.slice.call($result.querySelectorAll(".chapter"));

    // 各章に id を振り、開いた章の末尾に「次の章へ」を付ける
    chapters.forEach(function (ch, i) {
      ch.id = "ch-" + (i + 1);
      var body = ch.querySelector(".chapter-body");
      var nextCh = chapters[i + 1];
      if (body && nextCh) {
        var btn = document.createElement("button");
        btn.className = "next-chapter";
        btn.textContent = "▸ 次の章へすすむ";
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          ch.classList.remove("open");
          if (nextCh.classList.contains("locked")) {
            openPaywall();
          } else {
            nextCh.classList.add("open");
          }
          nextCh.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        body.appendChild(btn);
      }
    });

    // 目次を結果ヘッダー直後に生成 (章が6つ以上あるときだけ)
    if (chapters.length >= 6 && !$result.querySelector(".toc")) {
      var toc = document.createElement("nav");
      toc.className = "toc";
      var links = "";
      chapters.forEach(function (ch, i) {
        var no = i + 1;
        var title = ch.querySelector(".chapter-head").textContent.replace(/^第\d+章/, "").replace(/[▾🔒]/g, "").trim();
        var locked = ch.classList.contains("locked");
        links += '<a href="#ch-' + no + '" class="' + (locked ? "toc-locked" : "") + '">' +
          '<span class="toc-no">' + no + "章</span>" + title + (locked ? " " + ICONS.lock : "") + "</a>";
      });
      toc.innerHTML = '<p class="toc-title">✦ 鑑定書の目次</p><div class="toc-grid">' + links + "</div>";
      var head = $result.querySelector(".result-head");
      head.parentNode.insertBefore(toc, head.nextSibling);
      toc.querySelectorAll("a").forEach(function (a, i) {
        a.addEventListener("click", function (e) {
          e.preventDefault();
          var ch = chapters[i];
          if (!ch.classList.contains("locked")) ch.classList.add("open");
          ch.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    }

    $result.querySelectorAll("[data-toggle]").forEach(function (h) {
      h.addEventListener("click", function () {
        h.closest(".chapter").classList.toggle("open");
      });
    });
    $result.querySelectorAll("[data-paywall], .locked-preview").forEach(function (el) {
      el.addEventListener("click", openPaywall);
    });
    var share = $result.querySelector(".share-threads");
    if (share) {
      share.addEventListener("click", function () {
        Track.event("share_click", { genre: genre, source: "result" });
      });
    }
    var again = $result.querySelector(".again");
    if (again) again.addEventListener("click", function () { location.href = "index.html#menu"; });
  }

  function para(t) { return "<p>" + t + "</p>"; }
  function fillPick(rng, arr, ctx) { return Engine.fill(Engine.pick(rng, arr), ctx); }
  function fillPickN(rng, arr, n, ctx) {
    return Engine.pickN(rng, arr, n).map(function (t) { return para(Engine.fill(t, ctx)); }).join("");
  }

  // ==========================================================
  // 相性占い (全20章 + 365日)
  // ==========================================================
  function renderAisho(u, p, seed, ctx) {
    var rng = Engine.createRng(seed + 7);
    var C = DATA.chapters;

    var zRel = Engine.zodiacRelation(u.zodiacIndex, p.zodiacIndex);
    var eRel = Engine.elementRelation(u.element, p.element);
    var etoR = Engine.etoRelation(u.etoIndex, p.etoIndex);
    var bloodKey = u.blood + "×" + p.blood;

    var html =
      '<div class="result-head">' +
      '<p class="result-eyebrow">COMPATIBILITY READING</p>' +
      '<h1 class="result-title">ふたりの鑑定書</h1>' +
      '<div class="result-pair">' +
      '<span class="pair-name">' + u.name + '<span class="pair-sub">' + u.zodiac + "・" + u.blood + "型・" + u.eto + "年</span></span>" +
      '<span class="pair-and">✦</span>' +
      '<span class="pair-name">' + p.name + '<span class="pair-sub">' + p.zodiac + "・" + p.blood + "型・" + p.eto + "年</span></span>" +
      "</div>" +
      '<p class="result-sub">全20章 + 365日相性カレンダー</p>' +
      Compass.dial(ctx.score) +
      todayBox(seed, ctx) +
      "</div>";

    // ---- 第1〜3章 (無料) ----
    html += chapterHtml(1, "ふたりの縁の正体 — 総合相性",
      para(Engine.fill(DATA.zodiacRelText[Math.min(zRel, 6)], ctx)) +
      para(Engine.fill(DATA.elementText[eRel], ctx)) +
      '<div class="oracle-box"><strong>総合相性 ' + ctx.score + "点</strong>。この点数の意味は、最終章で全てつながります。</div>", 0);

    html += chapterHtml(2, "血が語るふたりの温度",
      para(Engine.fill(DATA.bloodPair[bloodKey] || DATA.bloodPair["A×O"], ctx)), 0);

    html += chapterHtml(3, "生まれ年が結ぶ縁 — 干支の配置",
      para(Engine.fill(DATA.etoRel[etoR], ctx)) +
      para("ここまでが、ふたりの縁の「骨格」です。第4章からは、恋愛・結婚・危機・攻略——縁の「肉付き」に踏み込みます。"), 0);

    // ---- 第4〜6章 (無料会員) ----
    html += chapterHtml(4, "恋愛相性 — 主導権と温度差",
      para(fillPick(rng, C.loveIntro, ctx)) + fillPickN(rng, C.loveCore, 2, ctx) +
      '<div class="oracle-box">' + fillPick(rng, C.loveAdvice, ctx) + "</div>", 1);

    html += chapterHtml(5, "価値観と金銭感覚のすり合わせ", fillPickN(rng, C.valueCore, 2, ctx), 1);
    html += chapterHtml(6, "ケンカの型と、仲直りの作法", fillPickN(rng, C.fightCore, 2, ctx), 1);

    // ---- 第7〜20章 (プレミアム) ----
    html += chapterHtml(7, "スキンシップと心地よい距離", fillPickN(rng, C.touchCore, 2, ctx), 2);
    html += chapterHtml(8, "結婚相性 — " + ctx.score + "点の内訳", fillPickN(rng, C.marriageCore, 2, ctx), 2);
    html += chapterHtml(9, "周囲の反応と、視えている障害", fillPickN(rng, C.obstacleCore, 2, ctx), 2);
    html += chapterHtml(10, p.name + "の深層心理 — 今週の心の中", fillPickN(rng, C.psycheCore, 2, ctx), 2);

    // 転機の日付3つ
    var turning = para(fillPick(rng, C.turningIntro, ctx));
    [ctx.date1, ctx.date2, ctx.date3].forEach(function (d, i) {
      turning += '<div class="oracle-box"><strong>' + d + "</strong> — " +
        Engine.fill(Engine.pickN(rng, C.turningEvents, 3)[i % 3], ctx) + "</div>";
    });
    html += chapterHtml(11, "運命が動く3つの日付", turning, 2);

    html += chapterHtml(12, "これから12ヶ月の詳細運勢", monthlyHtml(seed, ctx), 2);
    html += chapterHtml(13, "危機の予兆と、その回避法", fillPickN(rng, C.crisisCore, 2, ctx), 2);
    html += chapterHtml(14, "3年後までの未来シナリオ", fillPickN(rng, C.futureCore, 2, ctx), 2);
    html += chapterHtml(15, p.name + "の心の落とし方", fillPickN(rng, C.strategyCore, 2, ctx), 2);
    html += chapterHtml(16, "すれ違い・復縁の航路図", fillPickN(rng, C.reunionCore, 2, ctx), 2);

    // あなたが選んだ色・月の「意味」を返す (選んでいる感の回収)
    var pickedColor = answers.color !== undefined ? DATA.colors[answers.color] : null;
    var pickedMoon = answers.moon !== undefined ? DATA.moons[answers.moon] : null;
    var chosen = "";
    if (pickedColor) chosen += '<div class="oracle-box"><strong>あなたが選んだ「' + pickedColor.name + '」:</strong> ' + pickedColor.mean + "</div>";
    if (pickedMoon) chosen += '<div class="oracle-box"><strong>あなたが選んだ「' + pickedMoon.name + '」:</strong> ' + pickedMoon.mean + "</div>";
    if (answers.compassAngle !== undefined) {
      var dirs = ["愛", "縁", "情", "運"];
      var dirMean = {
        "愛": "針は「愛」。感情そのものが今のふたりの推進力です",
        "縁": "針は「縁」。人の繋がりが追い風を運ぶ配置です",
        "情": "針は「情」。積み重ねた時間が効いてくる配置です",
        "運": "針は「運」。流れに乗るべき時。抗わないこと"
      };
      var d = dirs[Math.round(answers.compassAngle / 90) % 4];
      chosen += '<div class="oracle-box"><strong>羅針盤の針:</strong> ' + dirMean[d] + "</div>";
    }

    html += chapterHtml(17, "ふたりの開運チャーム一覧",
      tarotBoxes() + chosen +
      '<div class="oracle-box"><strong>ラッキーカラー:</strong> ' + ctx.color + "</div>" +
      '<div class="oracle-box"><strong>ラッキーアイテム:</strong> ' + ctx.item + "</div>" +
      '<div class="oracle-box"><strong>縁を呼ぶ場所:</strong> ' + ctx.place + "</div>" +
      '<div class="oracle-box"><strong>魔法の言葉:</strong> ' + Engine.pick(rng, DATA.luckyWords) + "</div>" +
      '<div class="oracle-box"><strong>ゴールデンタイム:</strong> ' + ctx.hour + "</div>", 2);

    html += chapterHtml(18, "ふたりの365日 相性カレンダー",
      para("今日から365日、ふたりの毎日を一日ずつ読みました。毎晩、その日の項を確かめてください。") + calendarHtml(seed, ctx), 2);

    html += chapterHtml(19, "鑑定士 月詠紫苑からの手紙",
      fillPickN(rng, C.letterCore, 2, ctx) +
      '<div class="letter-sign"><img src="teller.jpg" alt="月詠紫苑" loading="lazy">' +
      '<p>月詠 紫苑<span>愛の羅針盤 主宰鑑定士</span></p></div>', 2);

    html += chapterHtml(20, "羅針盤の総括 — ふたりへの最終回答",
      para("総合相性" + ctx.score + "点。星座の角度、血の温度、干支の縁、そして365日の巡り——全てを重ねた最終回答を告げます。") +
      para(u.name + "さん。" + p.name + "さんとの縁は「" + (ctx.score >= 78 ? "結び直すたびに強くなる、末永い縁" : "磨けば光る、原石の縁") + "」です。" +
        "鍵になるのは" + ctx.month + "月、そして" + ctx.date1 + "のあなたの一歩。この鑑定書を、その日まで手元に置いてください。") +
      '<div class="oracle-box"><strong>最終指針:</strong> 迷ったら「' + Engine.pick(rng, DATA.luckyWords) + "」。この言葉がふたりの合言葉になります。</div>", 2);

    html += shareLink("【愛の羅針盤】" + u.name + "と" + p.name + "の相性、" + ctx.score + "点だった…🧭 当たりすぎて怖い");
    html += resultFooter();
    $result.innerHTML = html;
    bindChapterEvents();
    Compass.animateDial($result, ctx.score);
  }

  // 12ヶ月運勢
  function monthlyHtml(seed, ctx) {
    var html = "";
    var now = new Date();
    for (var i = 0; i < 12; i++) {
      var m = new Date(now.getFullYear(), now.getMonth() + i, 1);
      var mr = Engine.createRng(seed + 100 + i);
      var mctx = Object.assign({}, ctx, {
        d1: Engine.rangeInt(mr, 2, 14),
        d2: Engine.rangeInt(mr, 15, 28)
      });
      html +=
        '<div class="oracle-box"><strong>' + (m.getMonth() + 1) + "月</strong> — " +
        Engine.fill(Engine.pick(mr, DATA.monthly.mood), mctx) + "<br>" +
        Engine.fill(Engine.pick(mr, DATA.monthly.tip), mctx) + "</div>";
    }
    return html;
  }

  // 「今日のふたり」— 毎日開きたくなるデイリーフック
  function todayBox(seed, ctx) {
    var e = dayEntry(seed, ctx, 0);
    var d = new Date();
    var label = (d.getMonth() + 1) + "月" + d.getDate() + "日";
    if (userTier() >= 2) {
      return (
        '<div class="today-box">' +
        '<p class="today-label">✦ 今日のふたり — ' + label + "</p>" +
        '<p class="today-score">♥' + e.score + "</p>" +
        '<p class="today-text"><b>' + e.text + "</b><br>" + e.action + "</p>" +
        '<p class="today-note">毎日変わります。明日もここで。</p></div>'
      );
    }
    // 無料ユーザーにはぼかして見せる (毎日課金の入口になる)
    return (
      '<div class="today-box today-locked" data-paywall>' +
      '<p class="today-label">✦ 今日のふたり — ' + label + "</p>" +
      '<p class="today-text locked-text">♥' + e.score + " " + e.text + " " + e.action + "</p>" +
      '<p class="today-cta">' + ICONS.lock + " プレミアムで毎日のふたりを読む</p></div>"
    );
  }

  // 1日分の運勢を決定的に生成 (365日カレンダーと「今日のふたり」で共用)
  function dayEntry(seed, ctx, i) {
    var dr = Engine.createRng(seed + 1000 + i);
    var score = 40 + Math.floor(dr() * 61); // 40〜100
    var pool = score >= 78 ? DATA.daily.good : score >= 58 ? DATA.daily.mid : DATA.daily.low;
    return {
      score: score,
      text: Engine.fill(Engine.pick(dr, pool), ctx),
      action: Engine.fill(Engine.pick(dr, DATA.daily.action), ctx)
    };
  }

  // 365日カレンダー (月ごとの折りたたみ)
  function calendarHtml(seed, ctx) {
    var html = "";
    var d = new Date();
    var currentMonth = -1;
    for (var i = 0; i < 365; i++) {
      var e = dayEntry(seed, ctx, i);
      var score = e.score, text = e.text, action = e.action;

      if (d.getMonth() !== currentMonth) {
        if (currentMonth !== -1) html += "</details>";
        currentMonth = d.getMonth();
        html += '<details class="calendar-month"' + (i === 0 ? " open" : "") + "><summary>" +
          d.getFullYear() + "年 " + (currentMonth + 1) + "月</summary>";
      }
      html +=
        '<div class="calendar-day"><span class="calendar-date">' + Engine.fmtDate(d) + "</span>" +
        '<span class="calendar-score">♥' + score + "</span>" +
        '<span class="calendar-text"><b>' + text + "</b> " + action + "</span></div>";
      d.setDate(d.getDate() + 1);
    }
    html += "</details>";
    return html;
  }

  // ==========================================================
  // 恋愛・不倫・浮気 (セクション型の結果)
  // ==========================================================
  function renderSimple(u, p, seed, ctx) {
    var rng = Engine.createRng(seed + 13);
    var sections;

    if (genre === "renai") {
      sections = [
        ["1", p.name + "の今の本音", fillPickN(rng, DATA.renai.honne, 2, ctx), 0],
        ["2", "恋が動く時期", '<div class="oracle-box">' + fillPick(rng, DATA.renai.timing, ctx) + "</div>", 0],
        ["3", "あなたがとるべき行動", fillPickN(rng, DATA.renai.action, 2, ctx), 1],
        ["4", "やってはいけないこと", fillPickN(rng, DATA.renai.caution, 2, ctx), 2],
        ["5", "この恋の開運チャーム", charmHtml(rng, ctx), 2]
      ];
    } else if (genre === "furin") {
      sections = [
        ["1", "彼の本音 — 家庭とあなたの間で", fillPickN(rng, DATA.furin.honne, 2, ctx), 0],
        ["2", "関係が動く分岐点", '<div class="oracle-box">' + fillPick(rng, DATA.furin.kiki, ctx) + "</div>", 0],
        ["3", "視えている結末", fillPickN(rng, DATA.furin.ending, 2, ctx), 1],
        ["4", "あなた自身を守るために", fillPickN(rng, DATA.furin.advice, 2, ctx), 2],
        ["5", "心を保つ開運チャーム", charmHtml(rng, ctx), 2]
      ];
    } else {
      sections = [
        ["1", "その違和感の正体", fillPickN(rng, DATA.uwaki.signs, 2, ctx), 0],
        ["2", "視えている「影」の輪郭", para(fillPick(rng, DATA.uwaki.profile, ctx)), 0],
        ["3", "静かに確かめる方法", fillPickN(rng, DATA.uwaki.check, 2, ctx), 1],
        ["4", "総合判定", '<div class="oracle-box">' + fillPick(rng, DATA.uwaki.verdict, ctx) + "</div>", 2],
        ["5", "今夜からのあなたの一手", fillPickN(rng, DATA.uwaki.advice, 2, ctx), 2]
      ];
    }

    var titles = { renai: "恋愛成就の鑑定書", furin: "許されない恋の鑑定書", uwaki: "浮気の兆候 診断書" };
    var html =
      '<div class="result-head">' +
      '<p class="result-eyebrow">FORTUNE READING</p>' +
      '<h1 class="result-title">' + titles[genre] + "</h1>" +
      '<div class="result-pair">' +
      '<span class="pair-name">' + u.name + '<span class="pair-sub">' + u.zodiac + "・" + u.blood + "型</span></span>" +
      '<span class="pair-and">✦</span>' +
      '<span class="pair-name">' + p.name + '<span class="pair-sub">' + p.zodiac + "・" + p.blood + "型</span></span>" +
      "</div></div>";

    sections.forEach(function (s) {
      html += chapterHtml(s[0], s[1], s[2], s[3]);
    });

    // 相性占いへのクロスセル (市場調査: 相性がメイン商品)
    html +=
      '<div class="result-share">より深く知りたい方へ — ' + p.name + "さんとの縁を全20章・365日で読み解く" +
      '<br><a href="fortune.html?g=aisho" style="color:var(--gold-bright);text-decoration:underline">「ふたりの相性 完全鑑定」はこちら</a></div>';

    html += shareLink("【愛の羅針盤】" + titles[genre] + "、やってみたら具体的すぎて鳥肌…🧭");

    html += resultFooter();
    $result.innerHTML = html;
    bindChapterEvents();
  }

  function charmHtml(rng, ctx) {
    return (
      tarotBoxes() +
      '<div class="oracle-box"><strong>ラッキーカラー:</strong> ' + ctx.color + "</div>" +
      '<div class="oracle-box"><strong>ラッキーアイテム:</strong> ' + ctx.item + "</div>" +
      '<div class="oracle-box"><strong>縁を呼ぶ場所:</strong> ' + ctx.place + "</div>" +
      '<div class="oracle-box"><strong>勝負の時間帯:</strong> ' + ctx.hour + "</div>"
    );
  }

  // あなたが選んだ導きのカード3枚の意味
  function tarotBoxes() {
    if (!answers.tarot || !answers.tarot.length) return "";
    return answers.tarot.map(function (t) {
      return '<div class="oracle-box"><strong>導きのカード</strong> ' + (DATA.tarot[t] || t) + "</div>";
    }).join("");
  }

  // Threads シェアリンク (流入元への還流ループ)
  function shareLink(text) {
    var url = "https://kouyaru121.github.io/ai-no-rashinban/";
    var full = text + "\n" + url + " #愛の羅針盤";
    return (
      '<a class="share-threads" target="_blank" rel="noopener" href="https://www.threads.net/intent/post?text=' +
      encodeURIComponent(full) + '">' + ICONS.compass + " 結果を Threads でシェア</a>"
    );
  }

  function resultFooter() {
    var tierNow = userTier();
    var cta = tierNow >= 2 ? "" :
      '<button class="btn btn-gold btn-lg pulse" onclick="document.getElementById(\'paywall\').hidden=false">' +
      "全ての章を解放する<span class=\"btn-sub\">プレミアム 初月¥480</span></button>";
    return (
      '<div class="result-footer">' + cta +
      '<button class="again">別の占いを試す →</button></div>' +
      '<p class="paywall-note" style="text-align:center;margin-top:30px">本鑑定は娯楽目的の占いコンテンツです。結果に基づく行動はご自身の判断でお願いします。</p>'
    );
  }

  // ==========================================================
  // 起動
  // ==========================================================
  updateBadge();
  renderStep();
})();

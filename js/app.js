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
  function openPaywall() { $paywall.hidden = false; }
  function closePaywall() { $paywall.hidden = true; }
  var pendingPlan = null;

  document.getElementById("paywall-close").addEventListener("click", closePaywall);
  document.getElementById("register-close").addEventListener("click", function () {
    $register.hidden = true;
  });

  document.querySelectorAll(".paywall-plan").forEach(function (btn) {
    btn.addEventListener("click", function () {
      pendingPlan = btn.dataset.plan;
      closePaywall();
      document.getElementById("register-title").textContent =
        pendingPlan === "premium" ? "プレミアム登録 (初月¥480)" : "無料会員登録";
      document.getElementById("register-submit").textContent =
        pendingPlan === "premium" ? "登録して全章を解放する" : "登録して続きを読む";
      $register.hidden = false;
    });
  });

  document.getElementById("register-form").addEventListener("submit", function (e) {
    e.preventDefault();
    localStorage.setItem(LS.reg, "1");
    if (pendingPlan === "premium") localStorage.setItem(LS.prem, "1");
    document.getElementById("register-note").textContent = "※ デモ版のため実際の決済は発生しません。";
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
      steps: ["intro", "you", "partner", "relation", "want", "depth", "contact", "tarot", "crystal"]
    },
    renai: {
      title: "恋愛成就の行方",
      steps: ["intro", "you", "partner", "stage", "want", "depth", "tarot", "crystal"]
    },
    furin: {
      title: "許されない恋の結末",
      steps: ["intro", "you", "partner", "years", "hisword", "depth", "tarot", "crystal"]
    },
    uwaki: {
      title: "浮気の兆候 徹底診断",
      steps: ["intro", "you", "partner", "sign1", "sign2", "sign3", "depth", "crystal"]
    }
  };

  var genre = (new URLSearchParams(location.search).get("g")) || "aisho";
  if (!GENRES[genre]) genre = "aisho";
  var conf = GENRES[genre];

  var answers = {};      // ユーザーの全回答
  var stepIndex = 0;
  var lastResultRenderer = null;

  // ---------- 進捗バー ----------
  function progressHtml() {
    var pct = Math.round((stepIndex / conf.steps.length) * 100);
    return (
      '<div class="progress">' +
      '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
      '<span class="progress-text">' + stepIndex + " / " + conf.steps.length + "</span></div>"
    );
  }

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
      // 前回の鑑定書があれば復元ボタンを出す (何度でも読み返せる)
      var saved = localStorage.getItem("rashinban_last_" + genre);
      var resumeBtn = saved
        ? '<div class="step-next"><button class="btn btn-line" id="resume">前回の鑑定書をひらく</button></div>'
        : "";
      $wizard.innerHTML =
        progressHtml() +
        '<div class="step"><h1 class="step-q">' + conf.title + "</h1>" +
        '<p class="step-sub">' + leadMap[genre] + "</p>" +
        '<div class="step-next"><button class="btn btn-gold btn-lg" id="go">鑑定をはじめる</button></div>' +
        resumeBtn + "</div>";
      document.getElementById("go").addEventListener("click", function () {
        if (freeLeft() <= 0) { openPaywall(); return; }
        next();
      });
      if (saved) {
        document.getElementById("resume").addEventListener("click", function () {
          answers = JSON.parse(saved); // 復元は無料 (回数を消費しない)
          showResult();
        });
      }
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
        document.getElementById("sv").textContent = sr.value;
        document.getElementById("sl").textContent = labels[Math.min(4, Math.floor(sr.value / 21))];
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
        '<p class="step-sub">考えず、指が止まったものを。あなたの無意識が選びます。</p>' +
        '<div class="tarot-field" id="tf"></div>' +
        '<p class="tarot-count" id="tc">あと 3 枚</p></div>';
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
          document.getElementById("tc").textContent =
            picked.length >= 3 ? "カードが揃いました…" : "あと " + (3 - picked.length) + " 枚";
          if (picked.length === 3) {
            answers.tarot = picked;
            setTimeout(next, 900);
          }
        });
        tf.appendChild(card);
      });
    },

    crystal: function () {
      $wizard.innerHTML =
        progressHtml() +
        '<div class="step crystal-wrap"><h2 class="step-q">最後に、水晶へ5回触れてください</h2>' +
        '<p class="step-sub">あなたの「気」を鑑定に映します。想いを込めて。</p>' +
        '<div class="crystal" id="cr"></div>' +
        '<p class="crystal-count" id="cc">0 / 5</p></div>';
      var cr = document.getElementById("cr");
      var taps = 0;
      cr.addEventListener("click", function () {
        taps++;
        cr.classList.add("lit");
        setTimeout(function () { cr.classList.remove("lit"); }, 260);
        document.getElementById("cc").textContent = Math.min(taps, 5) + " / 5";
        if (taps === 5) {
          answers.taps = taps;
          setTimeout(next, 700);
        }
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
      "<label>血液型" +
      '<select id="f-blood"><option>A</option><option>B</option><option>O</option><option>AB</option><option value="A">わからない</option></select></label>' +
      '<div class="step-next"><button type="submit" class="btn btn-gold">次へ</button></div>' +
      "</form></div>";

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
    $wizard.querySelectorAll(".choice-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        answers[key] = b.dataset.v;
        answers[key + "_label"] = b.textContent;
        next();
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
      '<div class="divining"><div class="divining-circle">✦</div>' +
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
  function showResult() {
    // 鑑定書を保存 (リロード後も「前回の鑑定書をひらく」で読み返せる)
    try { localStorage.setItem("rashinban_last_" + genre, JSON.stringify(answers)); } catch (e) {}

    var u = Engine.buildProfile(answers.you);
    var p = Engine.buildProfile(answers.partner);

    // 同じ入力なら同じ結果になるシード
    var seedStr = genre + "|" + JSON.stringify(answers.you) + "|" + JSON.stringify(answers.partner) +
      "|" + (answers.relation || answers.stage || answers.years || answers.sign1 || "");
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
    window.scrollTo({ top: 0 });
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
      title + '<span class="lock-icon">🔒</span></button>' +
      '<div class="locked-preview"><p class="locked-text">' + teaser + "…</p>" +
      '<div class="locked-cta"><p>✦ ' + need + " ✦</p></div></div></section>"
    );
  }

  function bindChapterEvents() {
    $result.querySelectorAll("[data-toggle]").forEach(function (h) {
      h.addEventListener("click", function () {
        h.closest(".chapter").classList.toggle("open");
      });
    });
    $result.querySelectorAll("[data-paywall], .locked-preview").forEach(function (el) {
      el.addEventListener("click", openPaywall);
    });
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
      '<h1 class="result-title">' + u.name + " と " + p.name + " の鑑定書</h1>" +
      '<p class="result-sub">' + u.zodiac + "・" + u.blood + "型 × " + p.zodiac + "・" + p.blood + "型 / 全20章</p>" +
      scoreRing(ctx.score) +
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

    html += chapterHtml(17, "ふたりの開運チャーム一覧",
      '<div class="oracle-box"><strong>ラッキーカラー:</strong> ' + ctx.color + "</div>" +
      '<div class="oracle-box"><strong>ラッキーアイテム:</strong> ' + ctx.item + "</div>" +
      '<div class="oracle-box"><strong>縁を呼ぶ場所:</strong> ' + ctx.place + "</div>" +
      '<div class="oracle-box"><strong>魔法の言葉:</strong> ' + Engine.pick(rng, DATA.luckyWords) + "</div>" +
      '<div class="oracle-box"><strong>ゴールデンタイム:</strong> ' + ctx.hour + "</div>", 2);

    html += chapterHtml(18, "ふたりの365日 相性カレンダー",
      para("今日から365日、ふたりの毎日を一日ずつ読みました。毎晩、その日の項を確かめてください。") + calendarHtml(seed, ctx), 2);

    html += chapterHtml(19, "鑑定士 月詠紫苑からの手紙", fillPickN(rng, C.letterCore, 2, ctx), 2);

    html += chapterHtml(20, "羅針盤の総括 — ふたりへの最終回答",
      para("総合相性" + ctx.score + "点。星座の角度、血の温度、干支の縁、そして365日の巡り——全てを重ねた最終回答を告げます。") +
      para(u.name + "さん。" + p.name + "さんとの縁は「" + (ctx.score >= 78 ? "結び直すたびに強くなる、末永い縁" : "磨けば光る、原石の縁") + "」です。" +
        "鍵になるのは" + ctx.month + "月、そして" + ctx.date1 + "のあなたの一歩。この鑑定書を、その日まで手元に置いてください。") +
      '<div class="oracle-box"><strong>最終指針:</strong> 迷ったら「' + Engine.pick(rng, DATA.luckyWords) + "」。この言葉がふたりの合言葉になります。</div>", 2);

    html += resultFooter();
    $result.innerHTML = html;
    bindChapterEvents();
    animateRing();
  }

  // スコアリング (SVG円)
  function scoreRing(score) {
    var r = 82, circ = 2 * Math.PI * r;
    return (
      '<div class="score-ring"><svg width="190" height="190">' +
      '<defs><linearGradient id="ringGrad"><stop offset="0%" stop-color="#d4af6a"/><stop offset="100%" stop-color="#e58aa8"/></linearGradient></defs>' +
      '<circle class="ring-bg" cx="95" cy="95" r="' + r + '"/>' +
      '<circle class="ring-fg" cx="95" cy="95" r="' + r + '" stroke-dasharray="' + circ + '" stroke-dashoffset="' + circ + '" data-target="' + (circ * (1 - score / 100)) + '"/>' +
      '</svg><div class="score-num"><strong>' + score + '</strong><span>総合相性</span></div></div>'
    );
  }
  function animateRing() {
    var fg = $result.querySelector(".ring-fg");
    if (!fg) return;
    requestAnimationFrame(function () {
      setTimeout(function () { fg.style.strokeDashoffset = fg.dataset.target; }, 80);
    });
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

  // 365日カレンダー (月ごとの折りたたみ)
  function calendarHtml(seed, ctx) {
    var html = "";
    var d = new Date();
    var currentMonth = -1;
    for (var i = 0; i < 365; i++) {
      var dr = Engine.createRng(seed + 1000 + i);
      var score = 40 + Math.floor(dr() * 61); // 40〜100
      var pool = score >= 78 ? DATA.daily.good : score >= 58 ? DATA.daily.mid : DATA.daily.low;
      var text = Engine.fill(Engine.pick(dr, pool), ctx);
      var action = Engine.fill(Engine.pick(dr, DATA.daily.action), ctx);

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
      '<h1 class="result-title">' + u.name + "さんの" + titles[genre] + "</h1>" +
      '<p class="result-sub">' + u.zodiac + "・" + u.blood + "型 / お相手: " + p.name + "さん (" + p.zodiac + ")</p></div>";

    sections.forEach(function (s) {
      html += chapterHtml(s[0], s[1], s[2], s[3]);
    });

    // 相性占いへのクロスセル (市場調査: 相性がメイン商品)
    html +=
      '<div class="result-share">より深く知りたい方へ — ' + p.name + "さんとの縁を全20章・365日で読み解く" +
      '<br><a href="fortune.html?g=aisho" style="color:var(--gold-bright);text-decoration:underline">「ふたりの相性 完全鑑定」はこちら</a></div>';

    html += resultFooter();
    $result.innerHTML = html;
    bindChapterEvents();
  }

  function charmHtml(rng, ctx) {
    return (
      '<div class="oracle-box"><strong>ラッキーカラー:</strong> ' + ctx.color + "</div>" +
      '<div class="oracle-box"><strong>ラッキーアイテム:</strong> ' + ctx.item + "</div>" +
      '<div class="oracle-box"><strong>縁を呼ぶ場所:</strong> ' + ctx.place + "</div>" +
      '<div class="oracle-box"><strong>勝負の時間帯:</strong> ' + ctx.hour + "</div>"
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

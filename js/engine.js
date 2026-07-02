/* ==========================================================
   愛の羅針盤 — 鑑定エンジン
   入力(生年月日など)から決定的に結果を生成する。
   同じ入力なら何度占っても同じ結果 → 「視えている」信頼感を演出
   ========================================================== */
var Engine = (function () {
  "use strict";

  // ---------- 文字列 → 32bit シード (FNV-1a) ----------
  function hashSeed(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // ---------- 決定的な疑似乱数生成器 (mulberry32) ----------
  function createRng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- 抽選ユーティリティ ----------
  function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }
  function pickN(rng, arr, n) {
    var copy = arr.slice(), out = [];
    while (out.length < n && copy.length) {
      out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
    }
    return out;
  }
  function rangeInt(rng, min, max) {
    return min + Math.floor(rng() * (max - min + 1));
  }

  // ---------- 星座 ----------
  var ZODIAC = [
    { name: "牡羊座", elem: "火", edge: [3, 21] },
    { name: "牡牛座", elem: "地", edge: [4, 20] },
    { name: "双子座", elem: "風", edge: [5, 21] },
    { name: "蟹座",   elem: "水", edge: [6, 22] },
    { name: "獅子座", elem: "火", edge: [7, 23] },
    { name: "乙女座", elem: "地", edge: [8, 23] },
    { name: "天秤座", elem: "風", edge: [9, 23] },
    { name: "蠍座",   elem: "水", edge: [10, 24] },
    { name: "射手座", elem: "火", edge: [11, 23] },
    { name: "山羊座", elem: "地", edge: [12, 22] },
    { name: "水瓶座", elem: "風", edge: [1, 20] },
    { name: "魚座",   elem: "水", edge: [2, 19] }
  ];

  // 誕生日(月,日) → 星座インデックス
  function zodiacIndex(month, day) {
    for (var i = 0; i < 12; i++) {
      var z = ZODIAC[i];
      var m = z.edge[0], d = z.edge[1];
      // その星座の開始日以降か
      if ((month === m && day >= d) || (month === m % 12 + 1 && day < ZODIAC[(i + 1) % 12].edge[1])) {
        return i;
      }
    }
    return 0;
  }

  // ---------- 干支 ----------
  var ETO = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  function etoIndex(year) {
    return ((year - 4) % 12 + 12) % 12;
  }

  // ---------- 星座同士の関係タイプ ----------
  // 角度距離で6分類 (占星術のアスペクト風)
  //   0: 同座(合) / 1: 隣接 / 2: 60度(調和) / 3: 90度(緊張) / 4: 120度(大調和) / 5: 180度(対極)
  function zodiacRelation(a, b) {
    var d = Math.abs(a - b) % 12;
    if (d > 6) d = 12 - d;
    return d; // 0〜6 → data 側で 6 は 5(対極寄り) に丸める
  }

  // ---------- エレメント相性 ----------
  //   same: 同エレメント / good: 火×風・地×水 / hard: それ以外
  function elementRelation(ea, eb) {
    if (ea === eb) return "same";
    var goodPairs = { "火風": 1, "風火": 1, "地水": 1, "水地": 1 };
    return goodPairs[ea + eb] ? "good" : "hard";
  }

  // ---------- 干支の関係 ----------
  function etoRelation(a, b) {
    var d = Math.abs(a - b) % 12;
    if (d > 6) d = 12 - d;
    if (d === 0) return "same";   // 同じ干支
    if (d === 4) return "sanngou"; // 三合 (吉)
    if (d === 6) return "chuu";    // 冲 (対立)
    if (d === 1) return "tonari";  // 支合寄り
    return "normal";
  }

  // ---------- 日付生成 (「具体的な断言」用) ----------
  // 今日から min〜max 日後の日付を決定的に返す
  function futureDate(rng, minDays, maxDays) {
    var d = new Date();
    d.setDate(d.getDate() + rangeInt(rng, minDays, maxDays));
    return d;
  }
  var WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
  function fmtDate(d) {
    return d.getMonth() + 1 + "月" + d.getDate() + "日(" + WEEKDAYS[d.getDay()] + ")";
  }

  // ---------- テンプレート差し込み ----------
  // "{p}は{n}日以内に…" のような文字列にコンテキストを流し込む
  function fill(tpl, ctx) {
    return tpl.replace(/\{(\w+)\}/g, function (_, key) {
      return ctx[key] !== undefined ? ctx[key] : "{" + key + "}";
    });
  }

  // ---------- プロフィール構築 ----------
  // 入力フォームの値から鑑定に使う全属性を組み立てる
  function buildProfile(input) {
    var by = parseInt(input.year, 10);
    var bm = parseInt(input.month, 10);
    var bd = parseInt(input.day, 10);
    var zi = zodiacIndex(bm, bd);
    return {
      name: input.name || "あなた",
      year: by, month: bm, day: bd,
      blood: input.blood || "不明",
      zodiac: ZODIAC[zi].name,
      zodiacIndex: zi,
      element: ZODIAC[zi].elem,
      eto: ETO[etoIndex(by)],
      etoIndex: etoIndex(by),
      // 運命数 (数秘術風): 生年月日の全桁を一桁になるまで足す
      lifePath: (function () {
        var s = ("" + by + bm + bd).split("").reduce(function (a, c) { return a + +c; }, 0);
        while (s > 9) s = ("" + s).split("").reduce(function (a, c) { return a + +c; }, 0);
        return s;
      })()
    };
  }

  return {
    hashSeed: hashSeed,
    createRng: createRng,
    pick: pick,
    pickN: pickN,
    rangeInt: rangeInt,
    zodiacRelation: zodiacRelation,
    elementRelation: elementRelation,
    etoRelation: etoRelation,
    futureDate: futureDate,
    fmtDate: fmtDate,
    fill: fill,
    buildProfile: buildProfile,
    ZODIAC: ZODIAC,
    ETO: ETO,
    WEEKDAYS: WEEKDAYS
  };
})();

/* ==========================================================
   愛の羅針盤 — SVGアイコン集
   OS絵文字は端末ごとに見た目が変わり世界観を壊すため、
   ブランドカラーの線画SVGに統一する。
   ========================================================== */
var ICONS = (function () {
  "use strict";

  // 共通ラッパ (stroke基調・ローズゴールド)
  function svg(inner, cls) {
    return (
      '<svg class="ico ' + (cls || "") + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="#f3cfa6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" ' +
      'xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + inner + "</svg>"
    );
  }

  return {
    /* 相性: 重なり合うふたつの環 (縁) */
    aisho: svg(
      '<circle cx="9.2" cy="13" r="5.4"/>' +
      '<circle cx="14.8" cy="13" r="5.4" stroke="#f295b5"/>' +
      '<path d="M12 2.4 l0.6 1.6 1.6 0.6 -1.6 0.6 -0.6 1.6 -0.6 -1.6 -1.6 -0.6 1.6 -0.6 Z" fill="#f3cfa6" stroke="none"/>'
    ),

    /* 恋愛: ハートとひとしずくの星 */
    renai: svg(
      '<path d="M12 20 C6.5 15.5 3.5 12.4 3.5 9.1 C3.5 6.4 5.6 4.5 8 4.5 C9.7 4.5 11.2 5.4 12 6.9 C12.8 5.4 14.3 4.5 16 4.5 C18.4 4.5 20.5 6.4 20.5 9.1 C20.5 12.4 17.5 15.5 12 20 Z" stroke="#f295b5"/>' +
      '<path d="M18.6 2.2 l0.5 1.3 1.3 0.5 -1.3 0.5 -0.5 1.3 -0.5 -1.3 -1.3 -0.5 1.3 -0.5 Z" fill="#f3cfa6" stroke="none"/>'
    ),

    /* 不倫: 一輪の薔薇と落ちゆく花びら */
    furin: svg(
      '<circle cx="14.5" cy="7" r="3.7" stroke="#f295b5"/>' +
      '<path d="M14.5 5.1 a1.9 1.9 0 1 1 -1.9 1.9" stroke="#f295b5"/>' +
      '<path d="M13.4 10.5 C11.2 13.5 10.2 16.8 10.2 21"/>' +
      '<path d="M11.6 15.2 C13.2 14.7 14.5 15.3 14.9 16.8 C13.3 17.3 12 16.7 11.6 15.2 Z"/>' +
      '<path d="M18.2 13.2 C19 14 19 15.1 18.2 15.9 C17.4 15.1 17.4 14 18.2 13.2 Z" opacity="0.65" stroke="#f295b5"/>'
    ),

    /* 浮気: まなざし (瞳の中に星) */
    uwaki: svg(
      '<path d="M2.5 12 C5.5 7 9 4.8 12 4.8 C15 4.8 18.5 7 21.5 12 C18.5 17 15 19.2 12 19.2 C9 19.2 5.5 17 2.5 12 Z"/>' +
      '<circle cx="12" cy="12" r="3.4" stroke="#f295b5"/>' +
      '<path d="M12 10.6 l0.45 0.95 0.95 0.45 -0.95 0.45 -0.45 0.95 -0.45 -0.95 -0.95 -0.45 0.95 -0.45 Z" fill="#f3cfa6" stroke="none"/>'
    ),

    /* 鍵 (ロック章) */
    lock: svg(
      '<rect x="5.5" y="10.5" width="13" height="9" rx="2"/>' +
      '<path d="M8.5 10.5 V8 a3.5 3.5 0 0 1 7 0 v2.5"/>' +
      '<circle cx="12" cy="15" r="1.3" fill="#f295b5" stroke="none"/>'
    , "ico-lock"),

    /* ミニ羅針盤 (シェア等) */
    compass: svg(
      '<circle cx="12" cy="12" r="8.6"/>' +
      '<path d="M14.8 9.2 L13 13 L9.2 14.8 L11 11 Z" fill="#f295b5" stroke="none"/>' +
      '<circle cx="12" cy="12" r="1" fill="#f3cfa6" stroke="none"/>'
    ),

    /* 月相 4種 (新月/三日月/半月/満月) */
    moons: [
      svg('<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="7.5" fill="rgba(30,17,34,0.9)" stroke="none"/><circle cx="12" cy="12" r="7.5"/>'),
      svg('<path d="M14.5 4.6 a8 8 0 1 0 0 14.8 a9.6 9.6 0 0 1 0 -14.8 Z" fill="rgba(243,207,166,0.25)"/>'),
      svg('<circle cx="12" cy="12" r="7.5"/><path d="M12 4.5 a7.5 7.5 0 0 1 0 15 Z" fill="rgba(243,207,166,0.3)" stroke="none"/>'),
      svg('<circle cx="12" cy="12" r="7.5" fill="rgba(243,207,166,0.3)"/><circle cx="9.5" cy="9.5" r="1.1" opacity="0.5"/><circle cx="14" cy="13.5" r="0.8" opacity="0.4"/>')
    ]
  };
})();

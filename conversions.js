(function exposeConversions(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.WordChangerConversions = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createConversionsApi() {
  "use strict";

  const KANA_MAP_HIRA_TO_HALF = {
    "あ": "ｱ", "い": "ｲ", "う": "ｳ", "え": "ｴ", "お": "ｵ",
    "か": "ｶ", "き": "ｷ", "く": "ｸ", "け": "ｹ", "こ": "ｺ",
    "さ": "ｻ", "し": "ｼ", "す": "ｽ", "せ": "ｾ", "そ": "ｿ",
    "た": "ﾀ", "ち": "ﾁ", "つ": "ﾂ", "て": "ﾃ", "と": "ﾄ",
    "な": "ﾅ", "に": "ﾆ", "ぬ": "ﾇ", "ね": "ﾈ", "の": "ﾉ",
    "は": "ﾊ", "ひ": "ﾋ", "ふ": "ﾌ", "へ": "ﾍ", "ほ": "ﾎ",
    "ま": "ﾏ", "み": "ﾐ", "む": "ﾑ", "め": "ﾒ", "も": "ﾓ",
    "や": "ﾔ", "ゆ": "ﾕ", "よ": "ﾖ",
    "ら": "ﾗ", "り": "ﾘ", "る": "ﾙ", "れ": "ﾚ", "ろ": "ﾛ",
    "わ": "ﾜ", "を": "ｦ", "ん": "ﾝ",
    "が": "ｶﾞ", "ぎ": "ｷﾞ", "ぐ": "ｸﾞ", "げ": "ｹﾞ", "ご": "ｺﾞ",
    "ざ": "ｻﾞ", "じ": "ｼﾞ", "ず": "ｽﾞ", "ぜ": "ｾﾞ", "ぞ": "ｿﾞ",
    "だ": "ﾀﾞ", "ぢ": "ﾁﾞ", "づ": "ﾂﾞ", "で": "ﾃﾞ", "ど": "ﾄﾞ",
    "ば": "ﾊﾞ", "び": "ﾋﾞ", "ぶ": "ﾌﾞ", "べ": "ﾍﾞ", "ぼ": "ﾎﾞ",
    "ぱ": "ﾊﾟ", "ぴ": "ﾋﾟ", "ぷ": "ﾌﾟ", "ぺ": "ﾍﾟ", "ぽ": "ﾎﾟ",
    "ぁ": "ｧ", "ぃ": "ｨ", "ぅ": "ｩ", "ぇ": "ｪ", "ぉ": "ｫ",
    "っ": "ｯ", "ゃ": "ｬ", "ゅ": "ｭ", "ょ": "ｮ",
    "ゎ": "ﾜ", "ゕ": "ｶ", "ゖ": "ｹ", "ゔ": "ｳﾞ",
    "ー": "ｰ", "、": "､", "。": "｡", "「": "｢", "」": "｣", "・": "･"
  };

  const KANA_MAP_FULL_TO_HALF = {
    "ガ": "ｶﾞ", "ギ": "ｷﾞ", "グ": "ｸﾞ", "ゲ": "ｹﾞ", "ゴ": "ｺﾞ",
    "ザ": "ｻﾞ", "ジ": "ｼﾞ", "ズ": "ｽﾞ", "ゼ": "ｾﾞ", "ゾ": "ｿﾞ",
    "ダ": "ﾀﾞ", "ヂ": "ﾁﾞ", "ヅ": "ﾂﾞ", "デ": "ﾃﾞ", "ド": "ﾄﾞ",
    "バ": "ﾊﾞ", "ビ": "ﾋﾞ", "ブ": "ﾌﾞ", "ベ": "ﾍﾞ", "ボ": "ﾎﾞ",
    "パ": "ﾊﾟ", "ピ": "ﾋﾟ", "プ": "ﾌﾟ", "ペ": "ﾍﾟ", "ポ": "ﾎﾟ",
    "ヴ": "ｳﾞ", "ヷ": "ﾜﾞ", "ヸ": "ｲﾞ", "ヹ": "ｴﾞ", "ヺ": "ｦﾞ",
    "ア": "ｱ", "イ": "ｲ", "ウ": "ｳ", "エ": "ｴ", "オ": "ｵ",
    "カ": "ｶ", "キ": "ｷ", "ク": "ｸ", "ケ": "ｹ", "コ": "ｺ",
    "サ": "ｻ", "シ": "ｼ", "ス": "ｽ", "セ": "ｾ", "ソ": "ｿ",
    "タ": "ﾀ", "チ": "ﾁ", "ツ": "ﾂ", "テ": "ﾃ", "ト": "ﾄ",
    "ナ": "ﾅ", "ニ": "ﾆ", "ヌ": "ﾇ", "ネ": "ﾈ", "ノ": "ﾉ",
    "ハ": "ﾊ", "ヒ": "ﾋ", "フ": "ﾌ", "ヘ": "ﾍ", "ホ": "ﾎ",
    "マ": "ﾏ", "ミ": "ﾐ", "ム": "ﾑ", "メ": "ﾒ", "モ": "ﾓ",
    "ヤ": "ﾔ", "ユ": "ﾕ", "ヨ": "ﾖ",
    "ラ": "ﾗ", "リ": "ﾘ", "ル": "ﾙ", "レ": "ﾚ", "ロ": "ﾛ",
    "ワ": "ﾜ", "ヲ": "ｦ", "ン": "ﾝ",
    "ァ": "ｧ", "ィ": "ｨ", "ゥ": "ｩ", "ェ": "ｪ", "ォ": "ｫ",
    "ッ": "ｯ", "ャ": "ｬ", "ュ": "ｭ", "ョ": "ｮ",
    "ヮ": "ﾜ", "ヵ": "ｶ", "ヶ": "ｹ",
    "。": "｡", "、": "､", "ー": "ｰ", "「": "｢", "」": "｣", "・": "･"
  };

  function normalizeText(value) {
    return String(value ?? "").normalize("NFC");
  }

  function segmentGraphemes(value) {
    const normalized = normalizeText(value);

    if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
      const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });
      return Array.from(segmenter.segment(normalized), ({ segment }) => segment);
    }

    return Array.from(normalized);
  }

  function hiraToHalfKatakana(value) {
    return segmentGraphemes(value)
      .map((character) => KANA_MAP_HIRA_TO_HALF[character] || character)
      .join("");
  }

  function toHalfWidthAlphaNum(value) {
    return normalizeText(value).replace(/[Ａ-Ｚａ-ｚ０-９]/g, (character) =>
      String.fromCharCode(character.charCodeAt(0) - 0xfee0)
    );
  }

  function toFullWidthAlphaNum(value) {
    return normalizeText(value).replace(/[A-Za-z0-9]/g, (character) =>
      String.fromCharCode(character.charCodeAt(0) + 0xfee0)
    );
  }

  function toHalfWidthKatakana(value) {
    return segmentGraphemes(value)
      .map((character) => KANA_MAP_FULL_TO_HALF[character] || character)
      .join("");
  }

  function removeAllWhitespace(value) {
    return normalizeText(value).replace(/\s/gu, "");
  }

  function randomConvert(value, symbolList) {
    if (!Array.isArray(symbolList) || symbolList.length === 0) {
      return normalizeText(value);
    }

    return segmentGraphemes(value)
      .map((character) => {
        if (/^\s$/u.test(character)) {
          return character;
        }
        return symbolList[Math.floor(Math.random() * symbolList.length)];
      })
      .join("");
  }

  function reverseString(value) {
    return segmentGraphemes(value).reverse().join("");
  }

  function addDakutenOnly(value) {
    const excludedCharacters = /[\s、。「」！？()（）ヶヵヴンん]/u;
    const smallKana = /[ぁぃぅぇぉゃゅょゎっァィゥェォャュョヮッ]/u;
    const kana = /^[\u3040-\u309f\u30a0-\u30ff]$/u;
    const alreadyVoiced =
      /[がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽゔヴヷヸヹヺガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポ]/u;

    return segmentGraphemes(value)
      .map((character) => {
        if (
          excludedCharacters.test(character) ||
          smallKana.test(character) ||
          !kana.test(character) ||
          alreadyVoiced.test(character)
        ) {
          return character;
        }
        return `${character}゛`;
      })
      .join("");
  }

  function emphasizedStatementConversion(value) {
    return segmentGraphemes(value).join(" ");
  }

  function createConversionStrategies(funnySymbols) {
    const symbols = funnySymbols || {};

    return {
      upper: (text) => normalizeText(text).toUpperCase(),
      lower: (text) => normalizeText(text).toLowerCase(),
      hiraToHalfKata: hiraToHalfKatakana,
      toHalfAlphaNum: toHalfWidthAlphaNum,
      toFullAlphaNum: toFullWidthAlphaNum,
      toHalfKata: toHalfWidthKatakana,
      spaceRemoveAll: removeAllWhitespace,
      arabic: (text) => randomConvert(text, symbols.arabic),
      korean: (text) => randomConvert(text, symbols.korean),
      alien: (text) => randomConvert(text, symbols.alien),
      reverse: reverseString,
      dakuten: addDakutenOnly,
      emphasizedStatement: emphasizedStatementConversion
    };
  }

  return Object.freeze({
    MAX_INPUT_GRAPHEMES: 2000,
    addDakutenOnly,
    createConversionStrategies,
    emphasizedStatementConversion,
    hiraToHalfKatakana,
    normalizeText,
    randomConvert,
    removeAllWhitespace,
    reverseString,
    segmentGraphemes,
    toFullWidthAlphaNum,
    toHalfWidthAlphaNum,
    toHalfWidthKatakana
  });
});

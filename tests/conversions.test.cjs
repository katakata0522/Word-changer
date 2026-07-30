"use strict";

const assert = require("node:assert/strict");
const conversions = require("../conversions.js");
const config = require("../config.json");

function test(name, callback) {
  try {
    callback();
    process.stdout.write(`✓ ${name}\n`);
  } catch (error) {
    process.stderr.write(`✗ ${name}\n`);
    throw error;
  }
}

test("絵文字を壊さずに文字順を反転する", () => {
  assert.equal(conversions.reverseString("A😀B"), "B😀A");
});

test("結合文字を正規化して反転する", () => {
  assert.equal(conversions.reverseString(`Aか\u3099B`), "BがA");
});

test("絵文字の途中に空白を入れずに強調する", () => {
  assert.equal(
    conversions.emphasizedStatementConversion("A😀B"),
    "A 😀 B"
  );
});

test("絵文字をランダム変換しても一文字分として扱う", () => {
  assert.equal(conversions.randomConvert("😀", ["★"]), "★");
});

test("ランダム変換は空白と改行を維持する", () => {
  assert.equal(conversions.randomConvert("A B\nC", ["★"]), "★ ★\n★");
});

test("分解された濁点を重複させない", () => {
  assert.equal(conversions.addDakutenOnly(`か\u3099`), "が");
});

test("ひらがなを半角カナへ変換する", () => {
  assert.equal(conversions.hiraToHalfKatakana("がっこう。"), "ｶﾞｯｺｳ｡");
});

test("小書きワ・カ・ケを近似半角へ変換する", () => {
  assert.equal(conversions.hiraToHalfKatakana("ゎゕゖ"), "ﾜｶｹ");
  assert.equal(conversions.toHalfWidthKatakana("ヮヵヶ"), "ﾜｶｹ");
});

test("稀な濁音カナを近似半角へ変換する", () => {
  assert.equal(conversions.toHalfWidthKatakana("ヷヸヹヺ"), "ﾜﾞｲﾞｴﾞｦﾞ");
});

test("英数字の全角・半角変換は対象外の記号を維持する", () => {
  assert.equal(conversions.toHalfWidthAlphaNum("Ａｂ３！"), "Ab3！");
  assert.equal(conversions.toFullWidthAlphaNum("Ab3!"), "Ａｂ３!");
});

test("空白・改行・タブを削除する", () => {
  assert.equal(conversions.removeAllWhitespace(" A　B\nC\t"), "ABC");
});

test("configの全変換IDに処理が存在する", () => {
  const strategies = conversions.createConversionStrategies(config.funnySymbols);
  const configuredIds = Object.values(config.tabDefinitions)
    .flat()
    .map(({ id }) => id);

  configuredIds.forEach((id) => {
    assert.equal(typeof strategies[id], "function", `${id}に処理がありません`);
  });

  assert.deepEqual(
    Object.keys(strategies).sort(),
    configuredIds.sort(),
    "未使用または未設定の変換処理があります"
  );
});

process.stdout.write("変換処理のテストが完了しました。\n");

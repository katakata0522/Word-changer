"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const configText = fs.readFileSync(path.join(root, "config.json"), "utf8");
const config = JSON.parse(configText);

const requiredFiles = [
  "index.html",
  "style.css",
  "conversions.js",
  "app.js",
  "config.json",
  "README.md"
];

requiredFiles.forEach((file) => {
  assert.ok(fs.existsSync(path.join(root, file)), `${file}がありません`);
});

assert.match(index, /<h1>実用ネタ文字変換<\/h1>/);
assert.match(index, /<label for="inputText"/);
assert.match(index, /role="status"/);
assert.match(index, /role="tablist"/);
assert.match(index, /meta name="description"/);
assert.match(index, /href="style\.css"/);
assert.match(index, /src="conversions\.js"/);
assert.match(index, /src="app\.js"/);
assert.doesNotMatch(index, /<style[\s>]/);
assert.doesNotMatch(index, /<script>([\s\S]*?)<\/script>/);

const allLabels = Object.values(config.tabDefinitions)
  .flat()
  .map(({ label }) => label);
assert.equal(new Set(allLabels).size, allLabels.length, "表示名が重複しています");

const koreanSymbols = config.funnySymbols.korean;
assert.ok(!koreanSymbols.includes("ケ"), "ハングル一覧にカタカナが混入しています");

const alienSymbols = config.funnySymbols.alien;
assert.ok(!alienSymbols.includes("卍"));
assert.ok(!alienSymbols.includes("卐"));

process.stdout.write("静的チェックが完了しました。\n");

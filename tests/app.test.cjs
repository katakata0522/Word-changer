"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const conversionsSource = fs.readFileSync(
  path.join(root, "conversions.js"),
  "utf8"
);
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const config = JSON.parse(
  fs.readFileSync(path.join(root, "config.json"), "utf8")
);

function tick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function createApp(options = {}) {
  const dom = new JSDOM(html, {
    pretendToBeVisual: true,
    runScripts: "outside-only",
    url: "https://example.test/"
  });
  const { window } = dom;
  const scrollCalls = [];
  const errors = [];

  window.console.error = (...values) => {
    errors.push(values);
  };
  window.Element.prototype.scrollIntoView = function scrollIntoView(settings) {
    scrollCalls.push({ element: this, settings });
  };
  window.matchMedia = () => ({
    matches: Boolean(options.reduceMotion)
  });

  if (options.fastConfigTimeout) {
    const originalSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = (callback, delay, ...args) =>
      originalSetTimeout(
        callback,
        delay === 15000 ? 0 : delay,
        ...args
      );
  }

  if (options.storageThrows) {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("storage unavailable");
      }
    });
  }

  window.fetch = options.fetchFactory
    ? options.fetchFactory(window)
    : async () => ({
        ok: true,
        json: async () => config
      });

  if (!options.withoutConversions) {
    window.eval(conversionsSource);
  }
  window.eval(appSource);
  await tick();
  await tick();

  return { dom, errors, scrollCalls, window };
}

async function test(name, callback) {
  try {
    await callback();
    process.stdout.write(`✓ ${name}\n`);
  } catch (error) {
    process.stderr.write(`✗ ${name}\n`);
    throw error;
  }
}

async function run() {
  await test("主要フロー、結果破棄、コピー内容が一致する", async () => {
    const app = await createApp();
    const { document } = app.window;
    const input = document.getElementById("inputText");

    assert.equal(input.disabled, false);
    assert.match(
      document.getElementById("selectionSummary").textContent,
      /実用.*英字を大文字化/
    );

    input.value = "Abc😀";
    input.dispatchEvent(new app.window.Event("input", { bubbles: true }));
    document.getElementById("convertBtn").click();
    assert.equal(document.getElementById("resultText").textContent, "ABC😀");

    let copiedText = "";
    Object.defineProperty(app.window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value) => {
          copiedText = value;
        }
      }
    });
    document.getElementById("copyBtn").click();
    await tick();
    assert.equal(copiedText, "ABC😀");

    input.value = "変更後";
    input.dispatchEvent(new app.window.Event("input", { bubbles: true }));
    assert.equal(document.getElementById("resultArea").hidden, true);
    assert.equal(document.getElementById("resultText").textContent, "");
    app.dom.window.close();
  });

  await test("カテゴリと変換方法をキーボードで変更できる", async () => {
    const app = await createApp();
    const { document } = app.window;
    const practicalTab = document.getElementById("practicalTab");

    practicalTab.dispatchEvent(
      new app.window.KeyboardEvent("keydown", {
        bubbles: true,
        key: "ArrowRight"
      })
    );
    assert.equal(document.activeElement, document.getElementById("funTab"));
    assert.equal(document.getElementById("funPanel").hidden, false);

    const firstOption = document.querySelector(
      "#funTabsContainer .conversion-option[aria-checked='true']"
    );
    const secondOption = document.querySelectorAll(
      "#funTabsContainer .conversion-option"
    )[1];
    firstOption.dispatchEvent(
      new app.window.KeyboardEvent("keydown", {
        bubbles: true,
        key: "ArrowRight"
      })
    );
    assert.equal(document.activeElement, secondOption);
    assert.equal(secondOption.getAttribute("aria-checked"), "true");
    app.dom.window.close();
  });

  await test("2000文字超過時も原文を削除せず変換を止める", async () => {
    const app = await createApp();
    const { document } = app.window;
    const input = document.getElementById("inputText");
    const oversizedText = "a".repeat(2001);

    input.value = oversizedText;
    input.dispatchEvent(new app.window.Event("input", { bubbles: true }));
    assert.equal(input.value, oversizedText);
    assert.equal(document.getElementById("charCounter").textContent, "2001 / 2000文字");
    assert.equal(input.getAttribute("aria-invalid"), "true");
    assert.match(document.getElementById("inputError").textContent, /1文字超え/);

    document.getElementById("convertBtn").click();
    assert.equal(document.getElementById("resultArea").hidden, true);
    assert.equal(document.activeElement, input);
    app.dom.window.close();
  });

  await test("空入力エラーを入力欄に関連付け、結果欄へ移動しない", async () => {
    const app = await createApp();
    const { document } = app.window;
    const input = document.getElementById("inputText");

    document.getElementById("convertBtn").click();
    assert.equal(input.getAttribute("aria-invalid"), "true");
    assert.equal(
      document.getElementById("inputError").textContent,
      "変換したい文章を入力してください。"
    );
    assert.equal(document.activeElement, input);
    assert.equal(app.scrollCalls.length, 0);
    app.dom.window.close();
  });

  await test("動き削減時は結果へ即時スクロールする", async () => {
    const app = await createApp({ reduceMotion: true });
    const { document } = app.window;
    const input = document.getElementById("inputText");

    input.value = "abc";
    input.dispatchEvent(new app.window.Event("input", { bubbles: true }));
    document.getElementById("convertBtn").click();
    assert.equal(app.scrollCalls.at(-1).settings.behavior, "auto");
    app.dom.window.close();
  });

  await test("全消しを一度だけ元に戻せる", async () => {
    const app = await createApp();
    const { document } = app.window;
    const input = document.getElementById("inputText");

    input.value = "元に戻す文章";
    input.dispatchEvent(new app.window.Event("input", { bubbles: true }));
    document.getElementById("clearAllBtn").click();
    assert.equal(input.value, "");
    assert.equal(document.getElementById("undoClearBtn").hidden, false);

    document.getElementById("undoClearBtn").click();
    assert.equal(input.value, "元に戻す文章");
    assert.equal(document.getElementById("undoClearBtn").hidden, true);
    app.dom.window.close();
  });

  await test("localStorageが使えなくても起動する", async () => {
    const app = await createApp({ storageThrows: true });
    assert.equal(app.window.document.getElementById("inputText").disabled, false);
    assert.equal(app.window.document.getElementById("loadError").hidden, true);
    app.dom.window.close();
  });

  await test("設定のHTTP失敗と不正JSONを可視エラーにする", async () => {
    const httpFailure = await createApp({
      fetchFactory: () => async () => ({ ok: false, status: 503 })
    });
    assert.equal(
      httpFailure.window.document.getElementById("loadError").hidden,
      false
    );
    httpFailure.dom.window.close();

    const invalidConfig = await createApp({
      fetchFactory: () => async () => ({
        ok: true,
        json: async () => ({ tabDefinitions: {} })
      })
    });
    assert.equal(
      invalidConfig.window.document.getElementById("loadError").hidden,
      false
    );
    invalidConfig.dom.window.close();
  });

  await test("設定読み込みのタイムアウトを可視エラーにする", async () => {
    const app = await createApp({
      fastConfigTimeout: true,
      fetchFactory: (window) => (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => {
            reject(new window.DOMException("timed out", "AbortError"));
          });
        })
    });
    assert.equal(app.window.document.getElementById("loadError").hidden, false);
    assert.match(
      app.window.document.getElementById("loadErrorMessage").textContent,
      /タイムアウト/
    );
    app.dom.window.close();
  });

  await test("変換処理スクリプト欠落時に可視エラーを出す", async () => {
    const app = await createApp({ withoutConversions: true });
    const { document } = app.window;

    assert.equal(document.getElementById("loadError").hidden, false);
    assert.match(
      document.getElementById("loadErrorMessage").textContent,
      /変換処理の読み込みに失敗/
    );
    assert.doesNotMatch(
      document.getElementById("selectionSummary").textContent,
      /読み込んでいます/
    );
    app.dom.window.close();
  });

  process.stdout.write("画面状態のテストが完了しました。\n");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

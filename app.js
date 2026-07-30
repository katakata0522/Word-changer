(function initializeWordChanger() {
  "use strict";

  const conversions = globalThis.WordChangerConversions;
  if (!conversions) {
    const selectionSummary = document.getElementById("selectionSummary");
    const loadError = document.getElementById("loadError");
    const loadErrorMessage = document.getElementById("loadErrorMessage");
    const retryBtn = document.getElementById("retryBtn");
    const appStatus = document.getElementById("appStatus");

    selectionSummary.textContent = "変換処理を読み込めませんでした。";
    loadErrorMessage.textContent =
      "変換処理の読み込みに失敗しました。ページを再読み込みしてください。";
    loadError.hidden = false;
    retryBtn.addEventListener("click", () => window.location.reload());
    appStatus.textContent = "アプリケーションの変換処理を読み込めませんでした。";
    return;
  }

  const STORAGE_PREFIX = "jmn_v3_";
  const MAIN_CATEGORY_KEY = `${STORAGE_PREFIX}mainCategory`;
  const SUB_TAB_KEY_PREFIX = `${STORAGE_PREFIX}subTab_`;
  const CONFIG_LOAD_TIMEOUT_MS = 15000;
  const VALID_CATEGORIES = ["practical", "fun"];

  const elements = {
    appStatus: document.getElementById("appStatus"),
    charCounter: document.getElementById("charCounter"),
    clearAllBtn: document.getElementById("clearAllBtn"),
    convertBtn: document.getElementById("convertBtn"),
    copyBtn: document.getElementById("copyBtn"),
    copyIcon: document.querySelector("#copyBtn .copy-icon"),
    copyLabel: document.querySelector("#copyBtn .copy-label"),
    funPanel: document.getElementById("funPanel"),
    funTabsContainer: document.getElementById("funTabsContainer"),
    inputError: document.getElementById("inputError"),
    inputText: document.getElementById("inputText"),
    loadError: document.getElementById("loadError"),
    loadErrorMessage: document.getElementById("loadErrorMessage"),
    mainCategoryTabs: Array.from(document.querySelectorAll(".main-category-tab")),
    practicalPanel: document.getElementById("practicalPanel"),
    practicalTabsContainer: document.getElementById("practicalTabsContainer"),
    resultArea: document.getElementById("resultArea"),
    resultText: document.getElementById("resultText"),
    retryBtn: document.getElementById("retryBtn"),
    selectionSummary: document.getElementById("selectionSummary"),
    undoClearBtn: document.getElementById("undoClearBtn")
  };

  const state = {
    config: null,
    conversionStrategies: {},
    currentMainCategory: "practical",
    currentSubTab: "",
    lastClearedValue: "",
    ready: false
  };

  const safeStorage = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        // 設定の保存に失敗しても変換機能は継続する。
      }
    }
  };

  function announce(message) {
    elements.appStatus.textContent = "";
    requestAnimationFrame(() => {
      elements.appStatus.textContent = message;
    });
  }

  function setControlsDisabled(disabled) {
    elements.inputText.disabled = disabled;
    elements.convertBtn.disabled = disabled;
    elements.clearAllBtn.disabled = disabled;
    elements.mainCategoryTabs.forEach((tab) => {
      tab.disabled = disabled;
    });
  }

  function validateConfig(config) {
    if (!config || typeof config !== "object") {
      throw new Error("設定データがオブジェクトではありません。");
    }

    if (!config.tabDefinitions || !config.placeholderTexts || !config.funnySymbols) {
      throw new Error("設定データに必要な項目がありません。");
    }

    const temporaryStrategies = conversions.createConversionStrategies(config.funnySymbols);
    const seenIds = new Set();

    VALID_CATEGORIES.forEach((category) => {
      const tabs = config.tabDefinitions[category];
      if (!Array.isArray(tabs) || tabs.length === 0) {
        throw new Error(`${category}カテゴリに変換項目がありません。`);
      }

      tabs.forEach((tab) => {
        if (!tab || typeof tab.id !== "string" || typeof tab.label !== "string") {
          throw new Error("変換項目の形式が正しくありません。");
        }
        if (seenIds.has(tab.id)) {
          throw new Error(`変換ID「${tab.id}」が重複しています。`);
        }
        if (typeof temporaryStrategies[tab.id] !== "function") {
          throw new Error(`変換ID「${tab.id}」に処理がありません。`);
        }
        seenIds.add(tab.id);
      });
    });

    ["arabic", "korean", "alien"].forEach((key) => {
      if (!Array.isArray(config.funnySymbols[key]) || config.funnySymbols[key].length === 0) {
        throw new Error(`ランダム文字「${key}」が設定されていません。`);
      }
    });
  }

  function getTabsForCategory(category) {
    return state.config?.tabDefinitions?.[category] || [];
  }

  function getCurrentTabDefinition() {
    return getTabsForCategory(state.currentMainCategory).find(
      (tab) => tab.id === state.currentSubTab
    );
  }

  function resetResult() {
    elements.resultArea.hidden = true;
    elements.resultText.textContent = "";
    elements.resultText.classList.remove("is-error");
    elements.copyBtn.hidden = true;
  }

  function updateSelectionSummary() {
    const categoryLabel = state.currentMainCategory === "practical" ? "実用" : "ネタ";
    const tab = getCurrentTabDefinition();
    elements.selectionSummary.textContent = tab
      ? `選択中：${categoryLabel} ／ ${tab.label}`
      : "変換方法を選択してください。";
  }

  function updatePlaceholder() {
    const placeholders = state.config?.placeholderTexts || {};
    elements.inputText.placeholder =
      placeholders[state.currentSubTab] ||
      placeholders.default ||
      "ここに変換したい文章を入力";
  }

  function setInputError(message) {
    const hasError = Boolean(message);
    elements.inputError.textContent = message;
    elements.inputError.hidden = !hasError;
    elements.inputText.setAttribute("aria-invalid", String(hasError));
  }

  function updateCharCounter() {
    const graphemes = conversions.segmentGraphemes(elements.inputText.value);
    const currentLength = graphemes.length;
    const overLimit = currentLength > conversions.MAX_INPUT_GRAPHEMES;
    elements.charCounter.textContent =
      `${currentLength} / ${conversions.MAX_INPUT_GRAPHEMES}文字`;
    elements.charCounter.classList.toggle(
      "is-near-limit",
      currentLength >= conversions.MAX_INPUT_GRAPHEMES * 0.9
    );
    setInputError(
      overLimit
        ? `入力が上限を${currentLength - conversions.MAX_INPUT_GRAPHEMES}文字超えています。文章は削除されていません。上限以内に収めてください。`
        : ""
    );

    return { currentLength, overLimit };
  }

  function setActiveSubTab(category, tabId, options = {}) {
    if (category !== state.currentMainCategory) {
      return;
    }

    const tabs = getTabsForCategory(category);
    const targetId = tabs.some((tab) => tab.id === tabId) ? tabId : tabs[0]?.id;
    if (!targetId) {
      return;
    }

    state.currentSubTab = targetId;
    const container =
      category === "practical"
        ? elements.practicalTabsContainer
        : elements.funTabsContainer;

    container.querySelectorAll(".conversion-option").forEach((button) => {
      const isActive = button.dataset.tabId === targetId;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-checked", String(isActive));
      button.tabIndex = isActive ? 0 : -1;
    });

    updatePlaceholder();
    updateSelectionSummary();
    safeStorage.set(`${SUB_TAB_KEY_PREFIX}${category}`, targetId);

    if (!options.keepResult) {
      resetResult();
    }
  }

  function setActiveMainCategory(category, options = {}) {
    const targetCategory = VALID_CATEGORIES.includes(category) ? category : "practical";
    state.currentMainCategory = targetCategory;

    elements.mainCategoryTabs.forEach((tab) => {
      const isActive = tab.dataset.category === targetCategory;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    });

    const practicalActive = targetCategory === "practical";
    elements.practicalPanel.hidden = !practicalActive;
    elements.funPanel.hidden = practicalActive;

    const savedSubTab = safeStorage.get(`${SUB_TAB_KEY_PREFIX}${targetCategory}`);
    setActiveSubTab(targetCategory, savedSubTab, { keepResult: true });
    safeStorage.set(MAIN_CATEGORY_KEY, targetCategory);

    if (!options.keepResult) {
      resetResult();
    }
  }

  function moveFocusWithin(buttons, currentButton, direction) {
    const enabledButtons = buttons.filter((button) => !button.disabled && !button.hidden);
    const currentIndex = enabledButtons.indexOf(currentButton);
    if (currentIndex === -1) {
      return;
    }

    const nextIndex =
      (currentIndex + direction + enabledButtons.length) % enabledButtons.length;
    enabledButtons[nextIndex].focus();
    enabledButtons[nextIndex].click();
  }

  function createSubTabs(category, container) {
    container.replaceChildren();

    getTabsForCategory(category).forEach((tabDefinition) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "conversion-option";
      button.dataset.tabId = tabDefinition.id;
      button.textContent = tabDefinition.label;
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", "false");
      button.tabIndex = -1;

      button.addEventListener("click", () => {
        setActiveSubTab(category, tabDefinition.id);
      });

      button.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
          return;
        }
        event.preventDefault();
        const buttons = Array.from(container.querySelectorAll(".conversion-option"));
        const direction = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1;
        moveFocusWithin(buttons, button, direction);
      });

      container.appendChild(button);
    });
  }

  function showResult(message, options = {}) {
    elements.resultText.textContent = message;
    elements.resultText.classList.toggle("is-error", Boolean(options.error));
    elements.resultArea.hidden = false;
    elements.copyBtn.hidden = Boolean(options.error || options.empty);
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    elements.resultArea.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest"
    });
  }

  function convertInput() {
    if (!state.ready) {
      return;
    }

    const { overLimit } = updateCharCounter();
    if (overLimit) {
      resetResult();
      announce("入力文字数が上限を超えています。文章は削除されていません。");
      elements.inputText.focus();
      return;
    }

    const input = elements.inputText.value;
    if (input.length === 0) {
      resetResult();
      setInputError("変換したい文章を入力してください。");
      announce("変換したい文章を入力してください。");
      elements.inputText.focus();
      return;
    }

    const strategy = state.conversionStrategies[state.currentSubTab];
    if (typeof strategy !== "function") {
      showResult("変換方法を選択してください。", { error: true });
      announce("変換方法が選択されていません。");
      return;
    }

    const result = strategy(input);
    if (result.length === 0) {
      showResult("（空白をすべて削除したため、結果は空です）", { empty: true });
      announce("変換結果は空です。");
      return;
    }

    showResult(result);
    elements.copyLabel.textContent = "結果をコピー";
    elements.copyIcon.textContent = "📋";
    announce("変換が完了しました。");
  }

  function fallbackCopyText(text) {
    const temporaryTextArea = document.createElement("textarea");
    const previousFocus = document.activeElement;
    temporaryTextArea.value = text;
    temporaryTextArea.setAttribute("readonly", "");
    temporaryTextArea.style.position = "fixed";
    temporaryTextArea.style.left = "-9999px";
    document.body.appendChild(temporaryTextArea);
    temporaryTextArea.select();

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }

    temporaryTextArea.remove();
    if (previousFocus instanceof HTMLElement) {
      previousFocus.focus();
    }
    return copied;
  }

  async function copyResult() {
    const text = elements.resultText.textContent || "";
    if (!text || elements.resultText.classList.contains("is-error")) {
      return;
    }

    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      } else {
        copied = fallbackCopyText(text);
      }
    } catch {
      copied = fallbackCopyText(text);
    }

    elements.copyLabel.textContent = copied ? "コピーしました" : "コピーできませんでした";
    elements.copyIcon.textContent = copied ? "✅" : "❌";
    announce(copied ? "変換結果をコピーしました。" : "変換結果をコピーできませんでした。");

    window.setTimeout(() => {
      elements.copyLabel.textContent = "結果をコピー";
      elements.copyIcon.textContent = "📋";
    }, 1800);
  }

  function clearInput() {
    if (!elements.inputText.value) {
      elements.inputText.focus();
      return;
    }

    state.lastClearedValue = elements.inputText.value;
    elements.inputText.value = "";
    elements.undoClearBtn.hidden = false;
    updateCharCounter();
    resetResult();
    announce("入力内容を消去しました。元に戻すことができます。");
    elements.inputText.focus();
  }

  function undoClear() {
    if (!state.lastClearedValue) {
      return;
    }

    elements.inputText.value = state.lastClearedValue;
    state.lastClearedValue = "";
    elements.undoClearBtn.hidden = true;
    updateCharCounter();
    resetResult();
    announce("消去した入力内容を元に戻しました。");
    elements.inputText.focus();
  }

  function bindEvents() {
    elements.mainCategoryTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        setActiveMainCategory(tab.dataset.category);
      });

      tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight"].includes(event.key)) {
          return;
        }
        event.preventDefault();
        moveFocusWithin(
          elements.mainCategoryTabs,
          tab,
          event.key === "ArrowRight" ? 1 : -1
        );
      });
    });

    elements.inputText.addEventListener("input", () => {
      updateCharCounter();
      resetResult();
      if (elements.inputText.value && state.lastClearedValue) {
        state.lastClearedValue = "";
        elements.undoClearBtn.hidden = true;
      }
    });

    elements.inputText.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        convertInput();
      }
    });

    elements.convertBtn.addEventListener("click", convertInput);
    elements.copyBtn.addEventListener("click", copyResult);
    elements.clearAllBtn.addEventListener("click", clearInput);
    elements.undoClearBtn.addEventListener("click", undoClear);
    elements.retryBtn.addEventListener("click", loadConfig);
  }

  async function loadConfig() {
    state.ready = false;
    setControlsDisabled(true);
    elements.loadError.hidden = true;
    elements.selectionSummary.textContent = "設定を読み込んでいます。";

    const abortController = new AbortController();
    const timeoutId = window.setTimeout(
      () => abortController.abort(),
      CONFIG_LOAD_TIMEOUT_MS
    );

    try {
      const response = await fetch("config.json", {
        cache: "no-cache",
        signal: abortController.signal
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const config = await response.json();
      validateConfig(config);

      state.config = config;
      state.conversionStrategies = conversions.createConversionStrategies(
        config.funnySymbols
      );

      createSubTabs("practical", elements.practicalTabsContainer);
      createSubTabs("fun", elements.funTabsContainer);

      const savedCategory = safeStorage.get(MAIN_CATEGORY_KEY);
      setActiveMainCategory(
        VALID_CATEGORIES.includes(savedCategory) ? savedCategory : "practical",
        { keepResult: true }
      );

      state.ready = true;
      setControlsDisabled(false);
      updateCharCounter();
      updatePlaceholder();
      resetResult();
      announce("文字変換ツールの準備ができました。");
    } catch (error) {
      console.error("Word-changer initialization failed:", error);
      elements.selectionSummary.textContent = "設定を読み込めませんでした。";
      if (location.protocol === "file:") {
        elements.loadErrorMessage.textContent =
          "ローカルファイルを直接開くと設定を取得できません。簡易Webサーバー経由で開いてください。";
      } else if (error?.name === "AbortError") {
        elements.loadErrorMessage.textContent =
          "設定ファイルの読み込みがタイムアウトしました。通信状態を確認して、もう一度お試しください。";
      } else {
        elements.loadErrorMessage.textContent =
          "設定ファイルを読み込めませんでした。通信状態を確認して、もう一度お試しください。";
      }
      elements.loadError.hidden = false;
      announce("アプリケーションの設定を読み込めませんでした。");
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  bindEvents();
  loadConfig();
})();

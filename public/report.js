(() => {
  if (window.__A2UI_REPORT_INITIALIZED__) {
    window.A2UI_REPORT?.init?.();
    console.warn("A2UI report already initialized.");
    return;
  }
  window.__A2UI_REPORT_INITIALIZED__ = true;

  const { apiBase } = window.APP_CONFIG || {};
  const apiBaseUrl = apiBase || "";

  let formSelect = null;
  let reportColumnSelect = null;
  let reportMetricSelect = null;
  let reportChartType = null;
  let refreshReport = null;
  let exportExcel = null;
  let reportSheet = null;
  let reportChartCanvas = null;
  let reportPromptInput = null;
  let reportPromptButton = null;
  let reportPromptResult = null;
  let reportCauseResult = null;
  let reportTableList = null;
  let reportDataCard = null;
  let promptApplied = false;
  let forecastEnabled = false;
  let forecastSteps = 3;
  let forecastUnit = "auto";
  let forecastEndMonth = null;
  let forecastRequestId = 0;
  let submissionsLoading = null;
  let reportChartCard = null;
  let reportChartMaximize = null;
  let reportTableMaximize = null;
  let refreshReportTable = null;
  let reportChartReset = null;
  let reportTableReset = null;
  const boundHandlers = new WeakMap();

  let allSubmissions = [];
  let chartInstance = null;
  let currentReportItems = [];
  let sheetInstance = null;
  let delegateBound = false;

  function isReportDebugEnabled() {
    try {
      const params = new URLSearchParams(window.location.search || "");
      if (params.get("debug") === "1" || params.get("debug") === "true") {
        return true;
      }
    } catch (error) {
      // ignore
    }
    try {
      return localStorage.getItem("a2ui:report:debug") === "1";
    } catch (error) {
      return false;
    }
  }

  function reportDebug(...args) {
    if (!isReportDebugEnabled()) {
      return;
    }
    const formatted = args.map((arg) => {
      if (typeof arg === "string") {
        return arg;
      }
      try {
        return JSON.stringify(arg);
      } catch (error) {
        return String(arg);
      }
    });
    console.log("[report]", ...formatted);
  }

  function bindEventOnce(element, event, handler, options) {
    if (!element) {
      return;
    }
    let eventMap = boundHandlers.get(element);
    if (!eventMap) {
      eventMap = new Map();
      boundHandlers.set(element, eventMap);
    }
    const handlers = eventMap.get(event) || new Set();
    if (handlers.has(handler)) {
      return;
    }
    handlers.add(handler);
    eventMap.set(event, handlers);
    element.addEventListener(event, handler, options);
  }

  function bindElements() {
    formSelect = document.getElementById("reportFormSelect");
    reportColumnSelect = document.getElementById("reportColumnSelect");
    reportMetricSelect = document.getElementById("reportMetricSelect");
    reportChartType = document.getElementById("reportChartType");
    refreshReport = document.getElementById("refreshReport");
    exportExcel = document.getElementById("exportExcel");
    reportSheet = document.getElementById("reportSheet");
    reportChartCanvas = document.getElementById("reportChart");
    reportPromptInput = document.getElementById("reportPromptInput");
    reportPromptButton = document.getElementById("reportPromptButton");
    reportPromptResult = document.getElementById("reportPromptResult");
    reportCauseResult = document.getElementById("reportCauseResult");
    reportTableList = document.getElementById("reportTableList");
    reportDataCard = document.getElementById("reportDataCard");
    reportChartCard = document.getElementById("reportChartCard");
    reportChartMaximize = document.getElementById("reportChartMaximize");
    reportTableMaximize = document.getElementById("reportTableMaximize");
    refreshReportTable = document.getElementById("refreshReportTable");
    reportChartReset = document.getElementById("reportChartReset");
    reportTableReset = document.getElementById("reportTableReset");
  }

  function handleDelegatedChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }
    if (target.id === "reportFormSelect") {
      formSelect = target;
      renderColumnOptions();
      renderMetricOptions();
      renderReport();
      return;
    }
    if (target.id === "reportColumnSelect") {
      reportColumnSelect = target;
      renderReport();
      return;
    }
    if (target.id === "reportMetricSelect") {
      reportMetricSelect = target;
      renderReport();
      return;
    }
    if (target.id === "reportChartType") {
      reportChartType = target;
      renderReport();
    }
  }

  function ensureCardElements() {
    if (!reportChartCard || !reportChartCard.isConnected) {
      reportChartCard = document.getElementById("reportChartCard");
    }
    if (!reportDataCard || !reportDataCard.isConnected) {
      reportDataCard = document.getElementById("reportDataCard");
    }
    if (!reportChartMaximize || !reportChartMaximize.isConnected) {
      reportChartMaximize = document.getElementById("reportChartMaximize");
    }
    if (!reportTableMaximize || !reportTableMaximize.isConnected) {
      reportTableMaximize = document.getElementById("reportTableMaximize");
    }
    if (!reportChartReset || !reportChartReset.isConnected) {
      reportChartReset = document.getElementById("reportChartReset");
    }
    if (!reportTableReset || !reportTableReset.isConnected) {
      reportTableReset = document.getElementById("reportTableReset");
    }
    if (!refreshReportTable || !refreshReportTable.isConnected) {
      refreshReportTable = document.getElementById("refreshReportTable");
    }
  }

  function ensurePromptElements() {
    if (!reportPromptInput || !reportPromptInput.isConnected) {
      reportPromptInput = document.getElementById("reportPromptInput");
    }
    if (!reportPromptButton || !reportPromptButton.isConnected) {
      reportPromptButton = document.getElementById("reportPromptButton");
    }
    if (!reportPromptResult || !reportPromptResult.isConnected) {
      reportPromptResult = document.getElementById("reportPromptResult");
    }
    if (!reportCauseResult || !reportCauseResult.isConnected) {
      reportCauseResult = document.getElementById("reportCauseResult");
    }
  }

  function handleDelegatedClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    ensureCardElements();
    ensurePromptElements();
    if (target.closest("#refreshReport")) {
      loadSubmissions();
      return;
    }
    if (target.closest("#refreshReportTable")) {
      loadSubmissions();
      return;
    }
    if (target.closest("#exportExcel")) {
      exportReportToExcel();
      return;
    }
    if (target.closest("#reportChartMaximize")) {
      toggleCardMaximize(reportChartCard, reportChartMaximize);
      return;
    }
    if (target.closest("#reportTableMaximize")) {
      toggleCardMaximize(reportDataCard, reportTableMaximize);
      return;
    }
    if (target.closest("#reportChartReset")) {
      resetCardPosition(reportChartCard, reportChartMaximize);
      return;
    }
    if (target.closest("#reportTableReset")) {
      resetCardPosition(reportDataCard, reportTableMaximize);
      return;
    }
    if (target.closest("#reportPromptButton")) {
      handlePromptAction();
    }
  }

  function setMaximizeButtonState(button, isMaximized) {
    if (!button) {
      return;
    }
    button.classList.toggle("is-maximized", isMaximized);
    button.setAttribute("aria-label", isMaximized ? "元に戻す" : "最大化");
  }

  function toggleCardMaximize(card, button) {
    if (!card) {
      return;
    }
    const willMaximize = !card.classList.contains("is-maximized");
    card.classList.toggle("is-maximized", willMaximize);
    setMaximizeButtonState(button, willMaximize);
    if (willMaximize) {
      card.dataset.prevTransform = card.style.transform || "";
      card.style.transform = "";
      applyMaximizedBounds(card);
    } else {
      if (card.dataset.prevTransform !== undefined) {
        card.style.transform = card.dataset.prevTransform;
      }
      clearMaximizedBounds(card);
    }
    updateTableLayout();
  }

  function applyMaximizedBounds(card) {
    if (!card) {
      return;
    }
    const sidebar = document.querySelector(".app-sidebar");
    const hero = document.querySelector(".report-hero");
    const sidebarRect = sidebar?.getBoundingClientRect();
    const heroRect = hero?.getBoundingClientRect();
    const left = (sidebarRect?.right || 0) + 24;
    const top = (heroRect?.bottom || 0) + 16;
    card.style.setProperty("--report-max-left", `${left}px`);
    card.style.setProperty("--report-max-top", `${top}px`);
    card.style.setProperty("--report-max-right", "24px");
    card.style.setProperty("--report-max-bottom", "24px");
    card.style.position = "fixed";
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
    card.style.right = "24px";
    card.style.bottom = "24px";
    card.style.zIndex = "40";
  }

  function clearMaximizedBounds(card) {
    if (!card) {
      return;
    }
    card.style.removeProperty("--report-max-left");
    card.style.removeProperty("--report-max-top");
    card.style.removeProperty("--report-max-right");
    card.style.removeProperty("--report-max-bottom");
    card.style.removeProperty("position");
    card.style.removeProperty("left");
    card.style.removeProperty("top");
    card.style.removeProperty("right");
    card.style.removeProperty("bottom");
    card.style.removeProperty("z-index");
  }

  function refreshMaximizedBounds() {
    if (reportChartCard?.classList.contains("is-maximized")) {
      applyMaximizedBounds(reportChartCard);
    }
    if (reportDataCard?.classList.contains("is-maximized")) {
      applyMaximizedBounds(reportDataCard);
    }
  }

  function resetCardPosition(card, maximizeButton) {
    if (!card) {
      return;
    }
    if (card.classList.contains("is-maximized")) {
      card.classList.remove("is-maximized");
      clearMaximizedBounds(card);
      setMaximizeButtonState(maximizeButton, false);
    }
    card.style.transform = "";
    card.dataset.dragX = "0";
    card.dataset.dragY = "0";
    updateTableLayout();
  }

  function updateTableLayout() {
    if (!reportDataCard || !reportSheet) {
      return;
    }
    const isMaximized = reportDataCard.classList.contains("is-maximized");
    reportSheet.style.height = isMaximized ? "100%" : "";
    reportSheet.style.width = isMaximized ? "100%" : "";
    if (sheetInstance?.refresh) {
      sheetInstance.refresh();
      return;
    }
    if (promptApplied) {
      renderSheet(currentReportItems);
    }
  }

  function setupDraggableCard(card) {
    if (!card) {
      return;
    }
    const handle = card.querySelector(".report-card__handle");
    if (!handle) {
      return;
    }
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;
    let startRect = null;
    const onMove = (event) => {
      const clientX = event.clientX ?? 0;
      const clientY = event.clientY ?? 0;
      const dx = clientX - startX;
      const dy = clientY - startY;
      if (!startRect) {
        return;
      }
      const maxLeft = Math.max(0, window.innerWidth - startRect.width);
      const maxTop = Math.max(0, window.innerHeight - startRect.height);
      const nextLeft = Math.min(maxLeft, Math.max(0, startRect.left + dx));
      const nextTop = Math.min(maxTop, Math.max(0, startRect.top + dy));
      const nextX = originX + (nextLeft - startRect.left);
      const nextY = originY + (nextTop - startRect.top);
      card.style.transform = `translate(${nextX}px, ${nextY}px)`;
      card.dataset.dragX = String(nextX);
      card.dataset.dragY = String(nextY);
    };
    const onUp = () => {
      card.classList.remove("is-dragging");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    handle.addEventListener(
      "mousedown",
      (event) => {
        if (card.classList.contains("is-maximized")) {
          return;
        }
        if (event.target.closest("button")) {
          return;
        }
        startX = event.clientX;
        startY = event.clientY;
        originX = Number(card.dataset.dragX || 0);
        originY = Number(card.dataset.dragY || 0);
        startRect = card.getBoundingClientRect();
        card.classList.add("is-dragging");
        document.addEventListener("mousemove", onMove, { passive: true });
        document.addEventListener("mouseup", onUp, { passive: true });
      },
      { passive: true }
    );
  }

  function normalizePromptText(text) {
    return (text || "").toLowerCase().replace(/\s+/g, "");
  }

  function normalizeDateLabelString(label) {
    if (label === null || label === undefined) {
      return "";
    }
    return String(label)
      .trim()
      .replace(/[年月]/g, "-")
      .replace(/日/g, "")
      .replace(/[−ー]/g, "-")
      .replace(/／/g, "/");
  }

  function resolveForecastUnit(prompt) {
    const normalized = normalizePromptText(prompt);
    if (normalized.includes("来月")) {
      return "month";
    }
    if (normalized.match(/(\d+)\s*(ヶ月|か月|月)/)) {
      return "month";
    }
    if (normalized.match(/(\d+)\s*(週|日)/)) {
      return "day";
    }
    if (normalized.includes("月別")) {
      return "month";
    }
    if (normalized.includes("日別")) {
      return "day";
    }
    return "auto";
  }

  function resolveForecastEndMonth(prompt) {
    const normalized = normalizePromptText(prompt);
    const match = normalized.match(/(\d{1,2})月末まで/);
    if (!match) {
      return null;
    }
    const month = Number(match[1]);
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      return null;
    }
    return month;
  }

  function clampForecastSteps(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 3;
    }
    return Math.min(12, Math.max(1, Math.round(numeric)));
  }

  function resolveForecastStepsFromPrompt(prompt, parsedSteps) {
    if (parsedSteps !== undefined && parsedSteps !== null) {
      return clampForecastSteps(parsedSteps);
    }
    const normalized = normalizePromptText(prompt);
    const stepMatch = normalized.match(/(\d+)\s*(期|回|ヶ月|か月|月|週|日)/);
    if (stepMatch) {
      return clampForecastSteps(stepMatch[1]);
    }
    if (normalized.includes("来月")) {
      return 1;
    }
    return 3;
  }

  function shouldEnableForecast(prompt) {
    return false;
  }

  function getSelectOptions(select) {
    if (!select) {
      return [];
    }
    return Array.from(select.options).map((option) => ({
      value: option.value,
      label: option.textContent || option.value,
    }));
  }

  function findBestOption(prompt, options) {
    if (!prompt || options.length === 0) {
      return "";
    }
    const normalized = normalizePromptText(prompt);
    let best = null;
    options.forEach((option) => {
      const label = normalizePromptText(option.label);
      const value = normalizePromptText(option.value);
      const hit = label && normalized.includes(label);
      const valueHit = value && normalized.includes(value);
      if (hit || valueHit) {
        const score = Math.max(label.length, value.length);
        if (!best || score > best.score) {
          best = { value: option.value, score };
        }
      }
    });
    return best?.value || "";
  }

  function resolveChartTypeFromPrompt(prompt) {
    const normalized = normalizePromptText(prompt);
    if (normalized.includes("折れ線") || normalized.includes("line")) {
      return "line";
    }
    if (normalized.includes("円") || normalized.includes("pie")) {
      return "pie";
    }
    if (normalized.includes("棒") || normalized.includes("bar")) {
      return "bar";
    }
    return "";
  }

  function resolveColumnFromPrompt(prompt, options) {
    const normalized = normalizePromptText(prompt);
    if (
      normalized.includes("日") ||
      normalized.includes("日時") ||
      normalized.includes("日付") ||
      normalized.includes("日時別") ||
      normalized.includes("時系列")
    ) {
      const nonCreatedOptions = options.filter(
        (option) => option.value !== "__createdAt"
      );
      const matched = findBestOption(prompt, nonCreatedOptions);
      if (matched) {
        return matched;
      }
      const dateOption = options.find(
        (option) => option.value === "__createdAt"
      );
      if (dateOption) {
        return dateOption.value;
      }
    }
    return findBestOption(prompt, options);
  }

  function resolveMetricFromPrompt(prompt, options) {
    const normalized = normalizePromptText(prompt);
    if (
      normalized.includes("件数") ||
      normalized.includes("count") ||
      normalized.includes("人数") ||
      normalized.includes("数")
    ) {
      const countOption = options.find((option) => option.value === "__count");
      if (countOption) {
        return countOption.value;
      }
    }
    return findBestOption(prompt, options);
  }

  function setSelectValue(select, value) {
    if (!select || !value) {
      return false;
    }
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function extractJsonFromText(text) {
    if (!text || typeof text !== "string") {
      return null;
    }
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }
    const slice = text.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch (error) {
      return null;
    }
  }

  function resolveOptionValue(value, options) {
    if (!value) {
      return "";
    }
    const exact = options.find(
      (option) => option.value === value || option.label === value
    );
    if (exact) {
      return exact.value;
    }
    return findBestOption(value, options);
  }

  function buildPromptResultText() {
    const selectedForm =
      formSelect?.options?.[formSelect.selectedIndex]?.textContent || "";
    const selectedColumn =
      reportColumnSelect?.options?.[reportColumnSelect.selectedIndex]
        ?.textContent || "";
    const selectedMetric =
      reportMetricSelect?.options?.[reportMetricSelect.selectedIndex]
        ?.textContent || "";
    const selectedChart =
      reportChartType?.options?.[reportChartType.selectedIndex]?.textContent ||
      "";
    return `フォーム: ${selectedForm} / 横軸: ${selectedColumn} / 縦軸: ${selectedMetric} / グラフ: ${selectedChart}`;
  }

  function applyPromptResult(prompt, parsed) {
    const formOptions = getSelectOptions(formSelect);
    const formValue =
      resolveOptionValue(parsed?.form, formOptions) ||
      findBestOption(prompt, formOptions);
    if (formValue) {
      setSelectValue(formSelect, formValue);
    }

    renderColumnOptions();
    renderMetricOptions();

    const columnOptions = getSelectOptions(reportColumnSelect);
    const metricOptions = getSelectOptions(reportMetricSelect);
    const columnValue =
      resolveOptionValue(parsed?.column, columnOptions) ||
      resolveColumnFromPrompt(prompt, columnOptions);
    const metricValue =
      resolveOptionValue(parsed?.metric, metricOptions) ||
      resolveMetricFromPrompt(prompt, metricOptions);
    const chartTypeValue =
      parsed?.chartType || resolveChartTypeFromPrompt(prompt);
    forecastEnabled = false;
    forecastSteps = 0;
    forecastUnit = "auto";
    forecastEndMonth = null;

    if (columnValue) {
      setSelectValue(reportColumnSelect, columnValue);
    }
    if (metricValue) {
      setSelectValue(reportMetricSelect, metricValue);
    }
    if (chartTypeValue) {
      setSelectValue(reportChartType, chartTypeValue);
    }

    promptApplied = true;
    renderReport();
    refinePromptSelections(prompt);
    if (reportPromptResult) {
      reportPromptResult.textContent = buildPromptResultText();
    }
  }

  function handlePromptGenerateLocal(prompt) {
    const formOptions = getSelectOptions(formSelect);
    const formValue = findBestOption(prompt, formOptions);
    if (formValue) {
      setSelectValue(formSelect, formValue);
    }

    renderColumnOptions();
    renderMetricOptions();

    const columnOptions = getSelectOptions(reportColumnSelect);
    const metricOptions = getSelectOptions(reportMetricSelect);
    const columnValue = resolveColumnFromPrompt(prompt, columnOptions);
    const metricValue = resolveMetricFromPrompt(prompt, metricOptions);
    const chartTypeValue = resolveChartTypeFromPrompt(prompt);
    forecastEnabled = false;
    forecastSteps = 0;
    forecastUnit = "auto";
    forecastEndMonth = null;

    if (columnValue) {
      setSelectValue(reportColumnSelect, columnValue);
    }
    if (metricValue) {
      setSelectValue(reportMetricSelect, metricValue);
    }
    if (chartTypeValue) {
      setSelectValue(reportChartType, chartTypeValue);
    }

    reportDebug("prompt_apply_local", {
      prompt,
      resolved: {
        formValue,
        columnValue,
        metricValue,
        chartTypeValue,
      },
      options: {
        columns: columnOptions,
        metrics: metricOptions,
      },
    });

    promptApplied = true;
    renderReport();
    refinePromptSelections(prompt);
    if (reportPromptResult) {
      reportPromptResult.textContent = buildPromptResultText();
    }
    return { mode: resolvePromptMode(prompt) };
  }

  function resolvePromptMode(prompt) {
    const text = String(prompt || "").toLowerCase();
    const causeKeywords = [
      "原因",
      "理由",
      "なぜ",
      "要因",
      "コメント",
      "説明",
      "傾向",
      "トレンド",
      "増減",
    ];
    return causeKeywords.some((keyword) => text.includes(keyword))
      ? "both"
      : "chart";
  }

  function normalizePromptMode(mode, prompt) {
    const normalized = String(mode || "").toLowerCase();
    if (normalized === "both") {
      return "both";
    }
    if (normalized === "cause") {
      return "cause";
    }
    if (normalized === "chart") {
      return "chart";
    }
    return resolvePromptMode(prompt);
  }

  function matchesAnyOption(prompt, options) {
    if (!prompt || !Array.isArray(options) || options.length === 0) {
      return false;
    }
    const normalized = normalizePromptText(prompt);
    return options.some((option) => {
      const label = normalizePromptText(option.label || "");
      const value = normalizePromptText(option.value || "");
      return (
        (label && normalized.includes(label)) ||
        (value && normalized.includes(value))
      );
    });
  }

  function isTrendOnlyPrompt(
    prompt,
    formOptions,
    columnOptions,
    metricOptions
  ) {
    const normalized = normalizePromptText(prompt);
    const trendKeywords = ["傾向", "トレンド", "増減", "推移", "変化"];
    const chartKeywords = [
      "棒",
      "折れ線",
      "円",
      "bar",
      "line",
      "pie",
      "グラフ",
    ];
    const mentionsTrend = trendKeywords.some((keyword) =>
      normalized.includes(keyword)
    );
    if (!mentionsTrend) {
      return false;
    }
    if (chartKeywords.some((keyword) => normalized.includes(keyword))) {
      return false;
    }
    const hasForm = matchesAnyOption(prompt, formOptions);
    const hasColumn = matchesAnyOption(prompt, columnOptions);
    const hasMetric = matchesAnyOption(prompt, metricOptions);
    return !(hasForm || hasColumn || hasMetric);
  }

  function shouldPreferDateAxis(prompt) {
    const normalized = normalizePromptText(prompt);
    return (
      normalized.includes("日別") ||
      normalized.includes("月別") ||
      normalized.includes("日付") ||
      normalized.includes("発生日") ||
      normalized.includes("日時")
    );
  }

  function refinePromptSelections(prompt) {
    if (!promptApplied || !reportColumnSelect) {
      return;
    }
    if (!shouldPreferDateAxis(prompt)) {
      return;
    }
    const columnOptions = getSelectOptions(reportColumnSelect);
    const metricOptions = getSelectOptions(reportMetricSelect);
    const nextColumn = resolveColumnFromPrompt(prompt, columnOptions);
    const nextMetric = resolveMetricFromPrompt(prompt, metricOptions);
    let changed = false;
    if (
      nextColumn &&
      reportColumnSelect.value === "__createdAt" &&
      nextColumn !== reportColumnSelect.value
    ) {
      changed = setSelectValue(reportColumnSelect, nextColumn) || changed;
    }
    if (nextMetric && reportMetricSelect?.value !== nextMetric) {
      changed = setSelectValue(reportMetricSelect, nextMetric) || changed;
    }
    if (changed) {
      renderReport();
    }
  }

  async function ensureReportDataReady() {
    const formOptionCount = formSelect?.options?.length ?? 0;
    if (formOptionCount === 0 || allSubmissions.length === 0) {
      await loadSubmissions();
    }
    if ((formSelect?.options?.length ?? 0) === 0) {
      renderFormOptions();
      renderColumnOptions();
      renderMetricOptions();
    }
  }

  async function handlePromptAction() {
    ensurePromptElements();
    const prompt = reportPromptInput?.value?.trim() || "";
    if (!prompt) {
      return;
    }
    await ensureReportDataReady();
    const formOptions = getSelectOptions(formSelect);
    const columnOptions = getSelectOptions(reportColumnSelect);
    const metricOptions = getSelectOptions(reportMetricSelect);
    reportDebug("prompt_action", {
      prompt,
      formCount: formSelect?.options?.length ?? 0,
      columnCount: reportColumnSelect?.options?.length ?? 0,
      metricCount: reportMetricSelect?.options?.length ?? 0,
      selectedForm: formSelect?.value || "",
      selectedColumn: reportColumnSelect?.value || "",
      selectedMetric: reportMetricSelect?.value || "",
    });
    if (isTrendOnlyPrompt(prompt, formOptions, columnOptions, metricOptions)) {
      if (reportPromptResult) {
        reportPromptResult.textContent = "現在のデータで傾向推論を実行します。";
      }
      if (!currentReportItems.length) {
        renderReport();
      }
      handleCauseGenerate();
      return;
    }
    const decision = await handlePromptGenerate();
    const mode = normalizePromptMode(decision?.mode, prompt);
    if (reportPromptResult && mode === "both") {
      reportPromptResult.textContent = "グラフ生成と傾向推論を実行します。";
    }
    if (mode === "cause" || mode === "both") {
      if (!currentReportItems.length) {
        renderReport();
      }
      handleCauseGenerate();
    }
  }

  async function handlePromptGenerate() {
    const prompt = reportPromptInput?.value?.trim() || "";
    if (!prompt) {
      return;
    }

    if (reportPromptResult) {
      reportPromptResult.textContent = "AIが解析中です...";
    }

    const formOptions = getSelectOptions(formSelect);
    const columnOptions = getSelectOptions(reportColumnSelect);
    const metricOptions = getSelectOptions(reportMetricSelect);
    const chartOptions = getSelectOptions(reportChartType);
    const model = window.APP_CONFIG?.model || "gpt-4o-mini";
    const systemPrompt = [
      "あなたは帳票ダッシュボードのアシスタントです。",
      "次のJSONだけを返してください。",
      '{ "form": string, "column": string, "metric": string, "chartType": "bar|line|pie", "mode": "chart|cause|both" }',
      "form/column/metric は候補の value または label から最も近いものを選ぶ。",
      "候補に該当がない場合は空文字にする。",
      "mode はユーザーの意図に合わせて選ぶ。傾向/原因/理由などがあれば cause または both。",
      "出力はJSONのみ。",
    ].join(" ");
    const userPrompt = [
      "ユーザーの指示:",
      prompt,
      "",
      "フォーム候補:",
      JSON.stringify(formOptions),
      "横軸候補:",
      JSON.stringify(columnOptions),
      "縦軸候補:",
      JSON.stringify(metricOptions),
      "グラフ種別候補:",
      JSON.stringify(chartOptions),
    ].join("\n");

    try {
      const response = await fetch("/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const content =
        data?.choices?.[0]?.message?.content ?? data?.output_text ?? "";
      let parsed = null;
      if (typeof content === "string") {
        try {
          parsed = JSON.parse(content);
        } catch (error) {
          parsed = extractJsonFromText(content);
        }
      }
      if (!parsed) {
        throw new Error("JSONの解析に失敗しました。");
      }
      applyPromptResult(prompt, parsed);
      return { mode: parsed?.mode };
    } catch (error) {
      reportDebug("prompt_ai_failed", {
        error: String(error?.message || error),
      });
      handlePromptGenerateLocal(prompt);
      if (reportPromptResult) {
        reportPromptResult.textContent = `${buildPromptResultText()} (AI解析に失敗したため簡易解析で設定しました)`;
      }
      return { mode: resolvePromptMode(prompt) };
    }
  }

  function buildCauseContext(items) {
    const xField = reportColumnSelect?.value || "__createdAt";
    const metricField = reportMetricSelect?.value || "__count";
    const grouped = aggregateByField(items, xField, metricField);
    const labels = grouped.map(([label]) => label);
    const values = grouped.map(([, count]) => count);
    const changes = [];
    for (let i = 1; i < labels.length; i += 1) {
      changes.push({
        date: labels[i],
        value: values[i],
        delta: values[i] - values[i - 1],
      });
    }
    changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    const topChanges = changes.slice(0, 3);
    const sampleMap = new Map();
    topChanges.forEach((change) => {
      const related = items.filter(
        (item) => normalizeXAxisValue(item, xField) === change.date
      );
      sampleMap.set(
        change.date,
        related.slice(0, 5).map((item) => ({
          createdAt: item.createdAt || "",
          data: item.data || {},
        }))
      );
    });
    return {
      formName: formSelect?.value || "",
      xField,
      metricField,
      series: labels.map((label, index) => ({
        date: label,
        value: values[index],
      })),
      topChanges: topChanges.map((change) => ({
        ...change,
        samples: sampleMap.get(change.date) || [],
      })),
    };
  }

  function setCauseCardVisible(visible) {
    if (!reportCauseResult) {
      return;
    }
    const card = reportCauseResult.closest(".report-cause");
    if (!card) {
      return;
    }
    card.classList.toggle("is-hidden", !visible);
  }

  function renderCauseResult(result) {
    if (!reportCauseResult) {
      return;
    }
    setCauseCardVisible(true);
    const explanations = Array.isArray(result?.explanations)
      ? result.explanations
      : [];
    if (explanations.length === 0) {
      reportCauseResult.textContent = "推論結果がありません。";
      return;
    }
    reportCauseResult.textContent = explanations
      .map((item) => {
        const evidence = Array.isArray(item.evidence)
          ? `\n  - 根拠: ${item.evidence.join(", ")}`
          : "";
        return `・${item.date}: 変化 ${item.change}\n  - 理由: ${item.reason}${evidence}`;
      })
      .join("\n\n");
  }

  async function handleCauseGenerate() {
    ensurePromptElements();
    if (!reportCauseResult) {
      return;
    }
    const prompt = reportPromptInput?.value?.trim() || "";
    const items = Array.isArray(currentReportItems) ? currentReportItems : [];
    setCauseCardVisible(true);
    if (items.length < 2) {
      reportCauseResult.textContent = "推論に必要なデータが不足しています。";
      return;
    }
    reportCauseResult.textContent = "推論中...";
    const context = buildCauseContext(items);
    const model = window.APP_CONFIG?.model || "gpt-4o-mini";
    const systemPrompt = [
      "あなたは業務データの変化原因を説明するアシスタントです。",
      "次のJSONだけを返してください。",
      '{ "explanations": [{ "date": string, "change": number, "reason": string, "evidence"?: string[] }] }',
      "reason は具体的に。evidence は根拠となるデータの要約。",
      "出力はJSONのみ。",
    ].join(" ");
    const userPrompt = [
      "ユーザー指示:",
      prompt || "変化の大きい日の原因を説明して",
      "",
      "データ:",
      JSON.stringify(context),
    ].join("\n");
    try {
      const response = await fetch("/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const content =
        data?.choices?.[0]?.message?.content ?? data?.output_text ?? "";
      let parsed = null;
      if (typeof content === "string") {
        try {
          parsed = JSON.parse(content);
        } catch (error) {
          parsed = extractJsonFromText(content);
        }
      }
      if (!parsed) {
        throw new Error("JSONの解析に失敗しました。");
      }
      renderCauseResult(parsed);
    } catch (error) {
      reportCauseResult.textContent =
        "推論に失敗しました。再試行してください。";
    }
  }

  function getFormName(item) {
    return item.formName || item.formSpec?.title || "";
  }

  function normalizeSubmission(item) {
    if (!item) {
      return null;
    }
    if (typeof item === "string") {
      try {
        return JSON.parse(item);
      } catch (error) {
        return null;
      }
    }
    if (typeof item === "object") {
      const normalized = { ...item };
      if (typeof normalized.formSpec === "string") {
        try {
          normalized.formSpec = JSON.parse(normalized.formSpec);
        } catch (error) {
          normalized.formSpec = null;
        }
      }
      if (typeof normalized.data === "string") {
        try {
          normalized.data = JSON.parse(normalized.data);
        } catch (error) {
          normalized.data = null;
        }
      }
      if (Array.isArray(normalized.items)) {
        normalized.items = normalized.items
          .map((entry) => normalizeSubmission(entry))
          .filter(Boolean);
      }
      return normalized;
    }
    return null;
  }

  function parseJsonValue(value) {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch (error) {
        return value;
      }
    }
    return value;
  }

  function getSavedFormSpecMap() {
    const entries = readSavedForms();
    const map = new Map();
    entries.forEach((entry) => {
      const rawSpec = parseJsonValue(entry?.formSpec);
      const spec = rawSpec && typeof rawSpec === "object" ? rawSpec : null;
      const title = spec?.title || entry?.name || "";
      if (title && Array.isArray(spec?.fields) && spec.fields.length > 0) {
        map.set(title, spec);
      }
    });
    return map;
  }

  function getResolvedFormSpec(formName, items) {
    if (!formName) {
      return null;
    }
    const savedMap = getSavedFormSpecMap();
    if (savedMap.has(formName)) {
      return savedMap.get(formName);
    }
    for (const item of items) {
      const rawSpec = parseJsonValue(item?.formSpec);
      const spec = rawSpec && typeof rawSpec === "object" ? rawSpec : null;
      if (Array.isArray(spec?.fields) && spec.fields.length > 0) {
        return spec;
      }
    }
    return null;
  }

  function formatDateTime(value) {
    if (!value) {
      return "-";
    }
    try {
      return new Date(value).toLocaleString("ja-JP");
    } catch (error) {
      return String(value);
    }
  }

  function formatJson(value) {
    if (value === null || value === undefined) {
      return "-";
    }
    if (typeof value === "string") {
      return value;
    }
    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  }

  const numericFieldTypes = new Set(["number", "currency", "numberRange"]);

  function normalizeXAxisValue(item, fieldKey) {
    if (fieldKey === "__createdAt") {
      return (item.createdAt || "").split("T")[0] || "unknown";
    }
    let rawValue = item.data?.[fieldKey];
    if (Array.isArray(rawValue)) {
      rawValue = rawValue.join(", ");
    }
    if (rawValue instanceof Date) {
      return rawValue.toISOString().split("T")[0];
    }
    if (typeof rawValue === "string") {
      const trimmed = rawValue.trim();
      if (trimmed.includes("T")) {
        return trimmed.split("T")[0] || "未設定";
      }
      if (trimmed.includes(" ")) {
        return trimmed.split(" ")[0] || "未設定";
      }
      if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
        return trimmed.slice(0, 10);
      }
      if (/^\d{4}\/\d{2}\/\d{2}/.test(trimmed)) {
        return trimmed.slice(0, 10);
      }
    }
    return rawValue === null || rawValue === undefined || rawValue === ""
      ? "未設定"
      : String(rawValue);
  }

  function normalizeMetricValue(item, fieldKey) {
    if (fieldKey === "__count") {
      return 1;
    }
    const raw = item.data?.[fieldKey];
    const value = Number(raw);
    return Number.isFinite(value) ? value : 0;
  }

  function aggregateByField(items, xField, metricField) {
    const map = new Map();
    items.forEach((item) => {
      const key = normalizeXAxisValue(item, xField);
      const value = normalizeMetricValue(item, metricField);
      map.set(key, (map.get(key) || 0) + value);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }

  function inferDateFormat(label) {
    const normalized = normalizeDateLabelString(label);
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      return { type: "day", sep: "-", hasYear: true };
    }
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(normalized)) {
      return { type: "day", sep: "/", hasYear: true };
    }
    if (/^\d{1,2}\/\d{1,2}$/.test(normalized)) {
      return { type: "day", sep: "/", hasYear: false };
    }
    if (/^\d{4}-\d{2}$/.test(normalized)) {
      return { type: "month", sep: "-", hasYear: true };
    }
    if (/^\d{4}\/\d{2}$/.test(normalized)) {
      return { type: "month", sep: "/", hasYear: true };
    }
    return null;
  }

  function formatDateLabel(date, format) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    if (format.type === "month") {
      return `${year}${format.sep}${month}`;
    }
    if (format.hasYear) {
      return `${year}${format.sep}${month}${format.sep}${day}`;
    }
    return `${Number(month)}${format.sep}${Number(day)}`;
  }

  function parseDateFromLabel(label) {
    const normalized = normalizeDateLabelString(label);
    const ymd = normalized.match(/(\d{4})([\/-])(\d{1,2})\2(\d{1,2})/);
    if (ymd) {
      const year = Number(ymd[1]);
      const month = Number(ymd[3]) - 1;
      const day = Number(ymd[4]);
      return {
        date: new Date(year, month, day),
        format: { type: "day", sep: ymd[2], hasYear: true },
      };
    }
    const ym = normalized.match(/(\d{4})([\/-])(\d{1,2})/);
    if (ym) {
      const year = Number(ym[1]);
      const month = Number(ym[3]) - 1;
      return {
        date: new Date(year, month, 1),
        format: { type: "month", sep: ym[2], hasYear: true },
      };
    }
    const md = normalized.match(/(\d{1,2})[\/-](\d{1,2})/);
    if (md) {
      const year = new Date().getFullYear();
      const month = Number(md[1]) - 1;
      const day = Number(md[2]);
      return {
        date: new Date(year, month, day),
        format: { type: "day", sep: "/", hasYear: false },
      };
    }
    return null;
  }

  function buildForecastLabels(labels, count, unit = "auto") {
    if (labels.length === 0) {
      return Array.from({ length: count }, (_, idx) => `予測${idx + 1}`);
    }
    const lastLabel = normalizeDateLabelString(labels[labels.length - 1]);
    let format = inferDateFormat(lastLabel);
    let baseInfo = null;
    if (!format) {
      baseInfo = parseDateFromLabel(lastLabel);
      format = baseInfo?.format || null;
    }
    if (!format) {
      return Array.from({ length: count }, (_, idx) => `予測${idx + 1}`);
    }
    let base;
    if (baseInfo?.date) {
      base = baseInfo.date;
    } else {
      const parts = lastLabel.split(format.sep).map((part) => Number(part));
      const nowYear = new Date().getFullYear();
      const year = format.hasYear ? parts[0] || nowYear : nowYear;
      const month = format.hasYear ? (parts[1] || 1) - 1 : (parts[0] || 1) - 1;
      const day =
        format.type === "day"
          ? format.hasYear
            ? parts[2] || 1
            : parts[1] || 1
          : 1;
      base = new Date(year, month, day);
    }
    const nextLabels = [];
    for (let i = 1; i <= count; i += 1) {
      const next = new Date(base);
      const stepUnit = unit === "auto" ? format.type : unit;
      if (stepUnit === "month") {
        next.setMonth(base.getMonth() + i);
      } else {
        next.setDate(base.getDate() + i);
      }
      nextLabels.push(formatDateLabel(next, format));
    }
    return nextLabels;
  }

  function getLastLabelDate(labels) {
    if (labels.length === 0) {
      return null;
    }
    const lastLabel = labels[labels.length - 1];
    const parsed = parseDateFromLabel(lastLabel);
    if (parsed) {
      return parsed;
    }
    const format = inferDateFormat(lastLabel);
    if (!format) {
      return null;
    }
    const parts = lastLabel.split(format.sep).map((part) => Number(part));
    const nowYear = new Date().getFullYear();
    const year = format.hasYear ? parts[0] || nowYear : nowYear;
    const month = format.hasYear ? (parts[1] || 1) - 1 : (parts[0] || 1) - 1;
    const day =
      format.type === "day"
        ? format.hasYear
          ? parts[2] || 1
          : parts[1] || 1
        : 1;
    return { date: new Date(year, month, day), format };
  }

  function buildForecastValues(values, count) {
    if (values.length === 0) {
      return Array.from({ length: count }, () => 0);
    }
    if (values.length === 1) {
      return Array.from({ length: count }, () => values[0]);
    }
    const n = values.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    values.forEach((value, index) => {
      sumX += index;
      sumY += value;
      sumXY += index * value;
      sumXX += index * index;
    });
    const denominator = n * sumXX - sumX * sumX;
    const slope =
      denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
    const intercept = n === 0 ? 0 : (sumY - slope * sumX) / n;
    return Array.from({ length: count }, (_, idx) => {
      const x = n + idx;
      const forecast = slope * x + intercept;
      return Math.max(0, Math.round(forecast));
    });
  }

  async function fetchForecastValues(
    values,
    count,
    labels,
    unit,
    expectedLabels
  ) {
    const model = window.APP_CONFIG?.model || "gpt-4o-mini";
    const systemPrompt = [
      "あなたは時系列の予測アシスタントです。",
      "次のJSONだけを返してください。",
      '{ "forecastLabels": string[], "forecastValues": number[] }',
      "forecastValues の長さは指定された steps と同じにする。",
      "forecastLabels は providedForecastLabels と完全一致させる。",
      "出力はJSONのみ。",
    ].join(" ");
    const userPrompt = [
      "steps:",
      String(count),
      "unit:",
      unit,
      "lastLabel:",
      labels[labels.length - 1] || "",
      "providedForecastLabels:",
      JSON.stringify(expectedLabels || []),
      "values:",
      JSON.stringify(values),
    ].join("\n");
    const response = await fetch("/api/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    const content =
      data?.choices?.[0]?.message?.content ?? data?.output_text ?? "";
    let parsed = null;
    if (typeof content === "string") {
      try {
        parsed = JSON.parse(content);
      } catch (error) {
        parsed = extractJsonFromText(content);
      }
    }
    console.log("forecast_raw_response", parsed);
    const forecastLabels = Array.isArray(parsed?.forecastLabels)
      ? parsed.forecastLabels.map((label) => String(label))
      : [];
    const forecastValues = Array.isArray(parsed?.forecastValues)
      ? parsed.forecastValues.map((value) => Number(value))
      : [];
    if (forecastValues.length !== count) {
      throw new Error("forecast length mismatch");
    }
    if (
      expectedLabels?.length === count &&
      JSON.stringify(forecastLabels) !== JSON.stringify(expectedLabels)
    ) {
      throw new Error("forecast labels mismatch");
    }
    return {
      labels: forecastLabels,
      values: forecastValues.map((value) =>
        Number.isFinite(value) ? value : 0
      ),
    };
  }

  function applyForecastToChart(
    labels,
    values,
    count,
    forecastLabels,
    forecastValues
  ) {
    if (!chartInstance) {
      return;
    }
    const baseData = values.concat(Array(count).fill(null));
    chartInstance.data.labels = labels.concat(forecastLabels);
    chartInstance.data.datasets[0].data = baseData;
    chartInstance.data.datasets = [
      chartInstance.data.datasets[0],
      {
        label: "予想",
        data: Array(values.length).fill(null).concat(forecastValues),
        borderColor: "rgba(14, 165, 233, 0.9)",
        backgroundColor: "rgba(14, 165, 233, 0.2)",
        borderDash: [6, 4],
        borderWidth: 2,
        type: "line",
        tension: 0.35,
        pointRadius: 3,
      },
    ];
    chartInstance.update();
  }

  function renderChart(items) {
    if (!reportChartCanvas) {
      return;
    }
    const xField = reportColumnSelect?.value || "__createdAt";
    const metricField = reportMetricSelect?.value || "__count";
    const grouped = aggregateByField(items, xField, metricField);
    let labels = grouped.map(([label]) => label);
    let values = grouped.map(([, count]) => count);

    reportDebug("render_chart", {
      items: items.length,
      xField,
      metricField,
      labels,
      values,
    });

    const metricLabel =
      metricField === "__count"
        ? "件数"
        : reportMetricSelect?.selectedOptions?.[0]?.textContent || "合計";

    const chartType = reportChartType?.value || "bar";
    if (chartInstance) {
      chartInstance.destroy();
    }

    const palette = [
      "#4F46E5",
      "#06B6D4",
      "#10B981",
      "#F59E0B",
      "#EF4444",
      "#8B5CF6",
      "#EC4899",
      "#22C55E",
      "#F97316",
      "#0EA5E9",
    ];
    const backgroundColors =
      chartType === "pie"
        ? labels.map((_, idx) => palette[idx % palette.length])
        : "rgba(79, 70, 229, 0.6)";
    const borderColors =
      chartType === "pie"
        ? labels.map((_, idx) => palette[idx % palette.length])
        : "rgba(79, 70, 229, 1)";

    const datasets = [
      {
        label: metricLabel,
        data: values,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1,
      },
    ];

    chartInstance = new Chart(reportChartCanvas, {
      type: chartType,
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: chartType === "pie",
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
          },
        },
      },
    });

    if (forecastEnabled && chartType !== "pie" && labels.length >= 1) {
      let forecastCount = Math.max(1, forecastSteps || 3);
      if (forecastEndMonth) {
        const lastInfo = getLastLabelDate(labels);
        if (lastInfo) {
          const lastMonth = lastInfo.date.getMonth() + 1;
          const lastYear = lastInfo.date.getFullYear();
          let targetYear = lastYear;
          if (forecastEndMonth < lastMonth) {
            targetYear += 1;
          }
          const monthsDiff =
            (targetYear - lastYear) * 12 + (forecastEndMonth - lastMonth);
          forecastCount = Math.max(1, monthsDiff);
          forecastUnit = "month";
        } else {
          forecastUnit = "month";
        }
      }
      const requestId = ++forecastRequestId;
      const fallbackLabels = buildForecastLabels(
        labels,
        forecastCount,
        forecastUnit
      );
      fetchForecastValues(
        values,
        forecastCount,
        labels,
        forecastUnit,
        fallbackLabels
      )
        .then((forecast) => {
          if (requestId !== forecastRequestId) {
            return;
          }
          applyForecastToChart(
            labels,
            values,
            forecastCount,
            fallbackLabels,
            forecast.values
          );
        })
        .catch(() => {
          if (requestId !== forecastRequestId) {
            return;
          }
          const fallback = buildForecastValues(values, forecastCount);
          applyForecastToChart(
            labels,
            values,
            forecastCount,
            fallbackLabels,
            fallback
          );
        });
    }
  }

  function renderSheet(items) {
    if (!reportSheet) {
      return;
    }
    reportSheet.innerHTML = "";
    if (sheetInstance?.destroy) {
      sheetInstance.destroy();
    }

    if (items.length === 0) {
      reportSheet.textContent = "データがありません";
      return;
    }

    const { headers, rows } = buildExportRows(items);
    if (headers.length === 0) {
      reportSheet.textContent = "データがありません";
      return;
    }

    const spreadsheetFactory =
      window.jspreadsheet?.default || window.jspreadsheet || null;
    if (!spreadsheetFactory) {
      reportSheet.textContent =
        "表を表示するライブラリが読み込めませんでした。通信を確認して再読み込みしてください。";
      return;
    }

    const columns = headers.map((title) => ({ title, type: "text" }));
    const minDimensions = [headers.length, Math.max(rows.length, 1)];
    const worksheetConfig = {
      data: rows,
      columns,
      columnSorting: true,
      minDimensions,
    };
    try {
      sheetInstance = spreadsheetFactory(reportSheet, {
        worksheets: [worksheetConfig],
      });
    } catch (error) {
      try {
        sheetInstance = spreadsheetFactory(reportSheet, worksheetConfig);
      } catch (innerError) {
        reportSheet.textContent =
          "表の初期化に失敗しました。再読み込みをお試しください。";
        console.error(innerError);
      }
    }
  }

  function renderReport() {
    forecastEnabled = false;
    forecastSteps = 0;
    forecastUnit = "auto";
    forecastEndMonth = null;
    const selected = formSelect?.value || "";
    let filtered = selected
      ? allSubmissions.filter((item) => getFormName(item) === selected)
      : [];
    if (selected && filtered.length === 0) {
      const savedMap = getSavedFormSpecMap();
      const spec = savedMap.get(selected);
      if (spec) {
        const samples = buildSampleEntries(spec, 5);
        if (samples.length > 0) {
          appendLocalSubmissions(samples);
          allSubmissions = allSubmissions.concat(samples);
          filtered = samples;
        }
      }
    }
    currentReportItems = filtered;
    if (promptApplied) {
      renderChart(filtered);
      if (reportChartCard) {
        reportChartCard.classList.remove("is-hidden");
      }
      renderSheet(filtered);
      if (reportDataCard) {
        reportDataCard.classList.remove("is-hidden");
      }
    } else {
      if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
      }
      if (reportChartCard) {
        reportChartCard.classList.add("is-hidden");
      }
      if (reportDataCard) {
        reportDataCard.classList.add("is-hidden");
      }
    }
  }

  function buildExportRows(items) {
    const selectedFormName = formSelect?.value || getFormName(items[0]) || "";
    const resolvedSpec = getResolvedFormSpec(selectedFormName, items);
    if (resolvedSpec?.fields?.length) {
      const fieldIds = resolvedSpec.fields.map((field) => field.id);
      const headers = resolvedSpec.fields.map(
        (field) => field.label || field.id
      );
      const rows = items.map((item) =>
        fieldIds.map((fieldId) => formatJson(item.data?.[fieldId]))
      );
      return { headers, rows };
    }

    const fieldMap = new Map();
    items.forEach((item) => {
      const fields = item.formSpec?.fields || [];
      fields.forEach((field) => {
        fieldMap.set(field.id, field.label || field.id);
      });
    });
    const fieldIds = Array.from(fieldMap.keys());
    const headers = fieldIds.map((id) => fieldMap.get(id) || id);
    const rows = items.map((item) =>
      fieldIds.map((fieldId) => formatJson(item.data?.[fieldId]))
    );
    return { headers, rows };
  }

  function exportReportToExcel() {
    if (!reportSheet) {
      return;
    }
    if (typeof XLSX === "undefined") {
      alert("Excel出力ライブラリが読み込まれていません。");
      return;
    }
    const { headers, rows } = buildExportRows(currentReportItems);
    if (headers.length === 0) {
      alert("出力するデータがありません。");
      return;
    }
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    const formName = formSelect?.value || "report";
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `${formName}_${date}.xlsx`);
  }

  function renderFormOptions() {
    if (!formSelect) {
      return;
    }
    const submissionNames = allSubmissions
      .map((item) => getFormName(item))
      .filter(Boolean);
    const savedNames = Array.from(getSavedFormSpecMap().keys()).filter(Boolean);
    const uniqueNames = Array.from(
      new Set([...submissionNames, ...savedNames])
    );
    formSelect.innerHTML = "";
    if (uniqueNames.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "フォームがありません";
      formSelect.appendChild(option);
      renderTableList([], []);
      return;
    }
    uniqueNames.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      formSelect.appendChild(option);
    });
    formSelect.value = uniqueNames[0];
    formSelect.dispatchEvent(new Event("change", { bubbles: true }));
    renderTableList(uniqueNames, submissionNames);
  }

  function renderTableList(formNames, submissionNames) {
    if (!reportTableList) {
      return;
    }
    reportTableList.innerHTML = "";
    if (!Array.isArray(formNames) || formNames.length === 0) {
      const empty = document.createElement("div");
      empty.className = "text-muted small";
      empty.textContent = "参照できるテーブルがありません。";
      reportTableList.appendChild(empty);
      return;
    }
    const countMap = new Map();
    submissionNames.forEach((name) => {
      countMap.set(name, (countMap.get(name) || 0) + 1);
    });
    formNames.forEach((name) => {
      const chip = document.createElement("div");
      chip.className = "report-table-chip";
      chip.textContent = name;
      const count = countMap.get(name);
      if (count) {
        const countNode = document.createElement("span");
        countNode.className = "report-table-chip__count";
        countNode.textContent = `(${count})`;
        chip.appendChild(countNode);
      }
      reportTableList.appendChild(chip);
    });
  }

  function renderColumnOptions() {
    if (!reportColumnSelect) {
      return;
    }
    const selected = formSelect?.value || "";
    const filtered = selected
      ? allSubmissions.filter((item) => getFormName(item) === selected)
      : [];
    const resolvedSpec = getResolvedFormSpec(selected, filtered);
    const fields = resolvedSpec?.fields || filtered[0]?.formSpec?.fields || [];
    const currentValue = reportColumnSelect.value || "";
    reportColumnSelect.innerHTML = "";

    const dateOption = document.createElement("option");
    dateOption.value = "__createdAt";
    dateOption.textContent = "送信日";
    reportColumnSelect.appendChild(dateOption);

    fields.forEach((field) => {
      const option = document.createElement("option");
      option.value = field.id;
      option.textContent = field.label || field.id;
      reportColumnSelect.appendChild(option);
    });
    const hasCurrentValue = Array.from(reportColumnSelect.options).some(
      (option) => option.value === currentValue
    );
    reportColumnSelect.value = hasCurrentValue ? currentValue : "__createdAt";
    reportColumnSelect.dispatchEvent(new Event("change", { bubbles: true }));
    reportDebug("render_columns", {
      selected,
      fields: fields.map((field) => ({
        id: field.id,
        label: field.label || field.id,
        type: field.type,
      })),
    });
  }

  function renderMetricOptions() {
    if (!reportMetricSelect) {
      return;
    }
    const selected = formSelect?.value || "";
    const filtered = selected
      ? allSubmissions.filter((item) => getFormName(item) === selected)
      : [];
    const resolvedSpec = getResolvedFormSpec(selected, filtered);
    const fields = resolvedSpec?.fields || filtered[0]?.formSpec?.fields || [];
    const numericFields = fields.filter((field) =>
      numericFieldTypes.has(field.type)
    );
    const currentValue = reportMetricSelect.value || "";
    reportMetricSelect.innerHTML = "";

    const countOption = document.createElement("option");
    countOption.value = "__count";
    countOption.textContent = "指定なし";
    reportMetricSelect.appendChild(countOption);

    numericFields.forEach((field) => {
      const option = document.createElement("option");
      option.value = field.id;
      option.textContent = field.label || field.id;
      reportMetricSelect.appendChild(option);
    });
    reportMetricSelect.disabled = false;
    const hasCurrentValue = Array.from(reportMetricSelect.options).some(
      (option) => option.value === currentValue
    );
    reportMetricSelect.value = hasCurrentValue
      ? currentValue
      : numericFields.length > 0
      ? numericFields[0].id
      : "__count";
    reportMetricSelect.dispatchEvent(new Event("change", { bubbles: true }));
    reportDebug("render_metrics", {
      selected,
      fields: numericFields.map((field) => ({
        id: field.id,
        label: field.label || field.id,
        type: field.type,
      })),
    });
  }

  const localSubmissionsKey = "a2ui:submissions";
  const savedFormKey = "a2uiform_saved";

  function readLocalSubmissions() {
    if (typeof localStorage === "undefined") {
      return [];
    }
    try {
      const raw = localStorage.getItem(localSubmissionsKey);
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function appendLocalSubmissions(entries) {
    if (!Array.isArray(entries) || entries.length === 0) {
      return;
    }
    if (typeof localStorage === "undefined") {
      return;
    }
    try {
      const raw = localStorage.getItem(localSubmissionsKey);
      const parsed = JSON.parse(raw || "[]");
      const items = Array.isArray(parsed) ? parsed : [];
      items.unshift(...entries);
      localStorage.setItem(localSubmissionsKey, JSON.stringify(items));
    } catch (error) {
      // ignore storage errors
    }
  }

  function readSavedForms() {
    if (typeof localStorage === "undefined") {
      return [];
    }
    try {
      const raw = localStorage.getItem(savedFormKey);
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function buildMockValue(field, index) {
    const seq = index + 1;
    switch (field.type) {
      case "number":
        return 10 * seq;
      case "currency":
        return 1000 * seq;
      case "numberRange":
        return 5 * seq;
      case "date":
        return `2024-01-${String(seq).padStart(2, "0")}`;
      case "dateTime":
        return `2024-01-${String(seq).padStart(2, "0")}T10:00`;
      case "time":
        return `${String((seq % 12) + 1).padStart(2, "0")}:00`;
      case "email":
        return `user${seq}@example.com`;
      case "tel":
        return `090-0000-00${String(seq).padStart(2, "0")}`;
      case "url":
        return `https://example.com/item-${seq}`;
      case "password":
        return `password${seq}`;
      case "select":
      case "radio":
        return field.options?.[seq % (field.options?.length || 1)] || "選択肢1";
      case "multiselect": {
        const options = field.options || ["選択肢1", "選択肢2"];
        return options.slice(0, Math.min(2, options.length));
      }
      case "checkbox":
      case "switch":
        return seq % 2 === 0;
      case "file":
        return [
          {
            name: `sample-${seq}.pdf`,
            size: 1024 * seq,
            type: "application/pdf",
          },
        ];
      default:
        return `${field.label || "項目"} ${seq}`;
    }
  }

  function buildSampleSubmissionData(formSpec, count = 5, startIndex = 0) {
    const items = [];
    for (let i = 0; i < count; i += 1) {
      const item = {};
      formSpec.fields.forEach((field) => {
        item[field.id] = buildMockValue(field, i + startIndex);
      });
      items.push(item);
    }
    return items;
  }

  function buildSampleEntries(formSpec, count = 5) {
    if (!formSpec?.title || !Array.isArray(formSpec.fields)) {
      return [];
    }
    return buildSampleSubmissionData(formSpec, count).map((sample) => ({
      id: `sample_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      formName: formSpec.title,
      formSpec,
      data: sample,
    }));
  }

  function flattenSubmissions(items) {
    const normalized = items
      .map((item) => normalizeSubmission(item))
      .filter(Boolean);
    const flattened = [];
    normalized.forEach((entry) => {
      if (Array.isArray(entry.items)) {
        entry.items.forEach((item) => flattened.push(item));
        return;
      }
      flattened.push(entry);
    });
    return flattened;
  }

  function mergeSubmissions(primary, secondary) {
    const seen = new Set();
    const merged = [];
    const pushUnique = (item) => {
      const key = item?.id ? String(item.id) : JSON.stringify(item);
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      merged.push(item);
    };
    primary.forEach(pushUnique);
    secondary.forEach(pushUnique);
    return merged;
  }

  async function loadSubmissions() {
    if (submissionsLoading) {
      return submissionsLoading;
    }
    const task = (async () => {
      const localItems = flattenSubmissions(readLocalSubmissions());
      try {
        const response = await fetch(`${apiBaseUrl}/api/submissions`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        const rawItems = Array.isArray(data.items) ? data.items : [];
        const remoteItems = flattenSubmissions(rawItems);
        allSubmissions = mergeSubmissions(remoteItems, localItems);
      } catch (error) {
        console.error("report_load_failed", error);
        allSubmissions = localItems;
      }
      if (allSubmissions.length === 0) {
        const savedForms = readSavedForms();
        const samples = savedForms.flatMap((entry) =>
          buildSampleEntries(entry?.formSpec)
        );
        if (samples.length > 0) {
          appendLocalSubmissions(samples);
          allSubmissions = samples;
        }
      }
      renderFormOptions();
      renderColumnOptions();
      renderMetricOptions();
      renderReport();
    })();
    submissionsLoading = task;
    try {
      await task;
    } finally {
      submissionsLoading = null;
    }
  }

  function handleFormChange() {
    renderColumnOptions();
    renderMetricOptions();
    renderReport();
  }

  function bindEvents() {
    bindEventOnce(formSelect, "change", handleFormChange);
    bindEventOnce(reportColumnSelect, "change", renderReport);
    bindEventOnce(reportMetricSelect, "change", renderReport);
    bindEventOnce(reportChartType, "change", renderReport);
    if (exportExcel) {
      bindEventOnce(exportExcel, "click", exportReportToExcel);
    }
    bindEventOnce(refreshReport, "click", loadSubmissions);
    bindEventOnce(reportPromptButton, "click", handlePromptAction);
    bindEventOnce(reportPromptInput, "keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handlePromptAction();
      }
    });
    bindEventOnce(document, "click", handleDelegatedClick, { capture: true });
    if (refreshReportTable) {
      bindEventOnce(refreshReportTable, "click", loadSubmissions);
    }
    if (reportChartMaximize) {
      bindEventOnce(reportChartMaximize, "click", () =>
        toggleCardMaximize(reportChartCard, reportChartMaximize)
      );
    }
    if (reportTableMaximize) {
      bindEventOnce(reportTableMaximize, "click", () =>
        toggleCardMaximize(reportDataCard, reportTableMaximize)
      );
    }
    if (reportChartReset) {
      bindEventOnce(reportChartReset, "click", () =>
        resetCardPosition(reportChartCard, reportChartMaximize)
      );
    }
    if (reportTableReset) {
      bindEventOnce(reportTableReset, "click", () =>
        resetCardPosition(reportDataCard, reportTableMaximize)
      );
    }
  }

  function initReport() {
    bindElements();
    if (!reportChartCanvas) {
      return;
    }
    bindEvents();
    if (!delegateBound) {
      bindEventOnce(document, "change", handleDelegatedChange);
      bindEventOnce(document, "click", handleDelegatedClick);
      delegateBound = true;
    }
    ensurePromptElements();
    if (reportCauseResult) {
      reportCauseResult.textContent = "";
    }
    setCauseCardVisible(false);
    loadSubmissions();
    if (reportDataCard) {
      reportDataCard.classList.add("is-hidden");
    }
    setupDraggableCard(reportChartCard);
    setupDraggableCard(reportDataCard);
    setMaximizeButtonState(reportChartMaximize, false);
    setMaximizeButtonState(reportTableMaximize, false);
    resetCardPosition(reportChartCard);
    resetCardPosition(reportDataCard);
    window.addEventListener("resize", refreshMaximizedBounds);
  }

  window.A2UI_REPORT = window.A2UI_REPORT || {};
  window.A2UI_REPORT.init = initReport;

  initReport();
})();

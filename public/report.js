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
  let reportTableList = null;
  let reportDataCard = null;
  let promptApplied = false;
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

  function bindEventOnce(element, event, handler) {
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
    element.addEventListener(event, handler);
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

  function handleDelegatedClick(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
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
      handlePromptGenerate();
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
    const columnOptions = getSelectOptions(reportColumnSelect);
    const metricOptions = getSelectOptions(reportMetricSelect);

    const formValue =
      resolveOptionValue(parsed?.form, formOptions) ||
      findBestOption(prompt, formOptions);
    if (formValue) {
      setSelectValue(formSelect, formValue);
    }

    renderColumnOptions();
    renderMetricOptions();

    const columnValue =
      resolveOptionValue(parsed?.column, columnOptions) ||
      resolveColumnFromPrompt(prompt, getSelectOptions(reportColumnSelect));
    const metricValue =
      resolveOptionValue(parsed?.metric, metricOptions) ||
      resolveMetricFromPrompt(prompt, getSelectOptions(reportMetricSelect));
    const chartTypeValue =
      parsed?.chartType || resolveChartTypeFromPrompt(prompt);

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
    if (reportPromptResult) {
      reportPromptResult.textContent = buildPromptResultText();
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
      '{ "form": string, "column": string, "metric": string, "chartType": "bar|line|pie" }',
      "form/column/metric は候補の value または label から最も近いものを選ぶ。",
      "候補に該当がない場合は空文字にする。",
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
    } catch (error) {
      handlePromptGenerateLocal(prompt);
      if (reportPromptResult) {
        reportPromptResult.textContent = `${buildPromptResultText()} (AI解析に失敗したため簡易解析で設定しました)`;
      }
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

  function renderChart(items) {
    if (!reportChartCanvas) {
      return;
    }
    const xField = reportColumnSelect?.value || "__createdAt";
    const metricField = reportMetricSelect?.value || "__count";
    const grouped = aggregateByField(items, xField, metricField);
    const labels = grouped.map(([label]) => label);
    const values = grouped.map(([, count]) => count);

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

    chartInstance = new Chart(reportChartCanvas, {
      type: chartType,
      data: {
        labels,
        datasets: [
          {
            label: metricLabel,
            data: values,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 1,
          },
        ],
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
    renderChart(filtered);
    if (promptApplied) {
      renderSheet(filtered);
      if (reportDataCard) {
        reportDataCard.classList.remove("is-hidden");
      }
    } else if (reportDataCard) {
      reportDataCard.classList.add("is-hidden");
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
    reportColumnSelect.value = "__createdAt";
    reportColumnSelect.dispatchEvent(new Event("change", { bubbles: true }));
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
    reportMetricSelect.value =
      numericFields.length > 0 ? numericFields[0].id : "__count";
    reportMetricSelect.dispatchEvent(new Event("change", { bubbles: true }));
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
    bindEventOnce(reportPromptButton, "click", handlePromptGenerate);
    bindEventOnce(reportPromptInput, "keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handlePromptGenerate();
      }
    });
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

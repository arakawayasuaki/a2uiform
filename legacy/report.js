(() => {
  const { apiBase } = window.APP_CONFIG || {};
  const isLocalHost = ["localhost", "127.0.0.1"].includes(
    window.location.hostname
  );
  const apiBaseUrl = apiBase || (isLocalHost ? "http://localhost:8787" : "");

  const formSelect = document.getElementById("reportFormSelect");
  const reportColumnSelect = document.getElementById("reportColumnSelect");
  const reportMetricSelect = document.getElementById("reportMetricSelect");
  const reportChartType = document.getElementById("reportChartType");
  const refreshReport = document.getElementById("refreshReport");
  const exportExcel = document.getElementById("exportExcel");
  const reportSheet = document.getElementById("reportSheet");
  const reportChartCanvas = document.getElementById("reportChart");

  let allSubmissions = [];
  let chartInstance = null;
  let currentReportItems = [];
  let sheetInstance = null;

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
    const filtered = selected
      ? allSubmissions.filter((item) => getFormName(item) === selected)
      : [];
    currentReportItems = filtered;
    renderChart(filtered);
    renderSheet(filtered);
  }

  function buildExportRows(items) {
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
    const uniqueNames = Array.from(
      new Set(allSubmissions.map((item) => getFormName(item)).filter(Boolean))
    );
    formSelect.innerHTML = "";
    if (uniqueNames.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "フォームがありません";
      formSelect.appendChild(option);
      return;
    }
    uniqueNames.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      formSelect.appendChild(option);
    });
    formSelect.value = uniqueNames[0];
  }

  function renderColumnOptions() {
    if (!reportColumnSelect) {
      return;
    }
    const selected = formSelect?.value || "";
    const filtered = selected
      ? allSubmissions.filter((item) => getFormName(item) === selected)
      : [];
    const fields = filtered[0]?.formSpec?.fields || [];
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
  }

  function renderMetricOptions() {
    if (!reportMetricSelect) {
      return;
    }
    const selected = formSelect?.value || "";
    const filtered = selected
      ? allSubmissions.filter((item) => getFormName(item) === selected)
      : [];
    const fields = filtered[0]?.formSpec?.fields || [];
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
  }

  const localSubmissionsKey = "a2ui:submissions";

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

  async function loadSubmissions() {
    try {
      const response = await fetch(`${apiBaseUrl}/api/submissions`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const rawItems = Array.isArray(data.items) ? data.items : [];
      const normalized = rawItems
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
      allSubmissions = flattened;
      renderFormOptions();
      renderColumnOptions();
      renderMetricOptions();
      renderReport();
    } catch (error) {
      console.error("report_load_failed", error);
      const fallback = readLocalSubmissions();
      const normalized = fallback
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
      allSubmissions = flattened;
      renderFormOptions();
      renderColumnOptions();
      renderMetricOptions();
      renderReport();
    }
  }

  if (formSelect) {
    formSelect.addEventListener("change", () => {
      renderColumnOptions();
      renderMetricOptions();
      renderReport();
    });
  }
  if (reportColumnSelect) {
    reportColumnSelect.addEventListener("change", renderReport);
  }
  if (reportMetricSelect) {
    reportMetricSelect.addEventListener("change", renderReport);
  }
  if (reportChartType) {
    reportChartType.addEventListener("change", renderReport);
  }
  if (exportExcel) {
    exportExcel.addEventListener("click", exportReportToExcel);
  }
  if (refreshReport) {
    refreshReport.addEventListener("click", loadSubmissions);
  }

  loadSubmissions();
})();

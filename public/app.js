if (window.__A2UI_APP_INITIALIZED__) {
  window.A2UI_APP?.init?.();
  console.warn("A2UI app already initialized.");
} else {
  window.__A2UI_APP_INITIALIZED__ = true;

  let promptInput = null;
  let generateButton = null;
  let formSurface = null;
  let formSpinner = null;
  let searchResults = null;
  let searchResultCount = null;
  let searchResultSheet = null;
  let newFormButton = null;
  let saveOverwriteButton = null;
  let deleteFormButton = null;
  let saveAsButton = null;
  let saveNewButton = null;
  let savedFormList = null;
  let savedFormCount = null;
  let submissionCount = null;
  let submissionSearch = null;
  let submissionSheet = null;
  let refreshSubmissions = null;
  let fontSelect = null;
  let propertyPanel = null;
  let sidebarLinks = [];
  const boundHandlers = new WeakMap();
  const { apiUrl, apiBase, model } = window.APP_CONFIG || {};
  const apiUrlInput = { value: apiUrl || "http://localhost:8787/api/openai" };
  const apiBaseUrl = apiBase || "";
  const localSubmissionsKey = "a2ui:submissions";
  let submissionSheetInstance = null;
  let searchSheetInstance = null;
  const componentNodes = new Map();
  let selectedComponentId = null;
  let suppressButtonSubmit = false;

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
    promptInput = document.getElementById("promptInput");
    generateButton = document.getElementById("generateButton");
    formSurface = document.getElementById("formSurface");
    formSpinner = document.getElementById("formSpinner");
    searchResults = document.getElementById("searchResults");
    searchResultCount = document.getElementById("searchResultCount");
    searchResultSheet = document.getElementById("searchResultSheet");
    newFormButton = document.getElementById("newFormButton");
    saveOverwriteButton = document.getElementById("saveOverwriteButton");
    deleteFormButton = document.getElementById("deleteFormButton");
    saveAsButton = document.getElementById("saveAsButton");
    saveNewButton = document.getElementById("saveNewButton");
    savedFormList = document.getElementById("savedFormList");
    savedFormCount = document.getElementById("savedFormCount");
    submissionCount = document.getElementById("submissionCount");
    submissionSearch = document.getElementById("submissionSearch");
    submissionSheet = document.getElementById("submissionSheet");
    refreshSubmissions = document.getElementById("refreshSubmissions");
    fontSelect = document.getElementById("fontSelect");
    propertyPanel = document.getElementById("propertyPanel");
    sidebarLinks = document.querySelectorAll(".app-sidebar .nav-link");
  }

  function readLocalSubmissions() {
    if (typeof localStorage === "undefined") {
      return [];
    }
    if (!currentFormSpec?.title) {
      renderSubmissionRows([]);
      return;
    }
    try {
      const raw = localStorage.getItem(localSubmissionsKey);
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeLocalSubmissions(items) {
    if (typeof localStorage === "undefined") {
      return;
    }
    try {
      localStorage.setItem(localSubmissionsKey, JSON.stringify(items));
    } catch (error) {
      // ignore storage errors (quota or unavailable)
    }
  }

  function removeLocalSubmissionsByIds(idSet) {
    if (!idSet || idSet.size === 0) {
      return;
    }
    const items = readLocalSubmissions().filter(
      (item) => !idSet.has(String(item?.id || ""))
    );
    writeLocalSubmissions(items);
  }

  function appendLocalSubmissions(entries) {
    if (!Array.isArray(entries) || entries.length === 0) {
      return;
    }
    const items = readLocalSubmissions();
    items.unshift(...entries);
    writeLocalSubmissions(items);
  }

  function removeLocalSubmissionsByFormName(formName) {
    if (!formName) {
      return;
    }
    const items = readLocalSubmissions().filter(
      (item) => item.formName !== formName
    );
    writeLocalSubmissions(items);
  }
  const modelInput = { value: model || "gpt-4o-mini" };

  const surfaceState = {
    surfaceId: "form_surface",
    components: new Map(),
    dataModel: {},
  };

  const catalogId = "catalog.standard.v1";

  const presetDefinitions = [
    {
      keywords: ["購入", "発注", "見積", "購買"],
      title: "購入申請フォーム",
      description: "購入する物品の情報と申請理由を入力してください。",
      fields: [
        { id: "requester", label: "申請者名", type: "text" },
        { id: "department", label: "部署", type: "text" },
        { id: "requestDate", label: "申請日", type: "date" },
        { id: "itemName", label: "購入物品名", type: "text" },
        { id: "quantity", label: "数量", type: "number" },
        { id: "unitPrice", label: "単価", type: "number" },
        { id: "vendor", label: "購入先/ベンダー", type: "text" },
        {
          id: "budget",
          label: "予算区分",
          type: "select",
          options: ["設備投資", "消耗品費", "外注費", "その他"],
        },
        { id: "neededBy", label: "希望納期", type: "date" },
        { id: "reason", label: "申請理由", type: "textarea" },
      ],
    },
    {
      keywords: ["経費", "精算", "交通費", "出張"],
      title: "経費精算フォーム",
      description: "立替経費の申請内容を入力してください。",
      fields: [
        { id: "applicant", label: "申請者名", type: "text" },
        { id: "department", label: "部署", type: "text" },
        { id: "requestDate", label: "申請日", type: "date" },
        { id: "paymentDate", label: "支払日", type: "date" },
        { id: "amount", label: "金額", type: "number" },
        {
          id: "category",
          label: "勘定科目",
          type: "select",
          options: ["交通費", "宿泊費", "会議費", "消耗品", "交際費", "その他"],
        },
        { id: "purpose", label: "目的", type: "text" },
        { id: "details", label: "詳細", type: "textarea" },
        {
          id: "receipt",
          label: "領収書添付状況",
          type: "select",
          options: ["添付済み", "未添付"],
        },
      ],
    },
    {
      keywords: ["問い合わせ", "コンタクト", "連絡"],
      title: "お問い合わせフォーム",
      description: "お問い合わせ内容を入力してください。",
      fields: [
        { id: "name", label: "お名前", type: "text" },
        { id: "email", label: "メールアドレス", type: "text" },
        { id: "phone", label: "電話番号", type: "text" },
        {
          id: "category",
          label: "お問い合わせ種別",
          type: "select",
          options: ["製品", "請求", "サポート", "その他"],
        },
        { id: "message", label: "お問い合わせ内容", type: "textarea" },
      ],
    },
  ];

  const allowedFieldTypes = new Set([
    "text",
    "number",
    "date",
    "dateTime",
    "time",
    "email",
    "tel",
    "url",
    "password",
    "radio",
    "switch",
    "numberRange",
    "currency",
    "multiselect",
    "textarea",
    "select",
    "file",
    "checkbox",
  ]);

  const optionFieldTypes = new Set(["select", "radio", "multiselect"]);
  const numericFieldTypes = new Set(["number", "currency", "numberRange"]);

  let currentFormSpec = null;
  let isSearchMode = false;
  let mockSearchData = [];
  let loadedFormSpec = null;
  let loadedFormName = "";
  let loadedFormId = null;
  let activeFont = "system";
  const savedFormKey = "a2uiform_saved";
  let dndInitialized = false;
  let dragFieldId = null;

  function detectSearchMode(promptText, formSpec) {
    const text = `${promptText} ${formSpec?.title || ""} ${
      formSpec?.description || ""
    }`.toLowerCase();
    if (
      text.includes("検索") ||
      text.includes("search") ||
      text.includes("フィルタ") ||
      text.includes("絞り込み")
    ) {
      return true;
    }
    return (formSpec?.fields || []).some((field) =>
      (field.label || "").includes("検索")
    );
  }

  function inferTitleFontSize(promptText) {
    if (!promptText) {
      return null;
    }
    const match = promptText.match(/(\d{2})\s*px?/i);
    if (match) {
      return Number(match[1]);
    }
    if (promptText.includes("特大")) {
      return 28;
    }
    if (promptText.includes("大きく") || promptText.includes("大きめ")) {
      return 24;
    }
    if (promptText.includes("小さく") || promptText.includes("小さめ")) {
      return 16;
    }
    return null;
  }

  function applyPromptOverrides(formSpec, promptText) {
    const nextSpec = { ...formSpec };
    const titleSize = promptText?.includes("タイトル")
      ? inferTitleFontSize(promptText)
      : null;
    if (titleSize) {
      nextSpec.titleStyle = {
        ...(formSpec.titleStyle || {}),
        fontSize: titleSize,
      };
    }
    return nextSpec;
  }

  function buildUserPrompt(promptText) {
    if (!loadedFormSpec) {
      return promptText;
    }
    const nameLine = loadedFormName ? `フォーム名: ${loadedFormName}\n` : "";
    const instruction = promptText?.trim()
      ? promptText
      : "このフォームをベースに更新してください。";
    return [
      "以下のフォーム仕様をベースに変更してください。",
      `${nameLine}フォーム仕様(JSON):`,
      JSON.stringify(loadedFormSpec),
      "指示:",
      instruction,
    ].join("\n");
  }

  function initDragAndDrop() {
    if (!formSurface || dndInitialized) {
      return;
    }
    dndInitialized = true;

    formSurface.addEventListener("dragstart", (event) => {
      const target = event.target.closest("[data-field-id]");
      if (!target) {
        return;
      }
      dragFieldId = target.dataset.fieldId;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", dragFieldId);
      target.classList.add("is-dragging");
    });

    formSurface.addEventListener("dragend", (event) => {
      const target = event.target.closest("[data-field-id]");
      if (target) {
        target.classList.remove("is-dragging");
      }
      const highlights = formSurface.querySelectorAll(".is-drop-target");
      highlights.forEach((element) =>
        element.classList.remove("is-drop-target")
      );
      dragFieldId = null;
    });

    formSurface.addEventListener("dragover", (event) => {
      const target = event.target.closest("[data-field-id]");
      if (!target || !dragFieldId) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const highlights = formSurface.querySelectorAll(".is-drop-target");
      highlights.forEach((element) =>
        element.classList.remove("is-drop-target")
      );
      if (target.dataset.fieldId !== dragFieldId) {
        target.classList.add("is-drop-target");
      }
    });

    formSurface.addEventListener("drop", (event) => {
      const target = event.target.closest("[data-field-id]");
      if (!target) {
        return;
      }
      event.preventDefault();
      const fromId = dragFieldId || event.dataTransfer.getData("text/plain");
      const toId = target.dataset.fieldId;
      if (!fromId || !toId || fromId === toId) {
        return;
      }
      reorderFields(fromId, toId);
      const highlights = formSurface.querySelectorAll(".is-drop-target");
      highlights.forEach((element) =>
        element.classList.remove("is-drop-target")
      );
    });
  }

  function reorderFields(fromId, toId) {
    if (!currentFormSpec?.fields) {
      return;
    }
    const fields = [...currentFormSpec.fields];
    const fromIndex = fields.findIndex((field) => field.id === fromId);
    const toIndex = fields.findIndex((field) => field.id === toId);
    if (fromIndex === -1 || toIndex === -1) {
      return;
    }
    const [moved] = fields.splice(fromIndex, 1);
    fields.splice(toIndex, 0, moved);
    currentFormSpec = { ...currentFormSpec, fields };
    const messages = buildA2uiMessages(currentFormSpec);
    renderMessages(messages);
    renderSearchResults([]);
  }

  function loadSavedForms() {
    try {
      return JSON.parse(localStorage.getItem(savedFormKey)) || [];
    } catch (error) {
      return [];
    }
  }

  function persistSavedForms(items) {
    localStorage.setItem(savedFormKey, JSON.stringify(items));
  }

  function renderSavedForms() {
    if (!savedFormList || !savedFormCount) {
      return;
    }
    const items = loadSavedForms();
    savedFormList.innerHTML = "";
    savedFormCount.textContent = `${items.length}件`;

    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "list-group-item text-muted";
      empty.textContent = "保存されたフォームはありません";
      savedFormList.appendChild(empty);
      return;
    }

    items.forEach((item) => {
      const row = document.createElement("div");
      row.className =
        "list-group-item d-flex justify-content-between align-items-center";

      const thumb = document.createElement("button");
      thumb.type = "button";
      thumb.className = "saved-form-thumb text-start";
      thumb.addEventListener("click", () => loadSavedForm(item.id));

      const thumbTitle = document.createElement("div");
      thumbTitle.className = "saved-form-thumb__title";
      thumbTitle.textContent = item.formSpec?.title || "フォーム";
      thumb.appendChild(thumbTitle);

      const fieldWrap = document.createElement("div");
      fieldWrap.className = "saved-form-thumb__fields";
      const fields = item.formSpec?.fields || [];
      const previewFields = fields.slice(0, 6);
      previewFields.forEach((field) => {
        const chip = document.createElement("span");
        chip.className = "saved-form-thumb__chip";
        chip.textContent = field.label || field.id;
        fieldWrap.appendChild(chip);
      });
      if (fields.length > previewFields.length) {
        const more = document.createElement("span");
        more.className = "saved-form-thumb__chip";
        more.textContent = `+${fields.length - previewFields.length}`;
        fieldWrap.appendChild(more);
      }
      thumb.appendChild(fieldWrap);

      const left = document.createElement("div");
      left.className = "d-flex flex-column gap-2";
      left.appendChild(thumb);

      row.appendChild(left);
      savedFormList.appendChild(row);
    });
  }

  function saveCurrentForm(mode) {
    if (!currentFormSpec) {
      alert("保存するフォームがありません。");
      return;
    }

    const items = loadSavedForms();
    const now = new Date();
    const formTitle = currentFormSpec.title || "無題";

    if (mode === "overwrite" && loadedFormId) {
      const index = items.findIndex((item) => item.id === loadedFormId);
      if (index !== -1) {
        items[index] = {
          ...items[index],
          name: formTitle,
          formSpec: currentFormSpec,
          prompt: promptInput.value || items[index].prompt || "",
          updatedAt: now.toLocaleString("ja-JP"),
        };
        persistSavedForms(items);
        renderSavedForms();
        return;
      }
    }

    const entry = {
      id: `form_${Date.now()}`,
      name: formTitle,
      prompt: promptInput.value || "",
      formSpec: currentFormSpec,
      createdAt: now.toLocaleString("ja-JP"),
    };
    items.unshift(entry);
    persistSavedForms(items);
    renderSavedForms();
  }

  function loadSavedForm(id) {
    const items = loadSavedForms();
    const entry = items.find((item) => item.id === id);
    if (!entry) {
      return;
    }
    const name = entry.name || "無題";
    promptInput.value = "";
    currentFormSpec = entry.formSpec;
    loadedFormSpec = entry.formSpec;
    loadedFormName = name;
    loadedFormId = entry.id;
    updateSaveButtons();
    isSearchMode = detectSearchMode(entry.prompt || "", entry.formSpec);
    mockSearchData = isSearchMode ? buildMockSearchData(entry.formSpec) : [];
    const messages = buildA2uiMessages(entry.formSpec);
    renderMessages(messages);
    renderSearchResults([]);
    ensureSampleSubmissions();
    initDragAndDrop();
  }

  function deleteSavedForm(id) {
    const items = loadSavedForms().filter((item) => item.id !== id);
    persistSavedForms(items);
    renderSavedForms();
    if (loadedFormId === id) {
      resetForm();
    }
  }

  async function deleteSubmissionsForForm(formName) {
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/submissions?formName=${encodeURIComponent(
          formName
        )}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      await response.json();
      loadSubmissions();
    } catch (error) {
      console.error("delete_submissions_failed", error);
      removeLocalSubmissionsByFormName(formName);
      loadSubmissions();
    }
  }

  function cleanupUnsavedFormData() {
    if (!loadedFormId && currentFormSpec?.title) {
      deleteSubmissionsForForm(currentFormSpec.title);
    }
  }

  function updateSaveButtons() {
    const hasLoaded = Boolean(loadedFormId);
    if (saveNewButton) {
      saveNewButton.classList.toggle("d-none", hasLoaded);
    }
    if (saveOverwriteButton) {
      saveOverwriteButton.classList.toggle("d-none", !hasLoaded);
    }
    if (saveAsButton) {
      saveAsButton.classList.toggle("d-none", !hasLoaded);
    }
    if (deleteFormButton) {
      deleteFormButton.disabled = !hasLoaded;
      deleteFormButton.classList.toggle("d-none", !hasLoaded);
    }
  }

  function resetForm() {
    cleanupUnsavedFormData();
    promptInput.value = "";
    currentFormSpec = null;
    loadedFormSpec = null;
    loadedFormName = "";
    loadedFormId = null;
    updateSaveButtons();
    isSearchMode = false;
    mockSearchData = [];
    formSurface.innerHTML = "";
    renderSearchResults([]);
    renderSubmissionRows([]);
  }

  function buildMockSearchData(formSpec) {
    const items = [];
    const count = 8;
    for (let i = 0; i < count; i += 1) {
      const item = {};
      formSpec.fields.forEach((field) => {
        item[field.id] = buildMockValue(field, i);
      });
      items.push(item);
    }
    return items;
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

  function buildSampleSubmissionData(formSpec, count = 3, startIndex = 0) {
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

  function buildSampleEntries(count, startIndex) {
    return buildSampleSubmissionData(currentFormSpec, count, startIndex).map(
      (sample) => ({
        id: `sample_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
        formName: currentFormSpec?.title || "",
        formSpec: currentFormSpec,
        data: sample,
      })
    );
  }

  async function ensureSampleSubmissions() {
    if (!currentFormSpec?.title) {
      return;
    }
    const formName = currentFormSpec.title;
    try {
      const targetCount = 10;
      const fetchItems = async () => {
        const response = await fetch(`${apiBaseUrl}/api/submissions`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        const items = Array.isArray(data.items) ? data.items : [];
        return items.filter((item) => item.formName === formName);
      };
      let existing = await fetchItems();
      if (existing.length >= targetCount) {
        return;
      }
      const samples = buildSampleEntries(
        targetCount - existing.length,
        existing.length
      );
      appendLocalSubmissions(samples);
      const response = await fetch(`${apiBaseUrl}/api/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: samples }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const idSet = new Set(samples.map((item) => String(item.id)));
      removeLocalSubmissionsByIds(idSet);
      loadSubmissions();
    } catch (error) {
      console.error("sample_submission_failed", error);
      const targetCount = 10;
      const localItems = readLocalSubmissions().filter(
        (item) => item.formName === formName
      );
      if (localItems.length >= targetCount) {
        return;
      }
      const samples = buildSampleEntries(
        targetCount - localItems.length,
        localItems.length
      );
      appendLocalSubmissions(samples);
      loadSubmissions();
    }
  }

  function renderSearchResults(items) {
    if (!searchResults || !searchResultSheet || !searchResultCount) {
      return;
    }

    if (!isSearchMode) {
      searchResults.classList.add("d-none");
      if (searchSheetInstance?.destroy) {
        searchSheetInstance.destroy();
        searchSheetInstance = null;
      }
      searchResultSheet.textContent = "";
      return;
    }

    searchResults.classList.remove("d-none");
    searchResultCount.textContent = `${items.length}件`;

    if (searchSheetInstance?.destroy) {
      searchSheetInstance.destroy();
      searchSheetInstance = null;
    }
    searchResultSheet.textContent = "";

    const spreadsheetFactory =
      window.jspreadsheet?.default || window.jspreadsheet || null;
    if (!spreadsheetFactory) {
      searchResultSheet.textContent =
        "表を表示するライブラリが読み込めませんでした。";
      return;
    }

    const { headers, rows } = buildSearchSheetData(items);
    if (headers.length === 0) {
      searchResultSheet.textContent = "検索対象がありません";
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
      searchSheetInstance = spreadsheetFactory(searchResultSheet, {
        worksheets: [worksheetConfig],
      });
    } catch (error) {
      try {
        searchSheetInstance = spreadsheetFactory(
          searchResultSheet,
          worksheetConfig
        );
      } catch (innerError) {
        searchResultSheet.textContent = "表の初期化に失敗しました。";
        console.error(innerError);
      }
    }
  }

  function formatResultValue(value) {
    if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === "object") {
        return value.map((file) => file.name).join(", ");
      }
      return value.join(", ");
    }
    if (typeof value === "boolean") {
      return value ? "はい" : "いいえ";
    }
    if (value === null || value === undefined || value === "") {
      return "-";
    }
    return String(value);
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

  function buildSearchSheetData(items) {
    const fields = currentFormSpec?.fields || [];
    const fieldIds = fields.map((field) => field.id);
    const headers = fields.map((field) => field.label || field.id);
    const rows = items.map((item) =>
      fieldIds.map((fieldId) => formatResultValue(item[fieldId]))
    );
    return { headers, rows };
  }

  function matchesSearch(text, keyword) {
    if (!keyword) {
      return true;
    }
    return text.toLowerCase().includes(keyword.toLowerCase());
  }

  function buildSubmissionSheetData(items) {
    const fieldMap = new Map();
    const fields = currentFormSpec?.fields || [];
    if (fields.length > 0) {
      fields.forEach((field) =>
        fieldMap.set(field.id, field.label || field.id)
      );
    } else {
      items.forEach((item) => {
        Object.keys(item.data || {}).forEach((key) => {
          if (!fieldMap.has(key)) {
            fieldMap.set(key, key);
          }
        });
      });
    }
    const fieldIds = Array.from(fieldMap.keys());
    const headers = fieldIds.map((id) => fieldMap.get(id) || id);
    const rows = items.map((item) =>
      fieldIds.map((fieldId) => formatJson(item.data?.[fieldId]))
    );
    return { headers, rows };
  }

  function renderSubmissionRows(items) {
    if (!submissionSheet || !submissionCount) {
      return;
    }
    submissionCount.textContent = `${items.length}件`;

    if (submissionSheetInstance?.destroy) {
      submissionSheetInstance.destroy();
      submissionSheetInstance = null;
    }
    submissionSheet.textContent = "";

    const spreadsheetFactory =
      window.jspreadsheet?.default || window.jspreadsheet || null;
    if (!spreadsheetFactory) {
      submissionSheet.textContent =
        "表を表示するライブラリが読み込めませんでした。";
      return;
    }

    const { headers, rows } = buildSubmissionSheetData(items);
    if (headers.length === 0) {
      submissionSheet.textContent = "送信データがありません";
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
      submissionSheetInstance = spreadsheetFactory(submissionSheet, {
        worksheets: [worksheetConfig],
      });
    } catch (error) {
      try {
        submissionSheetInstance = spreadsheetFactory(
          submissionSheet,
          worksheetConfig
        );
      } catch (innerError) {
        submissionSheet.textContent = "表の初期化に失敗しました。";
        console.error(innerError);
      }
    }
  }

  async function loadSubmissions() {
    if (!submissionSheet) {
      return;
    }
    if (!currentFormSpec?.title) {
      renderSubmissionRows([]);
      return;
    }
    try {
      const response = await fetch(`${apiBaseUrl}/api/submissions`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const items = Array.isArray(data.items) ? data.items : [];
      await syncLocalSubmissions(items);
      const formName = currentFormSpec.title;
      const scopedItems = items.filter((item) => item.formName === formName);
      const keyword = submissionSearch?.value?.trim() || "";
      const filtered = keyword
        ? scopedItems.filter((item) =>
            matchesSearch(
              `${item.formName || ""} ${formatJson(item.data)}`,
              keyword
            )
          )
        : scopedItems;
      renderSubmissionRows(filtered);
    } catch (error) {
      console.error("load_submissions_failed", error);
      const items = readLocalSubmissions();
      const formName = currentFormSpec.title;
      const scopedItems = items.filter((item) => item.formName === formName);
      const keyword = submissionSearch?.value?.trim() || "";
      const filtered = keyword
        ? scopedItems.filter((item) =>
            matchesSearch(
              `${item.formName || ""} ${formatJson(item.data)}`,
              keyword
            )
          )
        : scopedItems;
      renderSubmissionRows(filtered);
    }
  }

  async function syncLocalSubmissions(remoteItems) {
    const localItems = readLocalSubmissions();
    if (localItems.length === 0) {
      return;
    }
    const remoteIds = new Set(
      remoteItems.map((item) => String(item?.id || "")).filter(Boolean)
    );
    const missing = localItems.filter(
      (item) => item?.id && !remoteIds.has(String(item.id))
    );
    if (missing.length === 0) {
      return;
    }
    try {
      const response = await fetch(`${apiBaseUrl}/api/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: missing }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const idSet = new Set(missing.map((item) => String(item.id)));
      removeLocalSubmissionsByIds(idSet);
    } catch (error) {
      console.error("sync_submissions_failed", error);
    }
  }

  function scheduleSubmissionRefresh() {
    if (!submissionSearch) {
      return;
    }
    loadSubmissions();
  }

  function filterSearchResults(context) {
    const fields = currentFormSpec?.fields || [];
    return mockSearchData.filter((item) =>
      fields.every((field) => {
        const filterValue = context[field.id];
        const itemValue = item[field.id];
        if (field.type === "checkbox" || field.type === "switch") {
          return filterValue ? itemValue === true : true;
        }
        if (field.type === "multiselect") {
          if (!Array.isArray(filterValue) || filterValue.length === 0) {
            return true;
          }
          return filterValue.some((value) => itemValue?.includes(value));
        }
        if (numericFieldTypes.has(field.type)) {
          if (
            filterValue === "" ||
            filterValue === null ||
            filterValue === undefined ||
            Number.isNaN(Number(filterValue)) ||
            Number(filterValue) === 0
          ) {
            return true;
          }
          const numericFilter = Number(filterValue);
          return Number(itemValue) >= numericFilter;
        }
        if (!filterValue || filterValue === "") {
          return true;
        }
        const filterText = String(filterValue).toLowerCase();
        return String(itemValue ?? "")
          .toLowerCase()
          .includes(filterText);
      })
    );
  }

  async function saveSubmission(context) {
    try {
      const payload = {
        id: `submission_${Date.now()}`,
        createdAt: new Date().toISOString(),
        formName: currentFormSpec?.title || "",
        formSpec: currentFormSpec,
        data: context,
      };
      const response = await fetch(`${apiBaseUrl}/api/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        let detail = "";
        try {
          const errorBody = await response.json();
          detail = errorBody?.message || errorBody?.error || "";
        } catch (parseError) {
          try {
            detail = await response.text();
          } catch (textError) {
            detail = "";
          }
        }
        throw new Error(`HTTP ${response.status} ${detail}`.trim());
      }
      const result = await response.json();
      loadSubmissions();
      return result;
    } catch (error) {
      console.error("submission_save_failed", error);
      const payload = {
        id: `submission_${Date.now()}`,
        createdAt: new Date().toISOString(),
        formName: currentFormSpec?.title || "",
        formSpec: currentFormSpec,
        data: context,
      };
      appendLocalSubmissions([payload]);
      loadSubmissions();
      return { ok: true, count: 1, local: true };
    }
  }

  function inferFieldType(label, type) {
    let nextLabel = label;
    let nextType = type;

    const includes = (value) => label.includes(value);

    if (type === "text") {
      if (includes("パスワード")) {
        nextType = "password";
      } else if (includes("メール")) {
        nextType = "email";
      } else if (includes("電話") || includes("TEL") || includes("tel")) {
        nextType = "tel";
      } else if (includes("URL") || includes("url") || includes("リンク")) {
        nextType = "url";
      } else if (
        includes("ログイン状態") ||
        includes("ログイン保持") ||
        includes("ログインを保持") ||
        includes("ログイン維持") ||
        includes("ログインを維持") ||
        includes("remember")
      ) {
        nextType = "checkbox";
        if (label === "ログイン") {
          nextLabel = "ログイン状態を保持";
        }
      } else if (label === "ログイン") {
        nextLabel = "ログインID";
      }
    }

    return { label: nextLabel, type: nextType };
  }

  function matchPreset(promptText) {
    const text = promptText.trim();
    if (!text) {
      return presetDefinitions[0];
    }
    return (
      presetDefinitions.find((preset) =>
        preset.keywords.some((keyword) => text.includes(keyword))
      ) || {
        title: "汎用フォーム",
        description: "入力項目を必要に応じて追加してください。",
        fields: [
          { id: "title", label: "件名", type: "text" },
          { id: "owner", label: "担当者", type: "text" },
          { id: "dueDate", label: "期限", type: "date" },
          {
            id: "priority",
            label: "優先度",
            type: "select",
            options: ["高", "中", "低"],
          },
          { id: "notes", label: "備考", type: "textarea" },
        ],
      }
    );
  }

  function normalizeFormSpec(rawSpec, fallbackSpec) {
    if (!rawSpec || typeof rawSpec !== "object") {
      return fallbackSpec;
    }

    const title =
      typeof rawSpec.title === "string" && rawSpec.title.trim()
        ? rawSpec.title.trim()
        : fallbackSpec.title;
    const description =
      typeof rawSpec.description === "string"
        ? rawSpec.description.trim()
        : fallbackSpec.description;
    const titleStyle =
      rawSpec.titleStyle && typeof rawSpec.titleStyle === "object"
        ? rawSpec.titleStyle
        : fallbackSpec.titleStyle;

    const rawFields = Array.isArray(rawSpec.fields) ? rawSpec.fields : [];
    const usedIds = new Set();
    const fields = rawFields
      .map((field, index) => {
        if (!field || typeof field !== "object") {
          return null;
        }

        const baseLabel =
          typeof field.label === "string" && field.label.trim()
            ? field.label.trim()
            : `項目${index + 1}`;
        let type = allowedFieldTypes.has(field.type) ? field.type : "text";
        let label = baseLabel;
        if (type === "text") {
          const inferred = inferFieldType(baseLabel, type);
          type = inferred.type;
          label = inferred.label;
        }
        const baseId =
          typeof field.id === "string" && field.id.trim()
            ? field.id.trim()
            : label;
        const normalizedId = baseId
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "");
        let id = normalizedId || `field_${index}`;
        if (usedIds.has(id)) {
          id = `${id}_${index}`;
        }
        usedIds.add(id);

        const placeholder =
          typeof field.placeholder === "string" ? field.placeholder : undefined;
        const defaultValue =
          field.defaultValue !== undefined ? field.defaultValue : undefined;
        const style =
          field.style && typeof field.style === "object"
            ? field.style
            : undefined;
        const labelStyle =
          field.labelStyle && typeof field.labelStyle === "object"
            ? field.labelStyle
            : undefined;
        const normalizedField = { id, label, type };
        if (placeholder) {
          normalizedField.placeholder = placeholder;
        }
        if (defaultValue !== undefined) {
          normalizedField.defaultValue = defaultValue;
        }
        if (style) {
          normalizedField.style = style;
        }
        if (labelStyle) {
          normalizedField.labelStyle = labelStyle;
        }
        if (optionFieldTypes.has(type)) {
          const options = Array.isArray(field.options)
            ? field.options.filter((option) => typeof option === "string")
            : [];
          normalizedField.options =
            options.length > 0 ? options : ["選択肢1", "選択肢2"];
        }
        return normalizedField;
      })
      .filter(Boolean);

    if (fields.length === 0) {
      return fallbackSpec;
    }

    return {
      title,
      description,
      fields,
      titleStyle,
    };
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

  async function resolveFormSpec(promptText, fallbackSpec) {
    const endpoint = apiUrlInput.value.trim();
    if (!endpoint) {
      return fallbackSpec;
    }

    const model = modelInput.value.trim() || "gpt-4o-mini";
    const headers = {
      "Content-Type": "application/json",
    };

    const systemPrompt = [
      "あなたは業務フォームの設計者です。",
      "次のJSONスキーマだけを返してください。",
      '{ "title": string, "description": string, "titleStyle"?: { "fontSize"?: number }, "fields": [',
      '  { "id": string, "label": string, "type": "text|number|date|dateTime|time|email|tel|url|password|radio|switch|numberRange|currency|multiselect|textarea|select|file|checkbox", "options"?: string[] }',
      "] }",
      "JSON以外の文章は一切出力しないでください。",
    ].join(" ");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: buildUserPrompt(promptText) },
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

      return normalizeFormSpec(parsed, fallbackSpec);
    } catch (error) {
      return fallbackSpec;
    }
  }

  function buildA2uiMessages(formSpec) {
    const components = [];
    const dataModel = {};

    const rootId = "root";
    const titleId = "form_title";
    const descId = "form_description";
    const buttonId = "submit_button";
    const buttonLabelId = "submit_label";

    const children = [titleId, descId];

    components.push({
      id: rootId,
      component: "Column",
      children,
    });

    components.push({
      id: titleId,
      component: "Text",
      text: formSpec.title,
      style: formSpec.titleStyle || undefined,
    });

    components.push({
      id: descId,
      component: "Text",
      text: formSpec.description,
      style: formSpec.descriptionStyle || undefined,
    });

    formSpec.fields.forEach((field, index) => {
      const fieldId = `field_${index}`;
      const fieldPath = `/form/${field.id}`;
      children.push(fieldId);
      let initialValue = field.defaultValue;
      if (initialValue === undefined) {
        initialValue = numericFieldTypes.has(field.type)
          ? isSearchMode
            ? ""
            : 0
          : field.type === "file" || field.type === "multiselect"
          ? []
          : field.type === "checkbox" || field.type === "switch"
          ? false
          : "";
      } else if (numericFieldTypes.has(field.type)) {
        initialValue = Number(initialValue || 0);
      } else if (field.type === "checkbox" || field.type === "switch") {
        initialValue = Boolean(initialValue);
      } else if (field.type === "multiselect") {
        initialValue = Array.isArray(initialValue) ? initialValue : [];
      }
      dataModel[field.id] = initialValue;

      const component = {
        id: fieldId,
        fieldId: field.id,
        component:
          field.type === "textarea"
            ? "TextArea"
            : field.type === "number"
            ? "NumberField"
            : field.type === "date"
            ? "DateField"
            : field.type === "dateTime"
            ? "DateTimeField"
            : field.type === "time"
            ? "TimeField"
            : field.type === "email"
            ? "EmailField"
            : field.type === "tel"
            ? "TelField"
            : field.type === "url"
            ? "UrlField"
            : field.type === "password"
            ? "PasswordField"
            : field.type === "select"
            ? "Select"
            : field.type === "radio"
            ? "RadioGroup"
            : field.type === "multiselect"
            ? "MultiSelect"
            : field.type === "switch"
            ? "SwitchField"
            : field.type === "numberRange"
            ? "RangeField"
            : field.type === "currency"
            ? "CurrencyField"
            : field.type === "file"
            ? "FileField"
            : field.type === "checkbox"
            ? "CheckboxField"
            : "TextField",
        label: field.label,
        value: { path: fieldPath },
        placeholder: field.placeholder,
        style: field.style,
        labelStyle: field.labelStyle,
      };

      if (optionFieldTypes.has(field.type)) {
        component.options = field.options.map((option) => ({
          label: option,
          value: option,
        }));
      }

      components.push(component);
    });

    children.push(buttonId);

    components.push({
      id: buttonId,
      component: "Button",
      child: buttonLabelId,
      action: {
        name: "submit_form",
        context: Object.keys(dataModel).reduce((acc, key) => {
          acc[key] = { path: `/form/${key}` };
          return acc;
        }, {}),
      },
    });

    components.push({
      id: buttonLabelId,
      component: "Text",
      text: "送信",
    });

    const messages = [
      {
        createSurface: {
          surfaceId: surfaceState.surfaceId,
          catalogId,
        },
      },
      {
        updateComponents: {
          surfaceId: surfaceState.surfaceId,
          components,
        },
      },
      {
        updateDataModel: {
          surfaceId: surfaceState.surfaceId,
          path: "/form",
          op: "replace",
          value: dataModel,
        },
      },
    ];

    return messages;
  }

  function renderMessages(messages) {
    formSurface.innerHTML = "";
    surfaceState.components.clear();
    surfaceState.dataModel = {};
    componentNodes.clear();
    selectedComponentId = null;
    renderPropertyPanel(null);

    messages.forEach((message) => {
      if (message.createSurface) {
        surfaceState.surfaceId = message.createSurface.surfaceId;
      }
      if (message.updateComponents) {
        message.updateComponents.components.forEach((component) => {
          surfaceState.components.set(component.id, component);
        });
      }
      if (message.updateDataModel) {
        applyDataModelUpdate(message.updateDataModel);
      }
    });

    const root = surfaceState.components.get("root");
    if (root) {
      const rootNode = renderComponent(root);
      formSurface.appendChild(rootNode);
    }
    applyFontClass();
  }

  function attachComponentNode(component, node) {
    if (!component?.id || !node) {
      return;
    }
    componentNodes.set(component.id, node);
    node.dataset.componentId = component.id;
    node.classList.add("component-selectable");
    if (selectedComponentId === component.id) {
      node.classList.add("component-selected");
    }
    node.addEventListener("click", (event) => {
      event.stopPropagation();
      selectComponent(component.id);
    });
  }

  function clearSelectedComponent() {
    if (selectedComponentId) {
      const prevNode = componentNodes.get(selectedComponentId);
      prevNode?.classList.remove("component-selected");
    }
    selectedComponentId = null;
    renderPropertyPanel(null);
  }

  function selectComponent(componentId) {
    if (!componentId || selectedComponentId === componentId) {
      return;
    }
    if (selectedComponentId) {
      const prevNode = componentNodes.get(selectedComponentId);
      prevNode?.classList.remove("component-selected");
    }
    selectedComponentId = componentId;
    const nextNode = componentNodes.get(componentId);
    nextNode?.classList.add("component-selected");
    renderPropertyPanel(surfaceState.components.get(componentId));
  }

  function updateFormSpecTitle(text, fontSize) {
    if (!currentFormSpec) {
      return;
    }
    currentFormSpec.title = text;
    if (fontSize === undefined) {
      return;
    }
    if (fontSize === null) {
      if (currentFormSpec.titleStyle) {
        delete currentFormSpec.titleStyle.fontSize;
        if (!Object.keys(currentFormSpec.titleStyle).length) {
          delete currentFormSpec.titleStyle;
        }
      }
      return;
    }
    currentFormSpec.titleStyle = currentFormSpec.titleStyle || {};
    currentFormSpec.titleStyle.fontSize = fontSize;
  }

  function updateFormSpecTitleColor(color) {
    if (!currentFormSpec) {
      return;
    }
    currentFormSpec.titleStyle = currentFormSpec.titleStyle || {};
    if (!color) {
      delete currentFormSpec.titleStyle.color;
    } else {
      currentFormSpec.titleStyle.color = color;
    }
  }

  function updateFormSpecDescription(text) {
    if (!currentFormSpec) {
      return;
    }
    currentFormSpec.description = text;
  }

  function updateFormSpecDescriptionColor(color) {
    if (!currentFormSpec) {
      return;
    }
    currentFormSpec.descriptionStyle = currentFormSpec.descriptionStyle || {};
    if (!color) {
      delete currentFormSpec.descriptionStyle.color;
    } else {
      currentFormSpec.descriptionStyle.color = color;
    }
  }

  function updateFieldSpecLabel(fieldId, label) {
    if (!currentFormSpec?.fields || !fieldId) {
      return;
    }
    const field = currentFormSpec.fields.find((item) => item.id === fieldId);
    if (field) {
      field.label = label;
    }
  }

  function updateFieldSpecPlaceholder(fieldId, placeholder) {
    if (!currentFormSpec?.fields || !fieldId) {
      return;
    }
    const field = currentFormSpec.fields.find((item) => item.id === fieldId);
    if (field) {
      if (!placeholder) {
        delete field.placeholder;
      } else {
        field.placeholder = placeholder;
      }
    }
  }

  function updateFieldSpecDefaultValue(fieldId, value) {
    if (!currentFormSpec?.fields || !fieldId) {
      return;
    }
    const field = currentFormSpec.fields.find((item) => item.id === fieldId);
    if (field) {
      field.defaultValue = value;
    }
  }

  function updateFieldSpecOptions(fieldId, options) {
    if (!currentFormSpec?.fields || !fieldId) {
      return;
    }
    const field = currentFormSpec.fields.find((item) => item.id === fieldId);
    if (field) {
      field.options = options;
    }
  }

  function updateFieldSpecStyle(fieldId, style) {
    if (!currentFormSpec?.fields || !fieldId) {
      return;
    }
    const field = currentFormSpec.fields.find((item) => item.id === fieldId);
    if (field) {
      if (!style || !Object.keys(style).length) {
        delete field.style;
      } else {
        field.style = style;
      }
    }
  }

  function updateFieldSpecLabelStyle(fieldId, style) {
    if (!currentFormSpec?.fields || !fieldId) {
      return;
    }
    const field = currentFormSpec.fields.find((item) => item.id === fieldId);
    if (field) {
      if (!style || !Object.keys(style).length) {
        delete field.labelStyle;
      } else {
        field.labelStyle = style;
      }
    }
  }

  function updateTextNode(component) {
    const node = componentNodes.get(component.id);
    if (!node) {
      return;
    }
    node.textContent = component.text || "";
    if (component.style?.fontSize) {
      node.style.fontSize = `${component.style.fontSize}px`;
    } else {
      node.style.removeProperty("font-size");
    }
    if (component.style?.color) {
      node.style.color = component.style.color;
    } else {
      node.style.removeProperty("color");
    }
  }

  function updateLabelNode(component) {
    const node = componentNodes.get(component.id);
    if (!node) {
      return;
    }
    const label =
      node.querySelector("label.form-label") ||
      node.querySelector("label.form-check-label");
    if (label) {
      label.textContent = component.label || "未設定";
      if (component.labelStyle?.fontSize) {
        label.style.fontSize = `${component.labelStyle.fontSize}px`;
      } else {
        label.style.removeProperty("font-size");
      }
      if (component.labelStyle?.fontWeight) {
        label.style.fontWeight = String(component.labelStyle.fontWeight);
      } else {
        label.style.removeProperty("font-weight");
      }
      if (component.labelStyle?.color) {
        label.style.color = component.labelStyle.color;
      } else {
        label.style.removeProperty("color");
      }
    }
  }

  function updateInputNodeStyle(component) {
    const node = componentNodes.get(component.id);
    if (!node) {
      return;
    }
    const input =
      node.querySelector("input") ||
      node.querySelector("textarea") ||
      node.querySelector("select");
    if (!input) {
      return;
    }
    if (component.style?.fontSize) {
      input.style.fontSize = `${component.style.fontSize}px`;
    } else {
      input.style.removeProperty("font-size");
    }
    if (component.style?.color) {
      input.style.color = component.style.color;
    } else {
      input.style.removeProperty("color");
    }
    if (component.style?.backgroundColor) {
      input.style.backgroundColor = component.style.backgroundColor;
    } else {
      input.style.removeProperty("background-color");
    }
    if (component.style?.width) {
      input.style.width = normalizeSizeValue(component.style.width);
    } else {
      input.style.removeProperty("width");
    }
    if (component.style?.height) {
      input.style.height = normalizeSizeValue(component.style.height);
    } else {
      input.style.removeProperty("height");
    }
  }

  function normalizeSizeValue(value) {
    if (value === undefined || value === null) {
      return "";
    }
    const raw = String(value).trim();
    if (!raw) {
      return "";
    }
    if (/^\d+(\.\d+)?$/.test(raw)) {
      return `${raw}px`;
    }
    return raw;
  }

  function updateButtonNode(component) {
    const node = componentNodes.get(component.id);
    if (!node) {
      return;
    }
    const button =
      node.tagName === "BUTTON" ? node : node.querySelector("button");
    if (!button) {
      return;
    }
    if (component.style?.fontSize) {
      button.style.fontSize = `${component.style.fontSize}px`;
    } else {
      button.style.removeProperty("font-size");
    }
    if (component.style?.color) {
      button.style.color = component.style.color;
    } else {
      button.style.removeProperty("color");
    }
    if (component.style?.backgroundColor) {
      button.style.backgroundColor = component.style.backgroundColor;
      button.style.borderColor = component.style.backgroundColor;
    } else {
      button.style.removeProperty("background-color");
      button.style.removeProperty("border-color");
    }
    if (component.style?.width) {
      button.style.width = normalizeSizeValue(component.style.width);
    } else {
      button.style.removeProperty("width");
    }
    if (component.style?.height) {
      button.style.height = normalizeSizeValue(component.style.height);
    } else {
      button.style.removeProperty("height");
    }
  }

  function setComponentValue(component, value) {
    const dataPath = component.value?.path;
    if (dataPath) {
      setValueByPath(surfaceState.dataModel, dataPath, value);
    }
    const node = componentNodes.get(component.id);
    if (!node) {
      return;
    }
    if (
      component.component === "CheckboxField" ||
      component.component === "SwitchField"
    ) {
      const checkbox = node.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.checked = Boolean(value);
      }
      return;
    }
    if (component.component === "RadioGroup") {
      const radios = node.querySelectorAll('input[type="radio"]');
      radios.forEach((radio) => {
        radio.checked = radio.value === value;
      });
      return;
    }
    if (component.component === "MultiSelect") {
      const select = node.querySelector("select");
      if (select) {
        const values = Array.isArray(value) ? value : [];
        Array.from(select.options).forEach((option) => {
          option.selected = values.includes(option.value);
        });
      }
      return;
    }
    if (component.component === "Select") {
      const select = node.querySelector("select");
      if (select) {
        select.value = value ?? "";
      }
      return;
    }
    if (component.component === "RangeField") {
      const range = node.querySelector('input[type="range"]');
      const number = node.querySelector('input[type="number"]');
      if (range) {
        range.value = value ?? "";
      }
      if (number) {
        number.value = value ?? "";
      }
      return;
    }
    if (component.component === "FileField") {
      return;
    }
    const input = node.querySelector("input") || node.querySelector("textarea");
    if (input) {
      input.value = value ?? "";
    }
  }

  function syncButtonLabel(labelComponent) {
    if (!labelComponent?.id) {
      return;
    }
    surfaceState.components.forEach((component) => {
      if (component.component !== "Button") {
        return;
      }
      if (component.child !== labelComponent.id) {
        return;
      }
      const node = componentNodes.get(component.id);
      const button =
        node?.tagName === "BUTTON" ? node : node?.querySelector("button");
      if (button) {
        button.textContent = labelComponent.text || "送信";
      }
    });
  }

  function replaceComponentNode(component) {
    const currentNode = componentNodes.get(component.id);
    if (!currentNode) {
      return;
    }
    componentNodes.delete(component.id);
    const nextNode = renderComponent(component);
    currentNode.replaceWith(nextNode);
    if (selectedComponentId === component.id) {
      nextNode.classList.add("component-selected");
    }
  }

  function renderPropertyPanel(component) {
    if (!propertyPanel) {
      return;
    }
    propertyPanel.innerHTML = "";
    if (!component) {
      const empty = document.createElement("p");
      empty.className = "text-muted small mb-0";
      empty.textContent =
        "コンポーネントをクリックするとプロパティが表示されます。";
      propertyPanel.appendChild(empty);
      return;
    }

    const heading = document.createElement("div");
    heading.className = "mb-3";
    heading.innerHTML = `
      <div class="fw-semibold">${component.component}</div>
      <div class="text-muted small">ID: ${component.id}</div>
    `;
    propertyPanel.appendChild(heading);

    const fields = [];
    const makeField = (labelText, inputEl) => {
      const wrapper = document.createElement("div");
      wrapper.className = "property-field";
      const label = document.createElement("label");
      label.textContent = labelText;
      wrapper.appendChild(label);
      wrapper.appendChild(inputEl);
      return wrapper;
    };

    if (component.component === "Text") {
      const textInput = document.createElement("input");
      textInput.type = "text";
      textInput.className = "form-control form-control-sm";
      textInput.value = component.text || "";
      textInput.addEventListener("input", () => {
        component.text = textInput.value;
        updateTextNode(component);
        if (component.id === "form_title") {
          updateFormSpecTitle(component.text, undefined);
        } else if (component.id === "form_description") {
          updateFormSpecDescription(component.text);
        }
        syncButtonLabel(component);
      });
      fields.push(makeField("テキスト", textInput));

      const sizeInput = document.createElement("input");
      sizeInput.type = "number";
      sizeInput.min = "8";
      sizeInput.placeholder = "未設定";
      sizeInput.className = "form-control form-control-sm";
      sizeInput.value = component.style?.fontSize ?? "";
      sizeInput.addEventListener("input", () => {
        const raw = sizeInput.value.trim();
        if (!raw) {
          if (component.style) {
            delete component.style.fontSize;
            if (!Object.keys(component.style).length) {
              delete component.style;
            }
          }
          updateTextNode(component);
          if (component.id === "form_title") {
            updateFormSpecTitle(component.text || "", null);
          }
          return;
        }
        const nextSize = Number(raw);
        if (!Number.isFinite(nextSize)) {
          return;
        }
        component.style = component.style || {};
        component.style.fontSize = nextSize;
        updateTextNode(component);
        if (component.id === "form_title") {
          updateFormSpecTitle(component.text || "", nextSize);
        }
      });
      fields.push(makeField("フォントサイズ", sizeInput));

      const colorInput = document.createElement("input");
      colorInput.type = "text";
      colorInput.placeholder = "#000000";
      colorInput.className = "form-control form-control-sm";
      colorInput.value = component.style?.color ?? "";
      colorInput.addEventListener("input", () => {
        const nextColor = colorInput.value.trim();
        component.style = component.style || {};
        if (!nextColor) {
          delete component.style.color;
          if (!Object.keys(component.style).length) {
            delete component.style;
          }
        } else {
          component.style.color = nextColor;
        }
        updateTextNode(component);
        if (component.id === "form_title") {
          updateFormSpecTitleColor(nextColor);
        } else if (component.id === "form_description") {
          updateFormSpecDescriptionColor(nextColor);
        }
      });
      fields.push(makeField("文字色", colorInput));
    }

    if (
      component.component === "TextField" ||
      component.component === "NumberField" ||
      component.component === "DateField" ||
      component.component === "DateTimeField" ||
      component.component === "TimeField" ||
      component.component === "EmailField" ||
      component.component === "TelField" ||
      component.component === "UrlField" ||
      component.component === "PasswordField" ||
      component.component === "TextArea" ||
      component.component === "Select" ||
      component.component === "MultiSelect" ||
      component.component === "RadioGroup" ||
      component.component === "SwitchField" ||
      component.component === "RangeField" ||
      component.component === "CurrencyField" ||
      component.component === "FileField" ||
      component.component === "CheckboxField"
    ) {
      const labelGroup = document.createElement("div");
      labelGroup.className = "property-group";
      const labelGroupTitle = document.createElement("div");
      labelGroupTitle.className = "property-group__title";
      labelGroupTitle.textContent = "ラベル";
      labelGroup.appendChild(labelGroupTitle);

      const labelInput = document.createElement("input");
      labelInput.type = "text";
      labelInput.className = "form-control form-control-sm";
      labelInput.value = component.label || "";
      labelInput.addEventListener("input", () => {
        component.label = labelInput.value;
        updateLabelNode(component);
        updateFieldSpecLabel(component.fieldId, component.label);
      });
      labelGroup.appendChild(makeField("テキスト", labelInput));

      const labelSizeInput = document.createElement("input");
      labelSizeInput.type = "number";
      labelSizeInput.min = "8";
      labelSizeInput.placeholder = "未設定";
      labelSizeInput.className = "form-control form-control-sm";
      labelSizeInput.value = component.labelStyle?.fontSize ?? "";
      labelSizeInput.addEventListener("input", () => {
        const raw = labelSizeInput.value.trim();
        component.labelStyle = component.labelStyle || {};
        if (!raw) {
          delete component.labelStyle.fontSize;
        } else {
          const nextSize = Number(raw);
          if (!Number.isFinite(nextSize)) {
            return;
          }
          component.labelStyle.fontSize = nextSize;
        }
        updateLabelNode(component);
        updateFieldSpecLabelStyle(
          component.fieldId,
          component.labelStyle || {}
        );
      });
      labelGroup.appendChild(makeField("サイズ", labelSizeInput));

      const labelBoldInput = document.createElement("input");
      labelBoldInput.type = "checkbox";
      labelBoldInput.className = "form-check-input";
      labelBoldInput.checked = component.labelStyle?.fontWeight === "700";
      labelBoldInput.addEventListener("change", () => {
        component.labelStyle = component.labelStyle || {};
        if (labelBoldInput.checked) {
          component.labelStyle.fontWeight = "700";
        } else {
          delete component.labelStyle.fontWeight;
        }
        updateLabelNode(component);
        updateFieldSpecLabelStyle(
          component.fieldId,
          component.labelStyle || {}
        );
      });
      labelGroup.appendChild(makeField("太字", labelBoldInput));

      const labelColorInput = document.createElement("input");
      labelColorInput.type = "text";
      labelColorInput.placeholder = "#111827";
      labelColorInput.className = "form-control form-control-sm";
      labelColorInput.value = component.labelStyle?.color ?? "";
      labelColorInput.addEventListener("input", () => {
        const nextColor = labelColorInput.value.trim();
        component.labelStyle = component.labelStyle || {};
        if (!nextColor) {
          delete component.labelStyle.color;
        } else {
          component.labelStyle.color = nextColor;
        }
        updateLabelNode(component);
        updateFieldSpecLabelStyle(
          component.fieldId,
          component.labelStyle || {}
        );
      });
      labelGroup.appendChild(makeField("文字色", labelColorInput));

      fields.push(labelGroup);

      const placeholderInput = document.createElement("input");
      placeholderInput.type = "text";
      placeholderInput.className = "form-control form-control-sm";
      placeholderInput.value = component.placeholder || "";
      placeholderInput.addEventListener("input", () => {
        component.placeholder = placeholderInput.value.trim();
        updateFieldSpecPlaceholder(component.fieldId, component.placeholder);
        const node = componentNodes.get(component.id);
        const input =
          node?.querySelector("input") || node?.querySelector("textarea");
        if (input && "placeholder" in input) {
          input.placeholder = component.placeholder;
        }
      });
      fields.push(makeField("プレースホルダー", placeholderInput));

      const sizeInput = document.createElement("input");
      sizeInput.type = "number";
      sizeInput.min = "8";
      sizeInput.placeholder = "未設定";
      sizeInput.className = "form-control form-control-sm";
      sizeInput.value = component.style?.fontSize ?? "";
      sizeInput.addEventListener("input", () => {
        const raw = sizeInput.value.trim();
        component.style = component.style || {};
        if (!raw) {
          delete component.style.fontSize;
        } else {
          const nextSize = Number(raw);
          if (!Number.isFinite(nextSize)) {
            return;
          }
          component.style.fontSize = nextSize;
        }
        updateInputNodeStyle(component);
        updateFieldSpecStyle(component.fieldId, component.style || {});
      });
      fields.push(makeField("サイズ", sizeInput));

      const colorInput = document.createElement("input");
      colorInput.type = "text";
      colorInput.placeholder = "#111827";
      colorInput.className = "form-control form-control-sm";
      colorInput.value = component.style?.color ?? "";
      colorInput.addEventListener("input", () => {
        const nextColor = colorInput.value.trim();
        component.style = component.style || {};
        if (!nextColor) {
          delete component.style.color;
        } else {
          component.style.color = nextColor;
        }
        updateInputNodeStyle(component);
        updateFieldSpecStyle(component.fieldId, component.style || {});
      });
      fields.push(makeField("文字色", colorInput));

      const bgInput = document.createElement("input");
      bgInput.type = "text";
      bgInput.placeholder = "#ffffff";
      bgInput.className = "form-control form-control-sm";
      bgInput.value = component.style?.backgroundColor ?? "";
      bgInput.addEventListener("input", () => {
        const nextColor = bgInput.value.trim();
        component.style = component.style || {};
        if (!nextColor) {
          delete component.style.backgroundColor;
        } else {
          component.style.backgroundColor = nextColor;
        }
        updateInputNodeStyle(component);
        updateFieldSpecStyle(component.fieldId, component.style || {});
      });
      fields.push(makeField("背景色", bgInput));

      const widthInput = document.createElement("input");
      widthInput.type = "text";
      widthInput.placeholder = "例: 240px / 100%";
      widthInput.className = "form-control form-control-sm";
      widthInput.value = component.style?.width ?? "";
      widthInput.addEventListener("input", () => {
        const nextValue = widthInput.value.trim();
        component.style = component.style || {};
        if (!nextValue) {
          delete component.style.width;
        } else {
          component.style.width = nextValue;
        }
        updateInputNodeStyle(component);
        updateFieldSpecStyle(component.fieldId, component.style || {});
      });
      fields.push(makeField("幅", widthInput));

      const heightInput = document.createElement("input");
      heightInput.type = "text";
      heightInput.placeholder = "例: 40px";
      heightInput.className = "form-control form-control-sm";
      heightInput.value = component.style?.height ?? "";
      heightInput.addEventListener("input", () => {
        const nextValue = heightInput.value.trim();
        component.style = component.style || {};
        if (!nextValue) {
          delete component.style.height;
        } else {
          component.style.height = nextValue;
        }
        updateInputNodeStyle(component);
        updateFieldSpecStyle(component.fieldId, component.style || {});
      });
      fields.push(makeField("高さ", heightInput));

      const valueField = component.value?.path
        ? getValueByPath(surfaceState.dataModel, component.value.path)
        : "";
      if (
        component.component === "CheckboxField" ||
        component.component === "SwitchField"
      ) {
        const defaultInput = document.createElement("input");
        defaultInput.type = "checkbox";
        defaultInput.className = "form-check-input";
        defaultInput.checked = Boolean(valueField);
        defaultInput.addEventListener("change", () => {
          const nextValue = defaultInput.checked;
          setComponentValue(component, nextValue);
          updateFieldSpecDefaultValue(component.fieldId, nextValue);
        });
        fields.push(makeField("初期値", defaultInput));
      } else if (component.component === "MultiSelect") {
        const defaultInput = document.createElement("textarea");
        defaultInput.className = "form-control form-control-sm";
        defaultInput.rows = 3;
        defaultInput.value = Array.isArray(valueField)
          ? valueField.join(",")
          : "";
        defaultInput.addEventListener("input", () => {
          const nextValue = defaultInput.value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
          setComponentValue(component, nextValue);
          updateFieldSpecDefaultValue(component.fieldId, nextValue);
        });
        fields.push(makeField("初期値(カンマ区切り)", defaultInput));
      } else if (component.component === "Select") {
        const defaultInput = document.createElement("select");
        defaultInput.className = "form-select form-select-sm";
        (component.options || []).forEach((option) => {
          const optionNode = document.createElement("option");
          optionNode.value = option.value;
          optionNode.textContent = option.label;
          defaultInput.appendChild(optionNode);
        });
        defaultInput.value = valueField ?? "";
        defaultInput.addEventListener("change", () => {
          const nextValue = defaultInput.value;
          setComponentValue(component, nextValue);
          updateFieldSpecDefaultValue(component.fieldId, nextValue);
        });
        fields.push(makeField("初期値", defaultInput));
      } else if (component.component === "RadioGroup") {
        const defaultInput = document.createElement("select");
        defaultInput.className = "form-select form-select-sm";
        (component.options || []).forEach((option) => {
          const optionNode = document.createElement("option");
          optionNode.value = option.value;
          optionNode.textContent = option.label;
          defaultInput.appendChild(optionNode);
        });
        defaultInput.value = valueField ?? "";
        defaultInput.addEventListener("change", () => {
          const nextValue = defaultInput.value;
          setComponentValue(component, nextValue);
          updateFieldSpecDefaultValue(component.fieldId, nextValue);
        });
        fields.push(makeField("初期値", defaultInput));
      } else if (
        component.component === "NumberField" ||
        component.component === "CurrencyField" ||
        component.component === "RangeField"
      ) {
        const defaultInput = document.createElement("input");
        defaultInput.type = "number";
        defaultInput.className = "form-control form-control-sm";
        defaultInput.value = valueField ?? "";
        defaultInput.addEventListener("input", () => {
          const nextValue = Number(defaultInput.value || 0);
          setComponentValue(component, nextValue);
          updateFieldSpecDefaultValue(component.fieldId, nextValue);
        });
        fields.push(makeField("初期値", defaultInput));
      } else if (component.component !== "FileField") {
        const defaultInput = document.createElement("input");
        defaultInput.type = "text";
        defaultInput.className = "form-control form-control-sm";
        defaultInput.value = valueField ?? "";
        defaultInput.addEventListener("input", () => {
          const nextValue = defaultInput.value;
          setComponentValue(component, nextValue);
          updateFieldSpecDefaultValue(component.fieldId, nextValue);
        });
        fields.push(makeField("初期値", defaultInput));
      }
    }

    if (
      component.component === "Select" ||
      component.component === "MultiSelect" ||
      component.component === "RadioGroup"
    ) {
      const optionsArea = document.createElement("textarea");
      optionsArea.className = "form-control form-control-sm";
      optionsArea.rows = 4;
      optionsArea.value = (component.options || [])
        .map((option) => option.label)
        .join("\n");
      optionsArea.addEventListener("input", () => {
        const nextOptions = optionsArea.value
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);
        component.options = nextOptions.map((option) => ({
          label: option,
          value: option,
        }));
        updateFieldSpecOptions(component.fieldId, nextOptions);
        replaceComponentNode(component);
      });
      fields.push(makeField("選択肢", optionsArea));
    }

    if (component.component === "Button") {
      const labelComponent = surfaceState.components.get(component.child);
      const labelInput = document.createElement("input");
      labelInput.type = "text";
      labelInput.className = "form-control form-control-sm";
      labelInput.value = labelComponent?.text || "";
      labelInput.addEventListener("input", () => {
        if (!labelComponent) {
          return;
        }
        labelComponent.text = labelInput.value;
        syncButtonLabel(labelComponent);
      });
      fields.push(makeField("ラベル", labelInput));

      const sizeInput = document.createElement("input");
      sizeInput.type = "number";
      sizeInput.min = "8";
      sizeInput.placeholder = "未設定";
      sizeInput.className = "form-control form-control-sm";
      sizeInput.value = component.style?.fontSize ?? "";
      sizeInput.addEventListener("input", () => {
        const raw = sizeInput.value.trim();
        component.style = component.style || {};
        if (!raw) {
          delete component.style.fontSize;
        } else {
          const nextSize = Number(raw);
          if (!Number.isFinite(nextSize)) {
            return;
          }
          component.style.fontSize = nextSize;
        }
        updateButtonNode(component);
      });
      fields.push(makeField("サイズ", sizeInput));

      const colorInput = document.createElement("input");
      colorInput.type = "text";
      colorInput.placeholder = "#ffffff";
      colorInput.className = "form-control form-control-sm";
      colorInput.value = component.style?.color ?? "";
      colorInput.addEventListener("input", () => {
        const nextColor = colorInput.value.trim();
        component.style = component.style || {};
        if (!nextColor) {
          delete component.style.color;
        } else {
          component.style.color = nextColor;
        }
        updateButtonNode(component);
      });
      fields.push(makeField("文字色", colorInput));

      const bgInput = document.createElement("input");
      bgInput.type = "text";
      bgInput.placeholder = "#1d4ed8";
      bgInput.className = "form-control form-control-sm";
      bgInput.value = component.style?.backgroundColor ?? "";
      bgInput.addEventListener("input", () => {
        const nextColor = bgInput.value.trim();
        component.style = component.style || {};
        if (!nextColor) {
          delete component.style.backgroundColor;
        } else {
          component.style.backgroundColor = nextColor;
        }
        updateButtonNode(component);
      });
      fields.push(makeField("背景色", bgInput));

      const widthInput = document.createElement("input");
      widthInput.type = "text";
      widthInput.placeholder = "例: 120px / 100%";
      widthInput.className = "form-control form-control-sm";
      widthInput.value = component.style?.width ?? "";
      widthInput.addEventListener("input", () => {
        const nextValue = widthInput.value.trim();
        component.style = component.style || {};
        if (!nextValue) {
          delete component.style.width;
        } else {
          component.style.width = nextValue;
        }
        updateButtonNode(component);
      });
      fields.push(makeField("幅", widthInput));

      const heightInput = document.createElement("input");
      heightInput.type = "text";
      heightInput.placeholder = "例: 40px";
      heightInput.className = "form-control form-control-sm";
      heightInput.value = component.style?.height ?? "";
      heightInput.addEventListener("input", () => {
        const nextValue = heightInput.value.trim();
        component.style = component.style || {};
        if (!nextValue) {
          delete component.style.height;
        } else {
          component.style.height = nextValue;
        }
        updateButtonNode(component);
      });
      fields.push(makeField("高さ", heightInput));
    }

    if (fields.length === 0) {
      const empty = document.createElement("p");
      empty.className = "text-muted small mb-0";
      empty.textContent =
        "このコンポーネントには編集できるプロパティがありません。";
      propertyPanel.appendChild(empty);
      return;
    }
    fields.forEach((field) => propertyPanel.appendChild(field));
  }

  function applyDataModelUpdate(update) {
    if (update.op !== "replace") {
      return;
    }
    setValueByPath(surfaceState.dataModel, update.path, update.value);
  }

  function renderComponent(component) {
    switch (component.component) {
      case "Column":
        return renderContainer(component, "column");
      case "Row":
        return renderContainer(component, "row");
      case "Text":
        return renderText(component);
      case "TextField":
      case "NumberField":
      case "DateField":
      case "DateTimeField":
      case "TimeField":
      case "EmailField":
      case "TelField":
      case "UrlField":
      case "PasswordField":
      case "TextArea":
      case "Select":
      case "RadioGroup":
      case "MultiSelect":
      case "SwitchField":
      case "RangeField":
      case "CurrencyField":
      case "FileField":
      case "CheckboxField":
        return renderInput(component);
      case "Button":
        return renderButton(component);
      default:
        return renderUnsupported(component);
    }
  }

  function renderContainer(component, layout) {
    const container = document.createElement("div");
    container.className =
      layout === "row"
        ? "d-flex flex-row flex-wrap gap-3"
        : "d-flex flex-column gap-3";
    (component.children || []).forEach((childId) => {
      const childComponent = surfaceState.components.get(childId);
      if (childComponent) {
        container.appendChild(renderComponent(childComponent));
      }
    });
    attachComponentNode(component, container);
    return container;
  }

  function renderText(component) {
    const text = document.createElement("div");
    text.className = "fw-semibold";
    text.textContent = component.text || "";
    if (component.style?.fontSize) {
      text.style.fontSize = `${component.style.fontSize}px`;
    }
    if (component.style?.color) {
      text.style.color = component.style.color;
    }
    attachComponentNode(component, text);
    return text;
  }

  function renderInput(component) {
    if (component.component === "RadioGroup") {
      return renderRadioGroup(component);
    }
    if (component.component === "RangeField") {
      return renderRangeField(component);
    }

    const wrapper = document.createElement("div");
    wrapper.className = "mb-3";

    const label = document.createElement("label");
    label.className = "form-label";
    label.textContent = component.label || "未設定";
    if (component.labelStyle?.fontSize) {
      label.style.fontSize = `${component.labelStyle.fontSize}px`;
    }
    if (component.labelStyle?.fontWeight) {
      label.style.fontWeight = String(component.labelStyle.fontWeight);
    }
    if (component.labelStyle?.color) {
      label.style.color = component.labelStyle.color;
    }
    wrapper.appendChild(label);

    let input;
    if (component.component === "TextArea") {
      input = document.createElement("textarea");
    } else if (component.component === "Select") {
      input = document.createElement("select");
      input.className = "form-select";
      if (isSearchMode) {
        const emptyOption = document.createElement("option");
        emptyOption.value = "";
        emptyOption.textContent = "指定なし";
        input.appendChild(emptyOption);
      }
      (component.options || []).forEach((option) => {
        const optionNode = document.createElement("option");
        optionNode.value = option.value;
        optionNode.textContent = option.label;
        input.appendChild(optionNode);
      });
    } else if (component.component === "MultiSelect") {
      input = document.createElement("select");
      input.multiple = true;
      input.className = "form-select";
      (component.options || []).forEach((option) => {
        const optionNode = document.createElement("option");
        optionNode.value = option.value;
        optionNode.textContent = option.label;
        input.appendChild(optionNode);
      });
    } else if (component.component === "FileField") {
      input = document.createElement("input");
      input.type = "file";
    } else if (component.component === "CheckboxField") {
      return renderCheckbox(component, false);
    } else if (component.component === "SwitchField") {
      return renderCheckbox(component, true);
    } else if (component.component === "EmailField") {
      input = document.createElement("input");
      input.type = "email";
    } else if (component.component === "TelField") {
      input = document.createElement("input");
      input.type = "tel";
    } else if (component.component === "UrlField") {
      input = document.createElement("input");
      input.type = "url";
    } else if (component.component === "PasswordField") {
      input = document.createElement("input");
      input.type = "password";
    } else if (component.component === "DateTimeField") {
      input = document.createElement("input");
      input.type = "datetime-local";
    } else if (component.component === "TimeField") {
      input = document.createElement("input");
      input.type = "time";
    } else if (component.component === "CurrencyField") {
      input = document.createElement("input");
      input.type = "number";
      input.step = "0.01";
    } else {
      input = document.createElement("input");
      input.type =
        component.component === "NumberField"
          ? "number"
          : component.component === "DateField"
          ? "date"
          : "text";
    }

    if (
      component.component === "TextArea" ||
      component.component === "FileField" ||
      component.component === "DateTimeField" ||
      component.component === "TimeField" ||
      component.component === "EmailField" ||
      component.component === "TelField" ||
      component.component === "UrlField" ||
      component.component === "PasswordField" ||
      component.component === "RangeField" ||
      component.component === "CurrencyField" ||
      component.component === "NumberField" ||
      component.component === "DateField" ||
      component.component === "TextField"
    ) {
      input.classList.add("form-control");
    }
    if (component.placeholder && "placeholder" in input) {
      input.placeholder = component.placeholder;
    }
    if (component.style?.fontSize) {
      input.style.fontSize = `${component.style.fontSize}px`;
    }
    if (component.style?.color) {
      input.style.color = component.style.color;
    }
    if (component.style?.backgroundColor) {
      input.style.backgroundColor = component.style.backgroundColor;
    }
    if (component.style?.width) {
      input.style.width = normalizeSizeValue(component.style.width);
    }
    if (component.style?.height) {
      input.style.height = normalizeSizeValue(component.style.height);
    }

    const dataPath = component.value?.path;
    if (dataPath) {
      const existingValue = getValueByPath(surfaceState.dataModel, dataPath);
      if (
        component.component === "CheckboxField" ||
        component.component === "SwitchField"
      ) {
        input.checked = Boolean(existingValue);
      } else if (component.component === "MultiSelect") {
        const selectedValues = Array.isArray(existingValue)
          ? existingValue
          : [];
        Array.from(input.options).forEach((option) => {
          option.selected = selectedValues.includes(option.value);
        });
      } else if (component.component !== "FileField") {
        input.value = existingValue ?? "";
      }
      const eventType =
        component.component === "Select" ||
        component.component === "MultiSelect" ||
        component.component === "FileField" ||
        component.component === "CheckboxField" ||
        component.component === "SwitchField"
          ? "change"
          : "input";
      input.addEventListener(eventType, (event) => {
        if (component.component === "FileField") {
          const files = Array.from(event.target.files || []);
          const fileSummaries = files.map((file) => ({
            name: file.name,
            size: file.size,
            type: file.type,
          }));
          setValueByPath(surfaceState.dataModel, dataPath, fileSummaries);
          return;
        }
        if (
          component.component === "CheckboxField" ||
          component.component === "SwitchField"
        ) {
          setValueByPath(
            surfaceState.dataModel,
            dataPath,
            event.target.checked
          );
          return;
        }
        if (component.component === "MultiSelect") {
          const selections = Array.from(event.target.selectedOptions).map(
            (option) => option.value
          );
          setValueByPath(surfaceState.dataModel, dataPath, selections);
          return;
        }
        const nextValue =
          component.component === "NumberField" ||
          component.component === "CurrencyField"
            ? Number(event.target.value || 0)
            : event.target.value;
        setValueByPath(surfaceState.dataModel, dataPath, nextValue);
      });
    }

    wrapper.appendChild(input);
    applyFieldDragProps(wrapper, component);
    attachComponentNode(component, wrapper);
    return wrapper;
  }

  function renderRangeField(component) {
    const wrapper = document.createElement("div");
    wrapper.className = "mb-3";

    const label = document.createElement("label");
    label.className = "form-label";
    label.textContent = component.label || "未設定";
    if (component.labelStyle?.fontSize) {
      label.style.fontSize = `${component.labelStyle.fontSize}px`;
    }
    if (component.labelStyle?.fontWeight) {
      label.style.fontWeight = String(component.labelStyle.fontWeight);
    }
    if (component.labelStyle?.color) {
      label.style.color = component.labelStyle.color;
    }
    wrapper.appendChild(label);

    const row = document.createElement("div");
    row.className = "d-flex align-items-center gap-3";

    const rangeInput = document.createElement("input");
    rangeInput.type = "range";
    rangeInput.className = "form-range";

    const numberInput = document.createElement("input");
    numberInput.type = "number";
    numberInput.className = "form-control";
    numberInput.style.maxWidth = "120px";

    const valueText = document.createElement("span");
    valueText.className = "text-muted";

    const dataPath = component.value?.path;
    const currentValue = dataPath
      ? getValueByPath(surfaceState.dataModel, dataPath)
      : 0;
    const initialValue = Number(currentValue || 0);
    rangeInput.value = initialValue;
    numberInput.value = initialValue;
    valueText.textContent = `${initialValue}`;

    const updateValue = (value) => {
      const nextValue = Number(value || 0);
      rangeInput.value = nextValue;
      numberInput.value = nextValue;
      valueText.textContent = `${nextValue}`;
      if (dataPath) {
        setValueByPath(surfaceState.dataModel, dataPath, nextValue);
      }
    };

    rangeInput.addEventListener("input", (event) => {
      updateValue(event.target.value);
    });
    numberInput.addEventListener("input", (event) => {
      updateValue(event.target.value);
    });

    row.appendChild(rangeInput);
    row.appendChild(numberInput);
    row.appendChild(valueText);
    wrapper.appendChild(row);
    applyFieldDragProps(wrapper, component);
    attachComponentNode(component, wrapper);
    return wrapper;
  }

  function renderRadioGroup(component) {
    const wrapper = document.createElement("div");
    wrapper.className = "mb-3";

    const label = document.createElement("label");
    label.className = "form-label";
    label.textContent = component.label || "未設定";
    wrapper.appendChild(label);

    const group = document.createElement("div");
    const dataPath = component.value?.path;
    const selectedValue = dataPath
      ? getValueByPath(surfaceState.dataModel, dataPath)
      : null;

    (component.options || []).forEach((option) => {
      const optionWrapper = document.createElement("div");
      optionWrapper.className = "form-check me-3";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = component.id;
      radio.value = option.value;
      radio.className = "form-check-input";
      radio.checked = option.value === selectedValue;

      const text = document.createElement("label");
      text.className = "form-check-label";
      text.textContent = option.label;

      radio.addEventListener("change", () => {
        if (dataPath) {
          setValueByPath(surfaceState.dataModel, dataPath, radio.value);
        }
      });

      optionWrapper.appendChild(radio);
      optionWrapper.appendChild(text);
      group.appendChild(optionWrapper);
    });

    wrapper.appendChild(group);
    applyFieldDragProps(wrapper, component);
    attachComponentNode(component, wrapper);
    return wrapper;
  }

  function renderCheckbox(component, isSwitch) {
    const wrapper = document.createElement("div");
    wrapper.className = isSwitch
      ? "form-check form-switch mb-3"
      : "form-check mb-3";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "form-check-input";

    const label = document.createElement("label");
    label.className = "form-check-label";
    label.textContent = component.label || "未設定";
    if (component.labelStyle?.fontSize) {
      label.style.fontSize = `${component.labelStyle.fontSize}px`;
    }
    if (component.labelStyle?.fontWeight) {
      label.style.fontWeight = String(component.labelStyle.fontWeight);
    }
    if (component.labelStyle?.color) {
      label.style.color = component.labelStyle.color;
    }

    const dataPath = component.value?.path;
    if (dataPath) {
      const existingValue = getValueByPath(surfaceState.dataModel, dataPath);
      input.checked = Boolean(existingValue);
      input.addEventListener("change", (event) => {
        setValueByPath(surfaceState.dataModel, dataPath, event.target.checked);
      });
    }

    wrapper.appendChild(input);
    wrapper.appendChild(label);
    applyFieldDragProps(wrapper, component);
    attachComponentNode(component, wrapper);
    return wrapper;
  }

  function renderButton(component) {
    const wrapper = document.createElement("div");
    wrapper.className = "align-self-start";

    const button = document.createElement("button");
    button.className = "btn btn-primary";
    const labelComponent = surfaceState.components.get(component.child);
    button.textContent = labelComponent?.text || "送信";
    if (component.style?.fontSize) {
      button.style.fontSize = `${component.style.fontSize}px`;
    }
    if (component.style?.color) {
      button.style.color = component.style.color;
    }
    if (component.style?.backgroundColor) {
      button.style.backgroundColor = component.style.backgroundColor;
      button.style.borderColor = component.style.backgroundColor;
    }
    if (component.style?.width) {
      button.style.width = normalizeSizeValue(component.style.width);
    }
    if (component.style?.height) {
      button.style.height = normalizeSizeValue(component.style.height);
    }

    button.addEventListener("click", () => {
      if (suppressButtonSubmit) {
        suppressButtonSubmit = false;
        return;
      }
      const context = {};
      if (component.action?.context) {
        Object.entries(component.action.context).forEach(([key, value]) => {
          if (value?.path) {
            context[key] = getValueByPath(surfaceState.dataModel, value.path);
          }
        });
      }
      if (isSearchMode) {
        const results = filterSearchResults(context);
        renderSearchResults(results);
        return;
      }
      saveSubmission(context);
      console.log("submit_form", {
        action: component.action?.name || "submit_form",
        context,
      });
      const fields = currentFormSpec?.fields || [];
      fields.forEach((field) => {
        const path = `/form/${field.id}`;
        let value = "";
        if (numericFieldTypes.has(field.type)) {
          value = 0;
        } else if (field.type === "file" || field.type === "multiselect") {
          value = [];
        } else if (field.type === "checkbox" || field.type === "switch") {
          value = false;
        }
        setValueByPath(surfaceState.dataModel, path, value);
      });
      renderMessages(buildA2uiMessages(currentFormSpec));
    });
    wrapper.addEventListener(
      "click",
      () => {
        suppressButtonSubmit = true;
      },
      true
    );
    wrapper.appendChild(button);
    attachComponentNode(component, wrapper);
    return wrapper;
  }

  function applyFieldDragProps(wrapper, component) {
    if (!component?.fieldId) {
      return;
    }
    wrapper.dataset.fieldId = component.fieldId;
    wrapper.draggable = true;
    wrapper.classList.add("field-draggable");
  }

  function applyFontClass() {
    if (!formSurface) {
      return;
    }
    formSurface.classList.remove(
      "font-system",
      "font-sans",
      "font-serif",
      "font-mono",
      "font-rounded"
    );
    formSurface.classList.add(`font-${activeFont}`);
  }

  function renderUnsupported(component) {
    const container = document.createElement("div");
    container.className = "unsupported";
    container.textContent = `Unsupported component: ${component.component}`;
    return container;
  }

  function getValueByPath(target, path) {
    if (!path || path === "/") {
      return target;
    }
    const segments = path.replace(/^\//, "").split("/");
    let current = target;
    for (const segment of segments) {
      if (current == null) {
        return undefined;
      }
      current = current[segment];
    }
    return current;
  }

  function setValueByPath(target, path, value) {
    if (!path || path === "/") {
      return;
    }
    const segments = path.replace(/^\//, "").split("/");
    let current = target;
    segments.forEach((segment, index) => {
      if (index === segments.length - 1) {
        current[segment] = value;
        return;
      }
      if (!current[segment]) {
        current[segment] = {};
      }
      current = current[segment];
    });
  }

  let requestId = 0;

  function setLoading(isLoading) {
    if (formSpinner) {
      formSpinner.classList.toggle("is-active", isLoading);
    }
    if (formSurface) {
      formSurface.classList.toggle("is-hidden", isLoading);
    }
    if (searchResults) {
      searchResults.classList.toggle("d-none", isLoading || !isSearchMode);
    }
  }

  async function handleGenerate() {
    const promptText = promptInput.value;
    const currentRequest = ++requestId;
    const fallbackSpec = matchPreset(promptText);
    setLoading(true);
    try {
      const resolvedSpec = await resolveFormSpec(promptText, fallbackSpec);
      if (currentRequest !== requestId) {
        return;
      }
      const formSpec = applyPromptOverrides(resolvedSpec, promptText);
      currentFormSpec = formSpec;
      if (loadedFormSpec) {
        loadedFormSpec = formSpec;
      }
      isSearchMode = detectSearchMode(promptText, formSpec);
      mockSearchData = isSearchMode ? buildMockSearchData(formSpec) : [];
      const messages = buildA2uiMessages(formSpec);
      renderMessages(messages);
      renderSearchResults([]);
      initDragAndDrop();
      ensureSampleSubmissions();
    } finally {
      if (currentRequest === requestId) {
        setLoading(false);
      }
    }
    promptInput.value = "";
  }

  let isComposing = false;

  function handlePromptCompositionStart() {
    isComposing = true;
  }

  function handlePromptCompositionEnd() {
    isComposing = false;
  }

  function handlePromptKeydown(event) {
    if (event.key === "Enter" && !event.shiftKey && !isComposing) {
      event.preventDefault();
      handleGenerate();
    }
  }

  function handleSaveOverwriteClick() {
    saveCurrentForm("overwrite");
  }

  function handleDeleteFormClick() {
    if (!loadedFormId) {
      return;
    }
    if (window.confirm("読み込んだフォームを削除しますか？")) {
      const name = loadedFormName || currentFormSpec?.title;
      deleteSavedForm(loadedFormId);
      if (name) {
        deleteSubmissionsForForm(name);
      }
    }
  }

  function handleSaveAsClick() {
    saveCurrentForm("saveAs");
  }

  function handleSaveNewClick() {
    saveCurrentForm("saveAs");
  }

  function handleNewFormClick() {
    resetForm();
  }

  function handleSidebarLinkClick() {
    cleanupUnsavedFormData();
  }

  function handleSubmissionSearchInput() {
    scheduleSubmissionRefresh();
  }

  function handleRefreshSubmissionsClick() {
    loadSubmissions();
  }

  function handleFontSelectChange() {
    activeFont = fontSelect?.value || "system";
    applyFontClass();
  }

  function bindEvents() {
    bindEventOnce(
      promptInput,
      "compositionstart",
      handlePromptCompositionStart
    );
    bindEventOnce(promptInput, "compositionend", handlePromptCompositionEnd);
    bindEventOnce(promptInput, "keydown", handlePromptKeydown);
    bindEventOnce(generateButton, "click", handleGenerate);
    bindEventOnce(saveOverwriteButton, "click", handleSaveOverwriteClick);
    bindEventOnce(deleteFormButton, "click", handleDeleteFormClick);
    bindEventOnce(saveAsButton, "click", handleSaveAsClick);
    bindEventOnce(saveNewButton, "click", handleSaveNewClick);
    bindEventOnce(newFormButton, "click", handleNewFormClick);
    bindEventOnce(formSurface, "click", clearSelectedComponent);
    if (sidebarLinks.length > 0) {
      sidebarLinks.forEach((link) => {
        bindEventOnce(link, "click", handleSidebarLinkClick);
      });
    }
    bindEventOnce(submissionSearch, "input", handleSubmissionSearchInput);
    bindEventOnce(refreshSubmissions, "click", handleRefreshSubmissionsClick);
    bindEventOnce(fontSelect, "change", handleFontSelectChange);
  }

  function initApp() {
    bindElements();
    if (!formSurface) {
      return;
    }
    bindEvents();
    updateSaveButtons();
    renderSavedForms();
    loadSubmissions();
    if (promptInput) {
      promptInput.value = "";
    }
  }

  window.A2UI_APP = window.A2UI_APP || {};
  window.A2UI_APP.init = initApp;

  initApp();
}

const promptInput = document.getElementById("promptInput");
const generateButton = document.getElementById("generateButton");
const formSurface = document.getElementById("formSurface");
const formSpinner = document.getElementById("formSpinner");
const searchResults = document.getElementById("searchResults");
const searchResultCount = document.getElementById("searchResultCount");
const searchResultHeader = document.getElementById("searchResultHeader");
const searchResultBody = document.getElementById("searchResultBody");
const newFormButton = document.getElementById("newFormButton");
const saveOverwriteButton = document.getElementById("saveOverwriteButton");
const deleteFormButton = document.getElementById("deleteFormButton");
const saveAsButton = document.getElementById("saveAsButton");
const saveNewButton = document.getElementById("saveNewButton");
const savedFormList = document.getElementById("savedFormList");
const savedFormCount = document.getElementById("savedFormCount");
const submissionCount = document.getElementById("submissionCount");
const submissionSearch = document.getElementById("submissionSearch");
const submissionBody = document.getElementById("submissionBody");
const refreshSubmissions = document.getElementById("refreshSubmissions");
const fontSelect = document.getElementById("fontSelect");
const sidebarLinks = document.querySelectorAll(".app-sidebar .nav-link");
const { apiUrl, apiBase, model } = window.APP_CONFIG || {};
const apiUrlInput = { value: apiUrl || "http://localhost:8787/api/openai" };
const apiBaseUrl = apiBase || "";
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
    highlights.forEach((element) => element.classList.remove("is-drop-target"));
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
    highlights.forEach((element) => element.classList.remove("is-drop-target"));
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
    highlights.forEach((element) => element.classList.remove("is-drop-target"));
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
  loadSubmissions();
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
      `${apiBaseUrl}/api/submissions?formName=${encodeURIComponent(formName)}`,
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

    const createSamples = async (count, startIndex) => {
      const samples = buildSampleSubmissionData(
        currentFormSpec,
        count,
        startIndex
      ).map((sample) => ({
        id: `sample_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
        formName,
        formSpec: currentFormSpec,
        data: sample,
      }));
      const response = await fetch(`${apiBaseUrl}/api/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: samples }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    };

    let existing = await fetchItems();
    if (existing.length >= targetCount) {
      return;
    }
    await createSamples(targetCount - existing.length, existing.length);
    loadSubmissions();

    existing = await fetchItems();
    if (existing.length < targetCount) {
      await createSamples(targetCount - existing.length, existing.length);
      loadSubmissions();
    }
  } catch (error) {
    console.error("sample_submission_failed", error);
  }
}

function renderSearchResults(items) {
  if (
    !searchResults ||
    !searchResultHeader ||
    !searchResultBody ||
    !searchResultCount
  ) {
    return;
  }

  if (!isSearchMode) {
    searchResults.classList.add("d-none");
    return;
  }

  searchResults.classList.remove("d-none");
  searchResultHeader.innerHTML = "";
  searchResultBody.innerHTML = "";
  searchResultCount.textContent = `${items.length}件`;

  const fields = currentFormSpec?.fields || [];
  if (fields.length === 0) {
    return;
  }

  const headFragment = document.createDocumentFragment();
  fields.forEach((field) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = field.label || field.id;
    headFragment.appendChild(th);
  });
  searchResultHeader.appendChild(headFragment);

  if (items.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = fields.length;
    cell.className = "text-muted";
    cell.textContent = "該当する結果がありません";
    row.appendChild(cell);
    searchResultBody.appendChild(row);
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("tr");
    fields.forEach((field) => {
      const cell = document.createElement("td");
      cell.textContent = formatResultValue(item[field.id]);
      row.appendChild(cell);
    });
    searchResultBody.appendChild(row);
  });
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

function matchesSearch(text, keyword) {
  if (!keyword) {
    return true;
  }
  return text.toLowerCase().includes(keyword.toLowerCase());
}

function renderSubmissionRows(items) {
  if (!submissionBody || !submissionCount) {
    return;
  }
  submissionBody.innerHTML = "";
  submissionCount.textContent = `${items.length}件`;

  if (items.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.className = "text-muted";
    cell.textContent = "送信データがありません";
    row.appendChild(cell);
    submissionBody.appendChild(row);
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("tr");
    const dateCell = document.createElement("td");
    dateCell.textContent = formatDateTime(item.createdAt);
    const dataCell = document.createElement("td");
    dataCell.textContent = formatJson(item.data);
    row.appendChild(dateCell);
    row.appendChild(dataCell);
    submissionBody.appendChild(row);
  });
}

async function loadSubmissions() {
  if (!submissionBody) {
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

      const normalizedField = { id, label, type };
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
  });

  formSpec.fields.forEach((field, index) => {
    const fieldId = `field_${index}`;
    const fieldPath = `/form/${field.id}`;
    children.push(fieldId);
    dataModel[field.id] = numericFieldTypes.has(field.type)
      ? isSearchMode
        ? ""
        : 0
      : field.type === "file" || field.type === "multiselect"
      ? []
      : field.type === "checkbox" || field.type === "switch"
      ? false
      : "";

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
  return container;
}

function renderText(component) {
  const text = document.createElement("div");
  text.className = "fw-semibold";
  text.textContent = component.text || "";
  if (component.style?.fontSize) {
    text.style.fontSize = `${component.style.fontSize}px`;
  }
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

  const dataPath = component.value?.path;
  if (dataPath) {
    const existingValue = getValueByPath(surfaceState.dataModel, dataPath);
    if (
      component.component === "CheckboxField" ||
      component.component === "SwitchField"
    ) {
      input.checked = Boolean(existingValue);
    } else if (component.component === "MultiSelect") {
      const selectedValues = Array.isArray(existingValue) ? existingValue : [];
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
        setValueByPath(surfaceState.dataModel, dataPath, event.target.checked);
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
  return wrapper;
}

function renderRangeField(component) {
  const wrapper = document.createElement("div");
  wrapper.className = "mb-3";

  const label = document.createElement("label");
  label.className = "form-label";
  label.textContent = component.label || "未設定";
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
  return wrapper;
}

function renderButton(component) {
  const button = document.createElement("button");
  button.className = "btn btn-primary align-self-start";
  const labelComponent = surfaceState.components.get(component.child);
  button.textContent = labelComponent?.text || "送信";

  button.addEventListener("click", () => {
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

  return button;
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
promptInput.addEventListener("compositionstart", () => {
  isComposing = true;
});
promptInput.addEventListener("compositionend", () => {
  isComposing = false;
});
promptInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !isComposing) {
    event.preventDefault();
    handleGenerate();
  }
});

if (generateButton) {
  generateButton.addEventListener("click", handleGenerate);
}
if (saveOverwriteButton) {
  saveOverwriteButton.addEventListener("click", () =>
    saveCurrentForm("overwrite")
  );
}
if (deleteFormButton) {
  deleteFormButton.addEventListener("click", () => {
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
  });
}
if (saveAsButton) {
  saveAsButton.addEventListener("click", () => saveCurrentForm("saveAs"));
}
if (saveNewButton) {
  saveNewButton.addEventListener("click", () => saveCurrentForm("saveAs"));
}
if (newFormButton) {
  newFormButton.addEventListener("click", resetForm);
}
if (sidebarLinks.length > 0) {
  sidebarLinks.forEach((link) => {
    link.addEventListener("click", () => {
      cleanupUnsavedFormData();
    });
  });
}
if (submissionSearch) {
  submissionSearch.addEventListener("input", scheduleSubmissionRefresh);
}
if (refreshSubmissions) {
  refreshSubmissions.addEventListener("click", loadSubmissions);
}
if (fontSelect) {
  fontSelect.addEventListener("change", () => {
    activeFont = fontSelect.value || "system";
    applyFontClass();
  });
}

promptInput.value = "";
renderSavedForms();
loadSubmissions();
updateSaveButtons();

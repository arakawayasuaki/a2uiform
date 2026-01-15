const promptInput = document.getElementById("promptInput");
const generateButton = document.getElementById("generateButton");
const formSurface = document.getElementById("formSurface");
const loadingSpinner = document.getElementById("loadingSpinner");
const formSpinner = document.getElementById("formSpinner");
const { apiUrl, model } = window.APP_CONFIG || {};
const apiUrlInput = { value: apiUrl || "http://localhost:8787/api/openai" };
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
    '{ "title": string, "description": string, "fields": [',
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
          { role: "user", content: promptText },
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
    dataModel[field.id] =
      field.type === "number" ||
      field.type === "currency" ||
      field.type === "numberRange"
        ? 0
        : field.type === "file" || field.type === "multiselect"
        ? []
        : field.type === "checkbox" || field.type === "switch"
        ? false
        : "";

    const component = {
      id: fieldId,
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
  return text;
}

function renderInput(component) {
  if (component.component === "RadioGroup") {
    return renderRadioGroup(component);
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
  } else if (component.component === "RangeField") {
    input = document.createElement("input");
    input.type = "range";
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
        component.component === "CurrencyField" ||
        component.component === "RangeField"
          ? Number(event.target.value || 0)
          : event.target.value;
      setValueByPath(surfaceState.dataModel, dataPath, nextValue);
    });
  }

  wrapper.appendChild(input);
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
    console.log("submit_form", {
      action: component.action?.name || "submit_form",
      context,
    });
  });

  return button;
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
  if (loadingSpinner) {
    loadingSpinner.classList.toggle("is-active", isLoading);
  }
  if (formSpinner) {
    formSpinner.classList.toggle("is-active", isLoading);
  }
  if (formSurface) {
    formSurface.classList.toggle("is-hidden", isLoading);
  }
}

async function handleGenerate() {
  const promptText = promptInput.value;
  const currentRequest = ++requestId;
  const fallbackSpec = matchPreset(promptText);
  setLoading(true);
  try {
    const formSpec = await resolveFormSpec(promptText, fallbackSpec);
    if (currentRequest !== requestId) {
      return;
    }
    const messages = buildA2uiMessages(formSpec);
    renderMessages(messages);
  } finally {
    if (currentRequest === requestId) {
      setLoading(false);
    }
  }
}

generateButton.addEventListener("click", handleGenerate);
generateButton.classList.add("btn", "btn-primary");

promptInput.value = "経費精算システム用のフォームを作って";
handleGenerate();

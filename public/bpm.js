(() => {
  if (window.__A2UI_BPM_INITIALIZED__) {
    return;
  }
  window.__A2UI_BPM_INITIALIZED__ = true;

  const { apiBase } = window.APP_CONFIG || {};
  const apiBaseUrl = apiBase || "";

  let promptInput = null;
  let promptInputEl = null;
  let generateButton = null;
  let statusLabel = null;
  let canvas = null;
  let viewer = null;
  let resultCard = null;
  let resultMaximize = null;
  let resultReset = null;
  let saveButton = null;
  let savedList = null;
  let promptTitle = null;
  let currentXml = "";
  let lastPrompt = "";
  let savedFlows = [];
  const STORAGE_KEY = "bpm_saved_flows";

  function bindElements() {
    promptInput = document.getElementById("bpmPromptInput");
    promptInputEl =
      promptInput?.tagName === "TEXTAREA"
        ? promptInput
        : promptInput?.querySelector?.("textarea");
    generateButton = document.getElementById("bpmGenerateButton");
    statusLabel = document.getElementById("bpmStatus");
    canvas = document.getElementById("bpmCanvas");
    resultCard = document.getElementById("bpmResultCard");
    resultMaximize = document.getElementById("bpmResultMaximize");
    resultReset = document.getElementById("bpmResultReset");
    saveButton = document.getElementById("bpmSaveButton");
    savedList = document.getElementById("bpmSavedList");
    promptTitle = document.getElementById("bpmPromptTitle");
    const samples = document.querySelectorAll("#bpmPromptSamples [data-prompt]");
    samples.forEach((button) => {
      button.addEventListener("click", () => {
        const prompt = button.getAttribute("data-prompt") || "";
        if (promptInputEl) {
          promptInputEl.value = prompt;
          promptInputEl.focus();
        }
      });
    });
  }

  function setStatus(message) {
    if (statusLabel) {
      statusLabel.textContent = message || "";
    }
  }

  function setResultVisible(visible) {
    if (!resultCard) {
      return;
    }
    resultCard.classList.toggle("is-hidden", !visible);
  }

  function setPromptMode(hasFlow) {
    if (!promptTitle || !promptInputEl) {
      return;
    }
    if (hasFlow) {
      promptTitle.textContent = "追加指示";
      promptInputEl.placeholder =
        "例: 差戻し時は起案者へ通知、承認後に完了メールを送る";
    } else {
      promptTitle.textContent = "生成指示";
      promptInputEl.placeholder =
        "例: 経費精算フォームを使って、申請→上長承認→経理承認→差戻し/承認完了のフローを作成";
    }
  }

  function ensureViewer() {
    if (!canvas) {
      console.warn("bpm_canvas_missing");
      return null;
    }
    if (viewer) {
      return viewer;
    }
    const BpmnConstructor = window.BpmnJS || window.BpmnModeler;
    console.info("bpm_constructor", {
      hasBpmnJS: !!window.BpmnJS,
      hasBpmnModeler: !!window.BpmnModeler,
    });
    if (!BpmnConstructor) {
      console.warn("bpm_viewer_missing");
      setStatus("BPMN表示ライブラリの読み込みに失敗しました。");
      return null;
    }
    viewer = new BpmnConstructor({ container: canvas });
    console.info("bpm_viewer_ready");
    return viewer;
  }

  function toggleMaximize() {
    if (!resultCard) {
      return;
    }
    resultCard.classList.toggle("is-maximized");
  }

  function resetCardPosition() {
    if (!resultCard) {
      return;
    }
    resultCard.classList.remove("is-maximized");
    resultCard.style.removeProperty("left");
    resultCard.style.removeProperty("right");
    resultCard.style.removeProperty("top");
    resultCard.style.removeProperty("bottom");
  }

  function loadSavedFlows() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      savedFlows = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("bpm_saved_load_failed", error);
      savedFlows = [];
    }
  }

  function persistSavedFlows() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedFlows));
    } catch (error) {
      console.warn("bpm_saved_store_failed", error);
    }
  }

  function getFormNameFromPrompt(text) {
    if (!text) {
      return "";
    }
    const match = String(text).match(/([\p{sc=Han}ぁ-んァ-ンA-Za-z0-9]+フォーム)/u);
    return match ? match[1] : "";
  }

  function getProcessName(xml) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, "text/xml");
      const process =
        doc.getElementsByTagNameNS("*", "process")[0] ||
        doc.getElementsByTagName("process")[0];
      const name = process?.getAttribute("name") || process?.getAttribute("id");
      return name || "無題フロー";
    } catch {
      return "無題フロー";
    }
  }

  function getFlowName(xml, prompt) {
    const promptForm = getFormNameFromPrompt(prompt);
    if (promptForm) {
      return promptForm;
    }
    const processName = getProcessName(xml);
    return processName || "無題フロー";
  }

  function renderSavedList() {
    if (!savedList) {
      return;
    }
    savedList.innerHTML = "";
    if (!savedFlows.length) {
      const empty = document.createElement("div");
      empty.className = "text-muted small";
      empty.textContent = "保存済みフローはありません。";
      savedList.appendChild(empty);
      return;
    }
    savedFlows.forEach((flow) => {
      const row = document.createElement("div");
      row.className = "d-flex align-items-center gap-2";
      const title = document.createElement("div");
      title.className = "flex-grow-1";
      title.textContent = flow.name || "無題フロー";
      const loadButton = document.createElement("button");
      loadButton.type = "button";
      loadButton.className = "btn btn-sm btn-outline-secondary";
      loadButton.textContent = "読み込み";
      loadButton.addEventListener("click", async () => {
        currentXml = flow.xml || "";
        setResultVisible(true);
        setPromptMode(true);
        await renderXml(currentXml);
      });
      row.appendChild(title);
      row.appendChild(loadButton);
      savedList.appendChild(row);
    });
  }

  function saveCurrentFlow() {
    if (!currentXml) {
      setStatus("保存するフローがありません。");
      return;
    }
    const name = getFlowName(currentXml, lastPrompt);
    const entry = {
      id: crypto?.randomUUID?.() || String(Date.now()),
      name,
      xml: currentXml,
      createdAt: new Date().toISOString(),
    };
    savedFlows.unshift(entry);
    savedFlows = savedFlows.slice(0, 20);
    persistSavedFlows();
    renderSavedList();
    setStatus("保存しました。");
  }

  function extractXml(text) {
    if (!text) {
      return "";
    }
    const trimmed = String(text).trim();
    const fenceMatch = trimmed.match(/```(?:xml)?\s*([\s\S]*?)```/i);
    if (fenceMatch && fenceMatch[1]) {
      return fenceMatch[1].trim();
    }
    const xmlMatch = trimmed.match(/<\?xml[\s\S]*<\/bpmn:definitions>/i);
    if (xmlMatch && xmlMatch[0]) {
      return xmlMatch[0].trim();
    }
    const definitionsMatch = trimmed.match(/<bpmn:definitions[\s\S]*<\/bpmn:definitions>/i);
    if (definitionsMatch && definitionsMatch[0]) {
      return definitionsMatch[0].trim();
    }
    return trimmed;
  }

  function ensureDiagram(xml) {
    if (!xml) {
      return xml;
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");
    if (doc.getElementsByTagName("parsererror").length > 0) {
      return xml;
    }
    const definitions = doc.documentElement;
    if (!definitions) {
      return xml;
    }
    const diNS = "http://www.omg.org/spec/DD/20100524/DI";
    const dcNS = "http://www.omg.org/spec/DD/20100524/DC";
    const bpmndiNS = "http://www.omg.org/spec/BPMN/20100524/DI";
    if (!definitions.getAttribute("xmlns:bpmndi")) {
      definitions.setAttribute("xmlns:bpmndi", bpmndiNS);
    }
    if (!definitions.getAttribute("xmlns:dc")) {
      definitions.setAttribute("xmlns:dc", dcNS);
    }
    if (!definitions.getAttribute("xmlns:di")) {
      definitions.setAttribute("xmlns:di", diNS);
    }
    const process =
      definitions.getElementsByTagNameNS("*", "process")[0] ||
      definitions.getElementsByTagName("process")[0];
    if (!process) {
      return xml;
    }
    const processId = process.getAttribute("id") || "Process_1";
    const flowNodes = [
      "startEvent",
      "task",
      "userTask",
      "serviceTask",
      "exclusiveGateway",
      "parallelGateway",
      "endEvent",
    ];
    const elements = flowNodes
      .flatMap((name) =>
        Array.from(process.getElementsByTagNameNS("*", name))
      )
      .filter(Boolean);
    const bpmndi =
      definitions.getElementsByTagNameNS("*", "BPMNDiagram")[0] ||
      doc.createElementNS(bpmndiNS, "bpmndi:BPMNDiagram");
    const plane =
      bpmndi.getElementsByTagNameNS("*", "BPMNPlane")[0] ||
      doc.createElementNS(bpmndiNS, "bpmndi:BPMNPlane");
    plane.setAttribute("bpmnElement", processId);
    if (!plane.getAttribute("id")) {
      plane.setAttribute("id", "BPMNPlane_1");
    }
    if (!bpmndi.contains(plane)) {
      bpmndi.appendChild(plane);
    }
    if (!definitions.contains(bpmndi)) {
      definitions.appendChild(bpmndi);
    }
    let x = 120;
    const y = 120;
    const step = 220;
    const existingShapes = new Set(
      Array.from(plane.getElementsByTagNameNS("*", "BPMNShape"))
        .map((shape) => shape.getAttribute("bpmnElement"))
        .filter(Boolean)
    );
    elements.forEach((element) => {
      const elementId = element.getAttribute("id");
      if (!elementId) {
        return;
      }
      if (existingShapes.has(elementId)) {
        return;
      }
      const shape = doc.createElementNS(bpmndiNS, "bpmndi:BPMNShape");
      shape.setAttribute("bpmnElement", elementId);
      const bounds = doc.createElementNS(dcNS, "dc:Bounds");
      bounds.setAttribute("x", String(x));
      bounds.setAttribute("y", String(y));
      bounds.setAttribute("width", "120");
      bounds.setAttribute("height", "80");
      shape.appendChild(bounds);
      plane.appendChild(shape);
      x += step;
    });
    const serializer = new XMLSerializer();
    return serializer.serializeToString(doc);
  }

  function rebuildDiagram(xml) {
    if (!xml) {
      return xml;
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");
    if (doc.getElementsByTagName("parsererror").length > 0) {
      return xml;
    }
    const definitions = doc.documentElement;
    if (!definitions) {
      return xml;
    }
    const diNS = "http://www.omg.org/spec/DD/20100524/DI";
    const dcNS = "http://www.omg.org/spec/DD/20100524/DC";
    const bpmndiNS = "http://www.omg.org/spec/BPMN/20100524/DI";
    if (!definitions.getAttribute("xmlns:bpmndi")) {
      definitions.setAttribute("xmlns:bpmndi", bpmndiNS);
    }
    if (!definitions.getAttribute("xmlns:dc")) {
      definitions.setAttribute("xmlns:dc", dcNS);
    }
    if (!definitions.getAttribute("xmlns:di")) {
      definitions.setAttribute("xmlns:di", diNS);
    }
    const process =
      definitions.getElementsByTagNameNS("*", "process")[0] ||
      definitions.getElementsByTagName("process")[0];
    if (!process) {
      return xml;
    }
    const processId = process.getAttribute("id") || "Process_1";
    Array.from(
      definitions.getElementsByTagNameNS("*", "BPMNDiagram")
    ).forEach((node) => {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    });
    const bpmndi = doc.createElementNS(bpmndiNS, "bpmndi:BPMNDiagram");
    const plane = doc.createElementNS(bpmndiNS, "bpmndi:BPMNPlane");
    plane.setAttribute("bpmnElement", processId);
    plane.setAttribute("id", "BPMNPlane_1");
    bpmndi.appendChild(plane);
    definitions.appendChild(bpmndi);

    const flowNodes = [
      "startEvent",
      "task",
      "userTask",
      "serviceTask",
      "exclusiveGateway",
      "parallelGateway",
      "endEvent",
    ];
    const elements = flowNodes
      .flatMap((name) =>
        Array.from(process.getElementsByTagNameNS("*", name))
      )
      .filter(Boolean);
    if (elements.length === 0) {
      return xml;
    }
    const xStart = 120;
    const yStart = 120;
    const xStep = 220;
    const yStep = 180;
    const maxPerRow = 4;
    const layout = new Map();
    const sizeFor = (element) => {
      switch (element.localName) {
        case "startEvent":
        case "endEvent":
          return { width: 36, height: 36 };
        case "exclusiveGateway":
        case "parallelGateway":
          return { width: 60, height: 60 };
        default:
          return { width: 140, height: 90 };
      }
    };
    elements.forEach((element, index) => {
      const elementId = element.getAttribute("id");
      if (!elementId) {
        return;
      }
      const row = Math.floor(index / maxPerRow);
      const col = index % maxPerRow;
      const x = xStart + col * xStep;
      const y = yStart + row * yStep;
      const size = sizeFor(element);
      const shape = doc.createElementNS(bpmndiNS, "bpmndi:BPMNShape");
      shape.setAttribute("bpmnElement", elementId);
      const bounds = doc.createElementNS(dcNS, "dc:Bounds");
      bounds.setAttribute("x", String(x));
      bounds.setAttribute("y", String(y));
      bounds.setAttribute("width", String(size.width));
      bounds.setAttribute("height", String(size.height));
      shape.appendChild(bounds);
      plane.appendChild(shape);
      layout.set(elementId, {
        x,
        y,
        width: size.width,
        height: size.height,
      });
    });
    const pickAnchor = (sourceBounds, targetBounds) => {
      const sourceCx = sourceBounds.x + sourceBounds.width / 2;
      const sourceCy = sourceBounds.y + sourceBounds.height / 2;
      const targetCx = targetBounds.x + targetBounds.width / 2;
      const targetCy = targetBounds.y + targetBounds.height / 2;
      const dx = targetCx - sourceCx;
      const dy = targetCy - sourceCy;
      if (Math.abs(dx) >= Math.abs(dy)) {
        return dx >= 0
          ? { x: sourceBounds.x + sourceBounds.width, y: sourceCy }
          : { x: sourceBounds.x, y: sourceCy };
      }
      return dy >= 0
        ? { x: sourceCx, y: sourceBounds.y + sourceBounds.height }
        : { x: sourceCx, y: sourceBounds.y };
    };
    const flows = Array.from(
      process.getElementsByTagNameNS("*", "sequenceFlow")
    );
    const outgoingMap = new Map();
    flows.forEach((flow) => {
      const sourceRef = flow.getAttribute("sourceRef");
      if (!sourceRef) {
        return;
      }
      if (!outgoingMap.has(sourceRef)) {
        outgoingMap.set(sourceRef, []);
      }
      outgoingMap.get(sourceRef).push(flow);
    });
    const buildWaypoints = (sourceAnchor, targetAnchor, offset) => {
      const dx = targetAnchor.x - sourceAnchor.x;
      const dy = targetAnchor.y - sourceAnchor.y;
      const waypoints = [sourceAnchor];
      if (Math.abs(dx) >= Math.abs(dy)) {
        const midX = sourceAnchor.x + dx / 2;
        waypoints.push({ x: midX, y: sourceAnchor.y + offset });
        waypoints.push({ x: midX, y: targetAnchor.y + offset });
      } else {
        const midY = sourceAnchor.y + dy / 2;
        waypoints.push({ x: sourceAnchor.x + offset, y: midY });
        waypoints.push({ x: targetAnchor.x + offset, y: midY });
      }
      waypoints.push(targetAnchor);
      return waypoints;
    };
    flows.forEach((flow) => {
      const flowId = flow.getAttribute("id");
      const sourceRef = flow.getAttribute("sourceRef");
      const targetRef = flow.getAttribute("targetRef");
      if (!flowId || !sourceRef || !targetRef) {
        return;
      }
      const sourceBounds = layout.get(sourceRef);
      const targetBounds = layout.get(targetRef);
      if (!sourceBounds || !targetBounds) {
        return;
      }
      const source = pickAnchor(sourceBounds, targetBounds);
      const target = pickAnchor(targetBounds, sourceBounds);
      const siblings = outgoingMap.get(sourceRef) || [];
      const index = siblings.indexOf(flow);
      const offset =
        siblings.length > 1 ? (index - (siblings.length - 1) / 2) * 30 : 0;
      const waypoints = buildWaypoints(source, target, offset);
      const edge = doc.createElementNS(bpmndiNS, "bpmndi:BPMNEdge");
      edge.setAttribute("bpmnElement", flowId);
      waypoints.forEach((point) => {
        const waypoint = doc.createElementNS(diNS, "di:waypoint");
        waypoint.setAttribute("x", String(point.x));
        waypoint.setAttribute("y", String(point.y));
        edge.appendChild(waypoint);
      });
      plane.appendChild(edge);
    });
    const serializer = new XMLSerializer();
    return serializer.serializeToString(doc);
  }

  function normalizeBpmnIds(xml) {
    if (!xml) {
      return xml;
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");
    if (doc.getElementsByTagName("parsererror").length > 0) {
      return xml;
    }
    const bpmnNS = "http://www.omg.org/spec/BPMN/20100524/MODEL";
    const idMap = new Map();
    const usedIds = new Set(
      Array.from(doc.querySelectorAll("[id]")).map((node) =>
        node.getAttribute("id")
      )
    );
    const counters = new Map();
    const shouldNormalize = (value) =>
      /[^A-Za-z0-9_\-:.]/.test(value) || /^[^A-Za-z_]/.test(value);
    const nextId = (prefix) => {
      const count = (counters.get(prefix) || 0) + 1;
      counters.set(prefix, count);
      let candidate = `${prefix}_${count}`;
      while (usedIds.has(candidate)) {
        const bumped = (counters.get(prefix) || 0) + 1;
        counters.set(prefix, bumped);
        candidate = `${prefix}_${bumped}`;
      }
      usedIds.add(candidate);
      return candidate;
    };
    const prefixFor = (element) => {
      switch (element.localName) {
        case "process":
          return "Process";
        case "startEvent":
          return "StartEvent";
        case "endEvent":
          return "EndEvent";
        case "task":
          return "Task";
        case "userTask":
          return "UserTask";
        case "serviceTask":
          return "ServiceTask";
        case "exclusiveGateway":
          return "ExclusiveGateway";
        case "parallelGateway":
          return "ParallelGateway";
        case "sequenceFlow":
          return "SequenceFlow";
        default:
          return "Element";
      }
    };
    Array.from(doc.querySelectorAll("[id]")).forEach((element) => {
      if (element.namespaceURI !== bpmnNS) {
        return;
      }
      const currentId = element.getAttribute("id");
      if (!currentId || !shouldNormalize(currentId)) {
        return;
      }
      const replacement = nextId(prefixFor(element));
      idMap.set(currentId, replacement);
      element.setAttribute("id", replacement);
    });
    if (idMap.size === 0) {
      return xml;
    }
    const refAttributes = ["sourceRef", "targetRef", "bpmnElement"];
    Array.from(doc.querySelectorAll("*")).forEach((element) => {
      refAttributes.forEach((attr) => {
        const value = element.getAttribute(attr);
        if (value && idMap.has(value)) {
          element.setAttribute(attr, idMap.get(value));
        }
      });
      if (element.localName === "incoming" || element.localName === "outgoing") {
        const ref = element.textContent?.trim();
        if (ref && idMap.has(ref)) {
          element.textContent = idMap.get(ref);
        }
      }
    });
    const serializer = new XMLSerializer();
    return serializer.serializeToString(doc);
  }

  function normalizeAllIds(xml) {
    if (!xml) {
      return xml;
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");
    if (doc.getElementsByTagName("parsererror").length > 0) {
      return xml;
    }
    const usedIds = new Set(
      Array.from(doc.querySelectorAll("[id]")).map((node) =>
        node.getAttribute("id")
      )
    );
    const counters = new Map();
    const shouldNormalize = (value) =>
      /[^A-Za-z0-9_\-:.]/.test(value) || /^[^A-Za-z_]/.test(value);
    const nextId = (prefix) => {
      const count = (counters.get(prefix) || 0) + 1;
      counters.set(prefix, count);
      let candidate = `${prefix}_${count}`;
      while (usedIds.has(candidate)) {
        const bumped = (counters.get(prefix) || 0) + 1;
        counters.set(prefix, bumped);
        candidate = `${prefix}_${bumped}`;
      }
      usedIds.add(candidate);
      return candidate;
    };
    const prefixFor = (element) => {
      switch (element.localName) {
        case "BPMNDiagram":
          return "BPMNDiagram";
        case "BPMNPlane":
          return "BPMNPlane";
        case "BPMNShape":
          return "BPMNShape";
        case "BPMNEdge":
          return "BPMNEdge";
        default:
          return element.localName ? element.localName : "Element";
      }
    };
    const idMap = new Map();
    Array.from(doc.querySelectorAll("[id]")).forEach((element) => {
      const currentId = element.getAttribute("id");
      if (!currentId || !shouldNormalize(currentId)) {
        return;
      }
      const replacement = nextId(prefixFor(element));
      idMap.set(currentId, replacement);
      element.setAttribute("id", replacement);
    });
    if (idMap.size === 0) {
      return xml;
    }
    const refAttributes = ["sourceRef", "targetRef", "bpmnElement"];
    Array.from(doc.querySelectorAll("*")).forEach((element) => {
      refAttributes.forEach((attr) => {
        const value = element.getAttribute(attr);
        if (value && idMap.has(value)) {
          element.setAttribute(attr, idMap.get(value));
        }
      });
      if (element.localName === "incoming" || element.localName === "outgoing") {
        const ref = element.textContent?.trim();
        if (ref && idMap.has(ref)) {
          element.textContent = idMap.get(ref);
        }
      }
    });
    const serializer = new XMLSerializer();
    return serializer.serializeToString(doc);
  }

  function ensureBpmnPrefix(xml) {
    if (!xml) {
      return xml;
    }
    const trimmed = String(xml).trim();
    if (trimmed.startsWith("<bpmn:definitions")) {
      return xml;
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");
    if (doc.getElementsByTagName("parsererror").length > 0) {
      return xml;
    }
    const definitions = doc.documentElement;
    if (!definitions) {
      return xml;
    }
    const bpmnNS = "http://www.omg.org/spec/BPMN/20100524/MODEL";
    if (definitions.namespaceURI !== bpmnNS) {
      return xml;
    }
    if (!definitions.getAttribute("xmlns:bpmn")) {
      definitions.setAttribute("xmlns:bpmn", bpmnNS);
    }
    if (typeof doc.renameNode !== "function") {
      return xml;
    }
    if (definitions.prefix !== "bpmn") {
      doc.renameNode(definitions, bpmnNS, "bpmn:definitions");
    }
    const elements = Array.from(doc.getElementsByTagName("*"));
    elements.forEach((element) => {
      if (element.namespaceURI !== bpmnNS) {
        return;
      }
      if (element.prefix === "bpmn") {
        return;
      }
      doc.renameNode(element, bpmnNS, `bpmn:${element.localName}`);
    });
    const serializer = new XMLSerializer();
    return serializer.serializeToString(doc);
  }

  async function autoLayoutXml(xml) {
    if (!xml) {
      return xml;
    }
    try {
      const module = await import(
        "https://cdn.jsdelivr.net/npm/bpmn-auto-layout@1.0.1/dist/index.js"
      );
      if (typeof module?.layoutProcess !== "function") {
        return xml;
      }
      return await module.layoutProcess(xml);
    } catch (error) {
      console.warn("bpm_auto_layout_failed", error);
      return xml;
    }
  }

  function ensureEdges(xml) {
    if (!xml) {
      return xml;
    }
    if (/BPMNEdge/.test(xml)) {
      return xml;
    }
    return rebuildDiagram(xml);
  }

  function adjustCanvasSize(canvasApi) {
    if (!canvas || !canvasApi) {
      return;
    }
    try {
      const viewbox = canvasApi.viewbox();
      if (
        !viewbox ||
        !Number.isFinite(viewbox.height) ||
        !Number.isFinite(viewbox.width) ||
        viewbox.height <= 0 ||
        viewbox.width <= 0
      ) {
        return;
      }
      const height = Math.max(
        300,
        Math.min(520, Math.ceil(viewbox.height + 60))
      );
      canvas.style.height = `${height}px`;
      canvas.style.minHeight = `${height}px`;
    } catch (error) {
      console.warn("bpm_viewbox_failed", error);
    }
  }

  function fitViewport(canvasApi) {
    if (!canvasApi) {
      return;
    }
    try {
      const viewbox = canvasApi.viewbox();
      if (
        !viewbox ||
        !Number.isFinite(viewbox.height) ||
        !Number.isFinite(viewbox.width) ||
        viewbox.height <= 0 ||
        viewbox.width <= 0
      ) {
        return;
      }
      canvasApi.zoom("fit-viewport", "auto");
    } catch (error) {
      console.warn("bpm_zoom_failed", error);
    }
  }

  async function renderXml(xml, fallbackXmls = []) {
    const instance = ensureViewer();
    if (!instance) {
      console.warn("bpm_render_skipped");
      return;
    }
    try {
      const preparedXml = ensureEdges(ensureDiagram(normalizeAllIds(xml)));
      console.log("bpm_xml", preparedXml);
      const result = await instance.importXML(preparedXml);
      if (result?.warnings?.length) {
        console.warn(
          "bpm_import_warnings",
          result.warnings.map((warning) => warning?.message || warning)
        );
      }
      const canvasApi = instance.get("canvas");
      requestAnimationFrame(() => {
        fitViewport(canvasApi);
        adjustCanvasSize(canvasApi);
      });
      const registry = instance.get("elementRegistry");
      const elements = registry?.getAll?.() || [];
      if (!elements.length && fallbackXmls.length) {
        console.warn("bpm_empty_diagram_retry");
        for (const candidate of fallbackXmls) {
          try {
            const preparedFallback = ensureEdges(
              ensureDiagram(normalizeAllIds(candidate))
            );
            console.warn("bpm_xml_fallback", preparedFallback);
            await instance.importXML(preparedFallback);
            const retryCanvas = instance.get("canvas");
            fitViewport(retryCanvas);
            adjustCanvasSize(retryCanvas);
            setStatus("生成完了");
            return;
          } catch (retryError) {
            console.error("bpm_import_retry_failed", retryError);
          }
        }
      }
      currentXml = preparedXml;
      setResultVisible(true);
      setPromptMode(true);
      setStatus("生成完了");
    } catch (error) {
      const message = error?.message || String(error || "");
      const fallbackList = fallbackXmls
        .filter(Boolean)
        .filter((candidate, index, list) => list.indexOf(candidate) === index);
      if (message.includes("no diagram to display")) {
        const rebuiltXml = rebuildDiagram(xml);
        if (rebuiltXml && rebuiltXml !== xml) {
          fallbackList.unshift(rebuiltXml);
        }
      }
      for (const candidate of fallbackList) {
        try {
          const preparedFallback = ensureEdges(
            ensureDiagram(normalizeAllIds(candidate))
          );
          console.warn("bpm_xml_fallback", preparedFallback);
          await instance.importXML(preparedFallback);
          const canvasApi = instance.get("canvas");
          fitViewport(canvasApi);
          adjustCanvasSize(canvasApi);
          currentXml = preparedFallback;
          setResultVisible(true);
          setPromptMode(true);
          setStatus("生成完了");
          return;
        } catch (retryError) {
          console.error("bpm_import_retry_failed", retryError);
        }
      }
      console.error("bpm_import_failed", error);
      setStatus("BPMNの描画に失敗しました。");
    }
  }

  async function handleGenerate() {
    if (!promptInputEl) {
      console.warn("bpm_prompt_missing");
      return;
    }
    const prompt = promptInputEl.value.trim();
    if (!prompt) {
      setStatus("プロンプトを入力してください。");
      return;
    }
    lastPrompt = prompt;
    console.info("bpm_generate_start");
    setStatus("AI解析中...");
    if (!currentXml) {
      setResultVisible(false);
    }
    if (generateButton) {
      generateButton.setAttribute("disabled", "true");
    }
    try {
      const hasExistingFlow = Boolean(currentXml);
      const userContent = hasExistingFlow
        ? `以下のBPMNを、指示に従って更新してください。\n\n# 既存BPMN\n${currentXml}\n\n# 指示\n${prompt}`
        : prompt;
      const response = await fetch(`${apiBaseUrl}/api/openai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: window.APP_CONFIG?.model || "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "あなたはBPMN 2.0の専門家です。BPMN 2.0 XMLのみを返してください。説明文やコードフェンスは禁止です。ユーザーが指定するフォーム名を日本語のままプロセス名に含め、各要素のラベルも日本語で記述してください。必ず <bpmndi:BPMNDiagram> と <bpmndi:BPMNPlane> を含め、要素が重ならないように十分な間隔で配置してください。",
            },
            {
              role: "user",
              content: userContent,
            },
          ],
          temperature: 0.2,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      console.info("bpm_generate_response", data?.choices?.length || 0);
      const content =
        data?.choices?.[0]?.message?.content ?? data?.output_text ?? "";
      console.info("bpm_generate_content", content?.slice?.(0, 120) || "");
      const rawXml = extractXml(content);
      console.info("bpm_generate_raw_xml", rawXml?.slice?.(0, 120) || "");
      const normalizedXml = normalizeBpmnIds(rawXml);
      const prefixedXml = ensureBpmnPrefix(normalizedXml);
      const layoutedXml = await autoLayoutXml(prefixedXml);
      const xml = ensureEdges(ensureDiagram(normalizeAllIds(layoutedXml)));
      if (!xml || !xml.includes("definitions")) {
        throw new Error("BPMN XMLの抽出に失敗しました。");
      }
      console.info("bpm_generate_render");
      await renderXml(xml, [
        ensureEdges(ensureDiagram(normalizeAllIds(prefixedXml))),
        rebuildDiagram(normalizeAllIds(prefixedXml)),
        ensureEdges(ensureDiagram(normalizeAllIds(rawXml))),
        rebuildDiagram(normalizeAllIds(rawXml)),
      ]);
    } catch (error) {
      console.error("bpm_generate_failed", error);
      setStatus("生成に失敗しました。内容を短くして再試行してください。");
    } finally {
      if (generateButton) {
        generateButton.removeAttribute("disabled");
      }
    }
  }

  function bindEvents() {
    if (generateButton) {
      generateButton.addEventListener("click", handleGenerate);
    }
    if (resultMaximize) {
      resultMaximize.addEventListener("click", toggleMaximize);
    }
    if (resultReset) {
      resultReset.addEventListener("click", resetCardPosition);
    }
    if (saveButton) {
      saveButton.addEventListener("click", saveCurrentFlow);
    }
    if (promptInputEl) {
      promptInputEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          handleGenerate();
        }
      });
    }
  }

  function init() {
    bindElements();
    if (!promptInputEl) {
      return;
    }
    console.info("bpm_init");
    bindEvents();
    ensureViewer();
    setResultVisible(false);
    setPromptMode(false);
    loadSavedFlows();
    renderSavedList();
  }

  init();
})();

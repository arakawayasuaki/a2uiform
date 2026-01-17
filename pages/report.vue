<template>
  <div class="app-shell">
    <aside class="app-sidebar">
      <div class="app-sidebar__title">メニュー</div>
      <nav class="nav flex-column">
        <NuxtLink class="nav-link" exact-active-class="active" to="/">
          ページ作成
        </NuxtLink>
        <NuxtLink class="nav-link" exact-active-class="active" to="/report">
          帳票作成
        </NuxtLink>
      </nav>
    </aside>
    <div class="app-content">
      <div class="container py-4">
        <header class="mb-4">
          <h1 class="h3 mb-2">帳票作成</h1>
          <p class="text-muted mb-0">
            登録済みデータをフォーム別に集計します。
          </p>
        </header>
        <UCard class="shadow-sm">
          <div class="row g-3 align-items-end mb-3 flex-lg-nowrap">
            <div class="col-12 col-lg">
              <label class="form-label" for="reportFormSelect"
                >フォームを選択</label
              >
              <USelectMenu
                v-model="formValue"
                :items="formItems"
                value-key="value"
                label-key="label"
                class="w-100"
              />
              <select id="reportFormSelect" class="d-none"></select>
            </div>
            <div class="col-12 col-lg">
              <label class="form-label" for="reportColumnSelect"
                >横軸カラム</label
              >
              <USelectMenu
                v-model="columnValue"
                :items="columnItems"
                value-key="value"
                label-key="label"
                class="w-100"
              />
              <select id="reportColumnSelect" class="d-none"></select>
            </div>
            <div class="col-12 col-lg">
              <label class="form-label" for="reportMetricSelect"
                >縦軸カラム</label
              >
              <USelectMenu
                v-model="metricValue"
                :items="metricItems"
                value-key="value"
                label-key="label"
                class="w-100"
              />
              <select id="reportMetricSelect" class="d-none"></select>
            </div>
            <div class="col-12 col-lg">
              <label class="form-label" for="reportChartType">グラフ種別</label>
              <USelectMenu
                v-model="chartTypeValue"
                :items="chartTypeItems"
                value-key="value"
                label-key="label"
                class="w-100"
              />
              <select id="reportChartType" class="d-none">
                <option value="bar">棒グラフ</option>
                <option value="line">折れ線</option>
                <option value="pie">円グラフ</option>
              </select>
            </div>
            <div class="col-12 col-lg-auto">
              <div class="d-flex gap-2">
                <UButton
                  id="refreshReport"
                  variant="outline"
                  color="gray"
                  size="sm"
                >
                  更新
                </UButton>
                <UButton id="exportExcel" color="primary" size="sm">
                  Excel出力
                </UButton>
              </div>
            </div>
          </div>
          <div class="report-chart report-chart--compact">
            <canvas id="reportChart" height="100"></canvas>
          </div>
          <div id="reportSheet" class="report-sheet mt-4"></div>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup>
useHead({
  title: "帳票作成",
  link: [
    {
      rel: "stylesheet",
      href: "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css",
    },
    {
      rel: "stylesheet",
      href: "/styles.css",
    },
    {
      rel: "stylesheet",
      href: "https://cdn.jsdelivr.net/npm/jsuites@6.0.3/dist/jsuites.css",
    },
    {
      rel: "stylesheet",
      href: "https://cdn.jsdelivr.net/npm/jspreadsheet-ce@5.0.4/dist/jspreadsheet.css",
    },
  ],
  script: [
    {
      src: "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js",
      defer: true,
      body: true,
    },
    {
      src: "https://cdn.jsdelivr.net/npm/jsuites@6.0.3/dist/jsuites.js",
      defer: true,
      body: true,
    },
    {
      src: "https://cdn.jsdelivr.net/npm/jspreadsheet-ce@5.0.4/dist/index.js",
      defer: true,
      body: true,
    },
    {
      src: "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
      defer: true,
      body: true,
    },
    { src: "/app-config.js", defer: true, body: true },
    { src: "/report.js", defer: true, body: true },
  ],
});

const formItems = ref([]);
const columnItems = ref([]);
const metricItems = ref([]);
const chartTypeItems = [
  { label: "棒グラフ", value: "bar" },
  { label: "折れ線", value: "line" },
  { label: "円グラフ", value: "pie" },
];

const formValue = ref("");
const columnValue = ref("");
const metricValue = ref("");
const chartTypeValue = ref("bar");

function bindSelect(selectId, itemsRef, valueRef, fallbackValue = "") {
  const select = document.getElementById(selectId);
  if (!(select instanceof HTMLSelectElement)) {
    return;
  }
  const resolveValue = (value) => {
    if (value && typeof value === "object") {
      return value.value ?? "";
    }
    return value ?? "";
  };
  const syncOptions = () => {
    const nextItems = Array.from(select.options).map((option) => ({
      label: option.textContent || option.value,
      value: option.value,
    }));
    itemsRef.value = nextItems;
    if (select.value) {
      valueRef.value = select.value;
      return;
    }
    const nextValue = nextItems[0]?.value ?? fallbackValue;
    valueRef.value = nextValue;
  };
  syncOptions();
  const observer = new MutationObserver(syncOptions);
  observer.observe(select, { childList: true });
  select.addEventListener("change", () => {
    valueRef.value = select.value;
  });
  watch(
    valueRef,
    (next) => {
      const nextValue = resolveValue(next);
      if (nextValue === undefined || nextValue === null) {
        return;
      }
      select.value = String(nextValue);
      select.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { immediate: false }
  );
}

onMounted(() => {
  bindSelect("reportFormSelect", formItems, formValue);
  bindSelect("reportColumnSelect", columnItems, columnValue);
  bindSelect("reportMetricSelect", metricItems, metricValue);
  bindSelect("reportChartType", ref(chartTypeItems), chartTypeValue, "bar");
  if (typeof window !== "undefined") {
    const appWindow = window;
    const ensureReportScript = () =>
      new Promise((resolve) => {
        if (appWindow.A2UI_REPORT?.init) {
          resolve(true);
          return;
        }
        const existing = document.querySelector('script[src="/report.js"]');
        if (existing) {
          resolve(false);
          return;
        }
        const script = document.createElement("script");
        script.src = "/report.js";
        script.defer = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });

    const tryInit = async () => {
      await ensureReportScript();
      let tries = 0;
      const poll = () => {
        if (appWindow.A2UI_REPORT?.init) {
          appWindow.A2UI_REPORT.init();
          return;
        }
        tries += 1;
        if (tries < 20) {
          setTimeout(poll, 100);
        }
      };
      poll();
    };

    tryInit();
  }
});
</script>

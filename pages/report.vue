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
    <div class="app-content report-page">
      <div class="container py-4">
        <header class="report-hero">
          <div>
            <p class="report-kicker">Data Insights</p>
            <h1 class="report-title">帳票作成ダッシュボード</h1>
            <p class="report-subtitle">
              登録済みデータをフォーム別に集計し、可視化と一覧で確認します。
            </p>
          </div>
          <div class="report-actions"></div>
        </header>

        <section class="report-card report-prompt">
          <div class="report-card__header">
            <div>
              <h2 class="h5 mb-1">プロンプトで作成</h2>
              <p class="text-muted mb-0 small">
                例: 「売上フォームの月別推移を折れ線で、金額を縦軸に」
              </p>
            </div>
          </div>
          <div class="report-prompt__row">
            <input
              id="reportPromptInput"
              type="text"
              class="form-control"
              placeholder="例: 交通費フォームの申請日ごとの件数を棒グラフで"
            />
            <UButton id="reportPromptButton" color="primary"> 生成 </UButton>
          </div>
          <div
            id="reportPromptResult"
            class="report-prompt__result text-muted small"
          >
            プロンプトからフォーム・軸・グラフ種別を自動設定します。
          </div>
        </section>

        <section class="report-card report-tables">
          <div class="report-card__header">
            <div>
              <h2 class="h5 mb-1">参照可能なテーブル</h2>
              <p class="text-muted mb-0 small">
                保存済みフォームまたは投稿データから取得します。
              </p>
            </div>
          </div>
          <div id="reportTableList" class="report-table-list"></div>
        </section>

        <div class="d-none">
          <USelectMenu
            v-model="formValue"
            :items="formItems"
            value-key="value"
            label-key="label"
            class="w-100 report-select"
          />
          <select id="reportFormSelect" class="d-none"></select>
          <USelectMenu
            v-model="columnValue"
            :items="columnItems"
            value-key="value"
            label-key="label"
            class="w-100 report-select"
          />
          <select id="reportColumnSelect" class="d-none"></select>
          <USelectMenu
            v-model="metricValue"
            :items="metricItems"
            value-key="value"
            label-key="label"
            class="w-100 report-select"
          />
          <select id="reportMetricSelect" class="d-none"></select>
          <USelectMenu
            v-model="chartTypeValue"
            :items="chartTypeItems"
            value-key="value"
            label-key="label"
            class="w-100 report-select"
          />
          <select id="reportChartType" class="d-none">
            <option value="bar">棒グラフ</option>
            <option value="line">折れ線</option>
            <option value="pie">円グラフ</option>
          </select>
        </div>

        <div class="report-grid">
          <section class="report-card report-chart-card" id="reportChartCard">
            <div class="report-card__header report-card__handle">
              <h2 class="h5 mb-0">集計グラフ</h2>
              <div class="report-card__actions">
                <UButton
                  id="refreshReport"
                  variant="outline"
                  color="gray"
                  size="sm"
                  class="report-icon-button"
                  aria-label="更新"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M20 12a8 8 0 1 1-2.34-5.66l.88-.88H15V3h6v6h-2.46l-.92.92A10 10 0 1 0 22 12h-2z"
                    />
                  </svg>
                </UButton>
                <UButton
                  id="reportChartMaximize"
                  variant="outline"
                  color="gray"
                  size="sm"
                  class="report-icon-button report-maximize-button"
                  aria-label="最大化"
                >
                  <svg
                    class="report-icon--maximize"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 4h6v2H6v4H4V4zm10 0h6v6h-2V6h-4V4zM4 14h2v4h4v2H4v-6zm14 0h2v6h-6v-2h4v-4z"
                    />
                  </svg>
                  <svg
                    class="report-icon--restore"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M9 5H5v4h2V7h2V5zm10 0h-4v2h2v2h2V5zM5 15h2v2h2v2H5v-4zm14 0h-2v2h-2v2h4v-4z"
                    />
                  </svg>
                </UButton>
                <UButton
                  id="reportChartReset"
                  variant="outline"
                  color="gray"
                  size="sm"
                  class="report-icon-button"
                  aria-label="位置リセット"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M12 5v2.5l4-3.5-4-3.5V3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7z"
                    />
                  </svg>
                </UButton>
              </div>
            </div>
            <div class="report-chart report-chart--hero">
              <canvas id="reportChart" height="120"></canvas>
            </div>
          </section>
          <section class="report-card report-table-card" id="reportDataCard">
            <div class="report-card__header report-card__handle">
              <h2 class="h5 mb-0">集計テーブル</h2>
              <div class="report-card__actions">
                <UButton
                  id="refreshReportTable"
                  variant="outline"
                  color="gray"
                  size="sm"
                  class="report-icon-button"
                  aria-label="更新"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M20 12a8 8 0 1 1-2.34-5.66l.88-.88H15V3h6v6h-2.46l-.92.92A10 10 0 1 0 22 12h-2z"
                    />
                  </svg>
                </UButton>
                <UButton
                  id="reportTableMaximize"
                  variant="outline"
                  color="gray"
                  size="sm"
                  class="report-icon-button report-maximize-button"
                  aria-label="最大化"
                >
                  <svg
                    class="report-icon--maximize"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 4h6v2H6v4H4V4zm10 0h6v6h-2V6h-4V4zM4 14h2v4h4v2H4v-6zm14 0h2v6h-6v-2h4v-4z"
                    />
                  </svg>
                  <svg
                    class="report-icon--restore"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M9 5H5v4h2V7h2V5zm10 0h-4v2h2v2h2V5zM5 15h2v2h2v2H5v-4zm14 0h-2v2h-2v2h4v-4z"
                    />
                  </svg>
                </UButton>
                <UButton
                  id="reportTableReset"
                  variant="outline"
                  color="gray"
                  size="sm"
                  class="report-icon-button"
                  aria-label="位置リセット"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M12 5v2.5l4-3.5-4-3.5V3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7z"
                    />
                  </svg>
                </UButton>
              </div>
            </div>
            <div id="reportSheet" class="report-sheet"></div>
          </section>
        </div>
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

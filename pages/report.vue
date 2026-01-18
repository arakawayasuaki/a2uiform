<template>
  <div class="min-h-screen flex flex-col bg-gray-50" data-theme="light">
    <div class="flex flex-1">
      <!-- Sidebar -->
      <aside class="w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col p-4">
        <div class="font-bold text-lg mb-2 text-gray-900">メニュー</div>
        <p class="text-gray-500 text-xs mb-6">
          プロンプトでフォームを作成し、投稿データを帳票化してAI分析まで行えるダッシュボードです。
        </p>
        <nav class="space-y-1">
          <NuxtLink
            to="/"
            class="group flex flex-col px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-50 hover:text-gray-900"
            active-class="bg-gray-100 text-gray-900"
          >
            <span class="font-semibold">フォーム作成</span>
            <span class="text-xs text-gray-500 group-hover:text-gray-600">（入力UIを生成・編集）</span>
          </NuxtLink>
          <NuxtLink
            to="/report"
            class="group flex flex-col px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-50 hover:text-gray-900"
            active-class="bg-gray-100 text-gray-900"
          >
            <span class="font-semibold">帳票分析</span>
            <span class="text-xs text-gray-500 group-hover:text-gray-600">（集計・グラフ・AI分析）</span>
          </NuxtLink>
          <NuxtLink
            to="/bpm"
            class="group flex flex-col px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-50 hover:text-gray-900"
            active-class="bg-gray-100 text-gray-900"
          >
            <span class="font-semibold">BPM</span>
            <span class="text-xs text-gray-500 group-hover:text-gray-600">（BPMNを生成）</span>
          </NuxtLink>
          <NuxtLink
            to="/guide"
            class="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            active-class="bg-gray-100 text-gray-900"
          >
            利用者ガイド
          </NuxtLink>
        </nav>
      </aside>

      <!-- Main Content -->
      <div class="flex-1 overflow-auto">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <header class="mb-8">
            <h1 class="text-2xl font-bold text-gray-900 mb-2">生成データの帳票・分析</h1>
            <p class="text-gray-600 mb-1">
              入力されたデータの一覧表示、集計グラフ、AIによる分析結果を表示します
            </p>
          </header>

          <main class="grid grid-cols-1 gap-6">
             <!-- Schema / Data Availability -->
             <section>
              <UCard>
                <div class="flex justify-between items-center mb-4">
                  <div>
                    <h2 class="text-lg font-medium text-gray-900">利用可能なデータ（DBスキーマ／テーブル）</h2>
                    <p class="text-xs text-gray-500">
                      現在データベースに存在するテーブル一覧です
                    </p>
                  </div>
                </div>
                <div id="reportTableList" class="report-table-list text-sm text-gray-700"></div>
              </UCard>
             </section>

             <!-- Hidden Selects for JS binding -->
             <div class="hidden">
               <USelectMenu v-model="formValue" :items="formItems" value-key="value" label-key="label" class="w-full report-select" />
               <select id="reportFormSelect" class="hidden"></select>
               <USelectMenu v-model="columnValue" :items="columnItems" value-key="value" label-key="label" class="w-full report-select" />
               <select id="reportColumnSelect" class="hidden"></select>
               <USelectMenu v-model="metricValue" :items="metricItems" value-key="value" label-key="label" class="w-full report-select" />
               <select id="reportMetricSelect" class="hidden"></select>
               <USelectMenu v-model="chartTypeValue" :items="chartTypeItems" value-key="value" label-key="label" class="w-full report-select" />
               <select id="reportChartType" class="hidden">
                 <option value="bar">棒グラフ</option>
                 <option value="line">折れ線</option>
                 <option value="pie">円グラフ</option>
               </select>
             </div>

             <!-- Prompt Section -->
             <section>
               <UCard>
                  <div class="flex justify-between items-center mb-4">
                     <div>
                       <h2 class="text-lg font-medium text-gray-900">分析指示</h2>
                       <p class="text-xs text-gray-500">
                         使用するテーブルや集計方法、グラフ形式はここで指示します
                       </p>
                     </div>
                  </div>
                  <div class="flex gap-2 mb-2">
                     <input 
                       id="reportPromptInput" 
                       type="text" 
                       class="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                       placeholder="例: sales_table を使って月別売上推移を折れ線グラフで表示"
                     />
                     <UButton id="reportPromptButton" color="primary">実行</UButton>
                  </div>
                  <div id="reportPromptResult" class="text-xs text-gray-500">
                    指示内容に応じてグラフ生成または原因推論を行います。
                  </div>
               </UCard>
             </section>

             <section class="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <!-- Charts Area -->
               <UCard class="min-h-[400px] flex flex-col" id="reportChartCard">
                  <div class="flex justify-between items-center mb-4">
                    <h3 class="text-base font-medium text-gray-900">集計グラフ</h3>
                    <div class="flex gap-1">
                       <UButton id="refreshReport" variant="ghost" color="gray" icon="i-heroicons-arrow-path" size="xs" />
                       <UButton id="reportChartMaximize" variant="ghost" color="gray" icon="i-heroicons-arrows-pointing-out" size="xs" />
                       <UButton id="reportChartReset" variant="ghost" color="gray" icon="i-heroicons-arrow-uturn-left" size="xs" />
                    </div>
                  </div>
                  <div class="flex-1 relative min-h-[300px] w-full">
                     <canvas id="reportChart"></canvas>
                  </div>
               </UCard>

               <!-- Table Area (formerly hidden or side-by-side) -->
               <UCard class="min-h-[400px] flex flex-col" id="reportDataCard">
                  <div class="flex justify-between items-center mb-4">
                     <h3 class="text-base font-medium text-gray-900">集計テーブル</h3>
                     <div class="flex gap-1">
                       <UButton id="refreshReportTable" variant="ghost" color="gray" icon="i-heroicons-arrow-path" size="xs" />
                       <UButton id="reportTableMaximize" variant="ghost" color="gray" icon="i-heroicons-arrows-pointing-out" size="xs" />
                       <UButton id="reportTableReset" variant="ghost" color="gray" icon="i-heroicons-arrow-uturn-left" size="xs" />
                     </div>
                  </div>
                  <div id="reportSheet" class="report-sheet flex-1 overflow-auto"></div>
               </UCard>
             </section>

             <!-- Analysis Result -->
             <section>
                <UCard>
                   <div class="flex justify-between items-center mb-4">
                      <h3 class="text-base font-medium text-gray-900">AI分析結果（自動生成）</h3>
                   </div>
                   <div id="reportCauseResult" class="text-sm text-gray-600 prose prose-sm max-w-none">
                      推論結果をここに表示します。
                   </div>
                </UCard>
             </section>

          </main>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
useHead({
  title: "帳票作成 | A2UI",
  link: [
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
  // Ensure DOM is ready (called in onMounted)
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

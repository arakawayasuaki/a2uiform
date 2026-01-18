<template>
  <div class="min-h-screen flex flex-col bg-gray-50" data-theme="light">
    <div class="flex flex-1">
      <aside class="w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col p-4">
        <div class="font-bold text-lg mb-2 text-gray-900">メニュー</div>
        <p class="text-gray-500 text-xs mb-6">
          プロンプトからBPMNを生成し、業務フローを可視化します。
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
      <div class="flex-1 overflow-auto">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <header class="mb-8">
            <h1 class="text-2xl font-bold text-gray-900 mb-2">BPMN 作成</h1>
            <p class="text-gray-600 mb-1">
              プロンプトから業務フローを生成し、BPMNで可視化します。
            </p>
          </header>

          <main class="grid grid-cols-1 gap-6">
            <section>
              <UCard id="bpmResultCard" class="shadow-sm bpm-card is-hidden">
                <div class="flex items-center justify-between gap-4 mb-2">
                  <div>
                    <h2 class="text-lg font-semibold mb-1">生成結果</h2>
                    <p class="text-gray-500 text-sm">
                      プロンプトで生成したBPMNをここに表示します。
                    </p>
                  </div>
                  <div class="flex gap-2">
                    <UButton
                      id="bpmSaveButton"
                      variant="outline"
                      color="gray"
                      size="sm"
                    >
                      保存
                    </UButton>
                    <UButton
                      id="bpmResultMaximize"
                      variant="outline"
                      color="gray"
                      size="sm"
                      class="report-icon-button"
                      aria-label="最大化"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M4 4h6v2H6v4H4V4zm10 0h6v6h-2V6h-4V4zM4 14h2v4h4v2H4v-6zm14 0h2v6h-6v-2h4v-4z"
                        />
                      </svg>
                    </UButton>
                    <UButton
                      id="bpmResultReset"
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
                <div id="bpmCanvas" class="bpm-canvas"></div>
              </UCard>
            </section>
            <section>
              <UCard class="shadow-sm">
                <h2 id="bpmPromptTitle" class="text-lg font-semibold mb-2">
                  生成指示
                </h2>
                <p class="text-gray-500 text-sm mb-3">
                  関連するフォーム名や担当部門を含めて、業務フローを文章で入力してください。
                </p>
                <div
                  id="bpmPromptSamples"
                  class="flex flex-wrap gap-2 mb-3 pointer-events-auto relative z-10"
                >
                  <button
                    type="button"
                    class="border border-gray-300 text-gray-600 text-xs px-3 py-1 rounded hover:bg-gray-50 pointer-events-auto"
                    data-prompt="経費精算フォームを使って、申請→上長承認→経理承認→差戻し/承認完了のフローを作成"
                  >
                    経費精算
                  </button>
                  <button
                    type="button"
                    class="border border-gray-300 text-gray-600 text-xs px-3 py-1 rounded hover:bg-gray-50 pointer-events-auto"
                    data-prompt="採用稟議フォームで、起案→部門長承認→人事承認→役員承認→完了、差戻しは起案者へ"
                  >
                    採用稟議
                  </button>
                  <button
                    type="button"
                    class="border border-gray-300 text-gray-600 text-xs px-3 py-1 rounded hover:bg-gray-50 pointer-events-auto"
                    data-prompt="出張申請フォームを使って、申請→上長承認→経理確認→承認完了、差戻しは申請者へ"
                  >
                    出張申請
                  </button>
                  <button
                    type="button"
                    class="border border-gray-300 text-gray-600 text-xs px-3 py-1 rounded hover:bg-gray-50 pointer-events-auto"
                    data-prompt="備品購入フォームを使い、申請→部門承認→購買確認→発注→検収→完了、却下は申請者へ通知"
                  >
                    備品購入
                  </button>
                </div>
                <UTextarea
                  id="bpmPromptInput"
                  class="w-full"
                  :rows="6"
                  placeholder="例: 経費精算フォームを使って、申請→上長承認→経理承認→差戻し/承認完了のフローを作成"
                />
                <div class="flex items-center gap-2 mt-3">
                  <UButton id="bpmGenerateButton" color="primary">
                    BPMNを生成
                  </UButton>
                  <span id="bpmStatus" class="text-gray-500 text-sm"></span>
                </div>
              </UCard>
            </section>
            <section>
              <UCard class="shadow-sm">
                <h2 class="text-lg font-semibold mb-2">保存済みフロー</h2>
                <div
                  id="bpmSavedList"
                  class="flex flex-col gap-2 pointer-events-auto relative z-10"
                ></div>
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
  title: "BPMN 作成",
  link: [
    { rel: "stylesheet", href: "/styles.css" },
    {
      rel: "stylesheet",
      href: "https://cdn.jsdelivr.net/npm/bpmn-js@15.2.1/dist/assets/diagram-js.css",
    },
    {
      rel: "stylesheet",
      href: "https://cdn.jsdelivr.net/npm/bpmn-js@15.2.1/dist/assets/bpmn-font/css/bpmn-embedded.css",
    },
  ],
  script: [
    {
      src: "https://cdn.jsdelivr.net/npm/bpmn-js@15.2.1/dist/bpmn-modeler.development.js",
      defer: true,
      body: true,
    },
    { src: "/app-config.js", defer: true, body: true },
    { src: "/bpm.js", defer: true, body: true },
  ],
});
</script>

<style scoped>
.bpm-canvas {
  min-height: 300px;
  height: 460px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 16px;
  overflow: hidden;
}

.bpm-canvas :deep(.djs-container),
.bpm-canvas :deep(svg) {
  width: 100%;
  height: 100%;
}

.bpm-card.is-maximized {
  position: fixed;
  left: 24px;
  right: 24px;
  top: 24px;
  bottom: 24px;
  z-index: 40;
  display: flex;
  flex-direction: column;
}

.bpm-card.is-hidden {
  display: none;
}

.bpm-card.is-maximized .bpm-canvas {
  flex: 1;
  min-height: auto;
}
</style>

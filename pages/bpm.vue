<template>
  <div class="app-shell">
    <aside class="app-sidebar">
      <div class="app-sidebar__title">メニュー</div>
      <p class="app-sidebar__description text-muted small mb-3">
        プロンプトからBPMNを生成し、業務フローを可視化します。
      </p>
      <nav class="nav flex-column">
        <NuxtLink class="nav-link" exact-active-class="active" to="/">
          <div>フォーム作成</div>
          <div class="text-muted small">（入力UIを生成・編集）</div>
        </NuxtLink>
        <NuxtLink class="nav-link" exact-active-class="active" to="/report">
          <div>帳票分析</div>
          <div class="text-muted small">（集計・グラフ・AI分析）</div>
        </NuxtLink>
        <NuxtLink class="nav-link" exact-active-class="active" to="/bpm">
          <div>BPM</div>
          <div class="text-muted small">（BPMNを生成）</div>
        </NuxtLink>
        <a class="nav-link" href="/guide.html">利用者ガイド</a>
      </nav>
    </aside>
    <div class="app-content">
      <div class="container py-4">
        <header class="mb-4">
          <h1 class="h3 mb-2">BPMN 作成</h1>
          <p class="text-muted mb-0">
            プロンプトから業務フローを生成し、BPMNで可視化します。
          </p>
        </header>

        <div class="row g-4">
          <section class="col-12">
            <UCard id="bpmResultCard" class="shadow-sm bpm-card is-hidden">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <div>
                  <h2 class="h5 mb-1">生成結果</h2>
                  <p class="text-muted small mb-0">
                    プロンプトで生成したBPMNをここに表示します。
                  </p>
                </div>
                <div class="d-flex gap-2">
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
          <section class="col-12">
            <UCard class="shadow-sm">
              <h2 id="bpmPromptTitle" class="h5 mb-2">生成指示</h2>
              <p class="text-muted small mb-3">
                関連するフォーム名や担当部門を含めて、業務フローを文章で入力してください。
              </p>
              <div id="bpmPromptSamples" class="d-flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  data-prompt="経費精算フォームを使って、申請→上長承認→経理承認→差戻し/承認完了のフローを作成"
                >
                  経費精算
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  data-prompt="採用稟議フォームで、起案→部門長承認→人事承認→役員承認→完了、差戻しは起案者へ"
                >
                  採用稟議
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  data-prompt="出張申請フォームを使って、申請→上長承認→経理確認→承認完了、差戻しは申請者へ"
                >
                  出張申請
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  data-prompt="備品購入フォームを使い、申請→部門承認→購買確認→発注→検収→完了、却下は申請者へ通知"
                >
                  備品購入
                </button>
              </div>
              <UTextarea
                id="bpmPromptInput"
                class="w-100"
                :rows="6"
                placeholder="例: 経費精算フォームを使って、申請→上長承認→経理承認→差戻し/承認完了のフローを作成"
              />
              <div class="d-flex align-items-center gap-2 mt-3">
                <UButton id="bpmGenerateButton" color="primary">
                  BPMNを生成
                </UButton>
                <span id="bpmStatus" class="text-muted small"></span>
              </div>
            </UCard>
          </section>
          <section class="col-12">
            <UCard class="shadow-sm">
              <h2 class="h5 mb-2">保存済みフロー</h2>
              <div id="bpmSavedList" class="d-flex flex-column gap-2"></div>
            </UCard>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
useHead({
  title: "BPMN 作成",
  link: [
    {
      rel: "stylesheet",
      href: "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css",
    },
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

<template>
  <div class="app-shell">
    <aside class="app-sidebar">
      <div class="app-sidebar__title">メニュー</div>
      <p class="app-sidebar__description text-muted small mb-3">
        プロンプトでフォームを作成し、投稿データを帳票化してAI分析まで行える
        ダッシュボードです。
      </p>
      <nav class="nav flex-column">
        <NuxtLink class="nav-link" exact-active-class="active" to="/guide">
          利用者ガイド
        </NuxtLink>
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
          <h1 class="h3 mb-2">A2UI フォーム生成デモ</h1>
          <p class="text-muted mb-0">
            プロンプトからフォーム仕様を推定し、A2UIメッセージでフォームを生成します。
          </p>
        </header>

        <main class="row g-4">
          <section class="col-12 col-lg-7">
            <UCard class="shadow-sm">
              <div
                class="d-flex justify-content-between align-items-center mb-3"
              >
                <h2 class="h5 mb-0">生成フォーム</h2>
                <div class="d-flex gap-2">
                  <UButton
                    id="newFormButton"
                    variant="outline"
                    color="gray"
                    size="sm"
                    class="shadow-sm"
                  >
                    新規作成
                  </UButton>
                  <UButton
                    id="saveNewButton"
                    color="primary"
                    size="sm"
                    class="shadow-sm"
                  >
                    保存
                  </UButton>
                  <UButton
                    id="saveOverwriteButton"
                    variant="outline"
                    color="primary"
                    size="sm"
                    class="shadow-sm"
                  >
                    上書き保存
                  </UButton>
                  <UButton
                    id="deleteFormButton"
                    variant="outline"
                    color="red"
                    size="sm"
                    disabled
                    class="shadow-sm"
                  >
                    削除
                  </UButton>
                  <UButton
                    id="saveAsButton"
                    color="primary"
                    size="sm"
                    class="shadow-sm"
                  >
                    別名で保存
                  </UButton>
                </div>
              </div>
              <div class="surface__wrapper">
                <div id="formSurface" class="surface"></div>
                <div
                  id="formSpinner"
                  class="spinner spinner--overlay spinner--lg"
                  aria-hidden="true"
                ></div>
              </div>
              <div id="searchResults" class="mt-4 d-none">
                <div
                  class="d-flex justify-content-between align-items-center mb-2"
                >
                  <h3 class="h6 mb-0">検索結果</h3>
                  <span id="searchResultCount" class="text-muted small"></span>
                </div>
                <div id="searchResultSheet" class="report-sheet"></div>
              </div>
              <div class="mt-4">
                <div
                  class="d-flex justify-content-between align-items-center mb-2"
                >
                  <h3 class="h6 mb-0">保存済みフォーム</h3>
                  <span id="savedFormCount" class="text-muted small"></span>
                </div>
                <div id="savedFormList" class="list-group"></div>
              </div>
            </UCard>
          </section>

          <section class="col-12 col-lg-5">
            <UCard class="shadow-sm">
              <h2 class="h5 mb-3">プロンプト</h2>
              <div class="prompt-input">
                <UTextarea
                  id="promptInput"
                  placeholder="例: 経費精算システム用のフォームを作って"
                  class="w-100"
                  :rows="5"
                />
                <UButton
                  id="generateButton"
                  type="button"
                  color="primary"
                  class="btn-icon prompt-input__button"
                  aria-label="フォーム生成"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2 3l20 9-20 9 4-8 7-1-7-1 4-8z" />
                  </svg>
                </UButton>
              </div>
            </UCard>
            <UCard class="shadow-sm mt-3">
              <h2 class="h5 mb-3">プロパティ</h2>
              <div id="propertyPanel" class="property-panel text-muted small">
                コンポーネントをクリックするとプロパティが表示されます。
              </div>
            </UCard>
          </section>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
useHead({
  title: "A2UI フォーム生成デモ",
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
      src: "https://cdn.jsdelivr.net/npm/jsuites@6.0.3/dist/jsuites.js",
      defer: true,
      body: true,
    },
    {
      src: "https://cdn.jsdelivr.net/npm/jspreadsheet-ce@5.0.4/dist/index.js",
      defer: true,
      body: true,
    },
    { src: "/app-config.js", defer: true, body: true },
    { src: "/app.js", defer: true, body: true },
  ],
});
</script>

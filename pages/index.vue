<template>
  <div class="app-shell">
    <aside class="app-sidebar">
      <div class="app-sidebar__title">メニュー</div>
      <p class="app-sidebar__description text-muted small mb-3">
        プロンプトでフォームを作成し、投稿データを帳票化してAI分析まで行える
        ダッシュボードです。
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
        <a class="nav-link" href="/guide.html">
          利用者ガイド
        </a>
      </nav>
    </aside>
    <div class="app-content">
      <div class="container py-4">
        <header class="mb-4">
          <h1 class="h3 mb-2">自然言語から業務フォームを自動生成する A2UI</h1>
          <p class="text-muted mb-1">
            申請書・稟議・報告フォームを、文章を書くように作成できます
          </p>
          <p class="text-muted small mb-0">
            ※ 本画面はデモ環境です。生成されたフォームは編集・保存できます。
          </p>
        </header>

        <main class="row g-4">
          <section class="col-12 col-lg-7">
            <UCard class="shadow-sm">
              <p class="text-muted small mb-2">STEP 2</p>
              <h2 class="h6 mb-3">生成されたフォームを確認・編集してください</h2>
              <div
                class="d-flex justify-content-between align-items-center mb-3"
              >
                <div>
                  <div class="text-muted small">AIが生成したフォーム</div>
                  <div class="d-flex gap-2">
                    <span class="badge text-bg-light">編集可能</span>
                    <span class="badge text-bg-light">保存可能</span>
                  </div>
                </div>
                <div class="d-flex gap-2">
                  <span class="text-muted small align-self-center">
                    STEP 3（任意）業務フォームとして保存
                  </span>
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
                    業務フォームとして保存
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
              <div class="mt-4" id="saved-forms">
                <p class="text-muted small mb-1">作成済みフォーム一覧</p>
                <p class="text-muted small mb-2">
                  これまでに作成・保存したフォームです
                </p>
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
              <p class="text-muted small mb-1">STEP 1</p>
              <h2 class="h5 mb-2">作成したいフォーム内容を文章で入力してください</h2>
              <p class="text-muted small mb-3">
                具体的な業務の流れや必要項目を、そのまま文章で入力できます。
              </p>
              <div class="prompt-input">
                <UTextarea
                  id="promptInput"
                  placeholder="例:\n・出張申請フォームを作成したい\n・申請者 → 上長 → 経理の承認フローを含めたい\n・日付、金額、添付ファイルを入力項目に含めたい"
                  class="w-100"
                  :rows="6"
                />
                <UButton
                  id="generateButton"
                  type="button"
                  color="primary"
                  class="btn-icon prompt-input__button"
                  aria-label="フォームを生成"
                  data-default-text="フォームを生成"
                  data-loading-text="フォームを生成しています…"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2 3l20 9-20 9 4-8 7-1-7-1 4-8z" />
                  </svg>
                  <span class="ms-2" data-generate-label>フォームを生成</span>
                </UButton>
              </div>
              <div class="mt-3">
                <div class="text-muted small mb-2">例を使って試す</div>
                <div class="d-flex flex-wrap gap-2">
                  <UButton
                    type="button"
                    variant="outline"
                    color="gray"
                    size="sm"
                    class="shadow-sm"
                    data-prompt-sample="経費精算フォームを作成したい。経費発生日、経費金額、経費カテゴリ、領収書添付を含めたい。"
                  >
                    経費精算フォーム
                  </UButton>
                  <UButton
                    type="button"
                    variant="outline"
                    color="gray"
                    size="sm"
                    class="shadow-sm"
                    data-prompt-sample="稟議申請フォームを作成したい。申請者→上長→経理の承認フローを含め、件名、目的、金額、添付資料を入力したい。"
                  >
                    稟議申請（承認フローあり）
                  </UButton>
                  <UButton
                    type="button"
                    variant="outline"
                    color="gray"
                    size="sm"
                    class="shadow-sm"
                    data-prompt-sample="個人情報を含む申請書を作成したい。氏名、住所、連絡先、生年月日、本人確認書類の添付を含めたい。"
                  >
                    個人情報を含む申請書
                  </UButton>
                </div>
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
        <footer class="text-muted small mt-4">
          本デモは業務PoC・検証用途を想定しています。入力データはデモ環境内でのみ利用されます。
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
useHead({
  title: "自然言語から業務フォームを自動生成する A2UI",
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

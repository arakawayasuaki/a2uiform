<template>
  <div class="app-shell">
    <aside class="app-sidebar">
      <div class="app-sidebar__title">メニュー</div>
      <p class="app-sidebar__description text-muted small mb-3">
        フォーム作成から帳票化、AI分析までを行うための利用者ガイドです。
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
          <h1 class="h3 mb-2">利用者ガイド</h1>
          <p class="text-muted mb-0">
            プロンプトでフォームを作成し、投稿データを帳票化してAI分析を行う手順です。
          </p>
        </header>

        <section class="mb-4">
          <h2 class="h5 mb-2">1. フォームを作成する</h2>
          <ol class="text-muted">
            <li>「ページ作成」へ移動します。</li>
            <li>プロンプトに作りたいフォームの内容を入力します。</li>
            <li>「生成」ボタンでフォームを作成し、内容を確認します。</li>
            <li>「保存」でフォームを保存します。</li>
          </ol>
          <p class="text-muted small mb-0">
            例:
            「経費精算フォームを作成して。項目は経費発生日、経費金額、経費カテゴリ」
          </p>
        </section>

        <section class="mb-4">
          <h2 class="h5 mb-2">2. データを投稿する</h2>
          <p class="text-muted">
            生成したフォームに沿ってデータを入力し、投稿します。投稿データは帳票作成で集計されます。
          </p>
        </section>

        <section class="mb-4">
          <h2 class="h5 mb-2">3. 帳票を作成する</h2>
          <ol class="text-muted">
            <li>「帳票作成」へ移動します。</li>
            <li>フォームと集計条件（横軸・縦軸・グラフ）を選択します。</li>
            <li>グラフと表で集計結果を確認します。</li>
          </ol>
        </section>

        <section class="mb-4">
          <h2 class="h5 mb-2">4. プロンプトで帳票を自動設定する</h2>
          <p class="text-muted">
            指示文からフォームと集計条件を自動で設定できます。
          </p>
          <p class="text-muted small mb-0">
            例: 「経費精算フォームで経費発生日別に経費金額を折れ線グラフで」
          </p>
        </section>

        <section class="mb-4">
          <h2 class="h5 mb-2">5. AI分析（傾向/原因）を確認する</h2>
          <p class="text-muted">
            「傾向を教えて」などの指示で、現在表示中のデータに対する分析を実行できます。
          </p>
        </section>

        <section>
          <h2 class="h5 mb-2">よくある質問</h2>
          <ul class="text-muted">
            <li>
              グラフが出ない: フォームの投稿データがあるか確認してください。
            </li>
            <li>
              日付が1日しか出ない:
              横軸が「送信日」になっていないか確認してください。
            </li>
            <li>
              AI分析が出ない: 「傾向」「原因」などの指示を含めてください。
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

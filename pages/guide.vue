<template>
  <div class="min-h-screen flex flex-col bg-gray-50" data-theme="light">
    <div class="flex flex-1">
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
      <div class="flex-1 overflow-auto">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <header class="mb-8">
            <h1 class="text-2xl font-bold text-gray-900 mb-2">利用者ガイド</h1>
            <p class="text-gray-600 mb-1">
              利用者ガイドを表示しています。
            </p>
          </header>
          <main class="grid grid-cols-1 gap-6">
            <section>
              <UCard>
                <div v-if="isLoading" class="text-sm text-gray-500">
                  利用者ガイドを読み込んでいます...
                </div>
                <div v-else-if="loadError" class="text-sm text-red-600">
                  利用者ガイドの読み込みに失敗しました。
                </div>
                <div
                  v-else
                  class="prose prose-sm max-w-none text-gray-700"
                  v-html="guideHtml"
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
const guideHtml = ref("");
const isLoading = ref(true);
const loadError = ref(false);

onMounted(async () => {
  try {
    const response = await fetch("/guide.html");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const raw = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(raw, "text/html");
    doc.querySelectorAll("script").forEach((node) => node.remove());
    const content =
      doc.querySelector(".app-content .container") ||
      doc.querySelector("main") ||
      doc.body;
    guideHtml.value = content?.innerHTML || "";
  } catch (error) {
    loadError.value = true;
  } finally {
    isLoading.value = false;
  }
});
</script>

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
            <h1 class="text-2xl font-bold text-gray-900 mb-2">自然言語から業務フォームを自動生成する A2UI</h1>
            <p class="text-gray-600 mb-1">
              申請書・稟議・報告フォームを、文章を書くように作成できます
            </p>
            <p class="text-gray-400 text-xs">
              ※ 本画面はデモ環境です。生成されたフォームは編集・保存できます。
            </p>
          </header>

          <main class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <!-- Left Column: Form Builder -->
            <section class="lg:col-span-7 space-y-4">
              <UCard>
                <div class="flex justify-between items-start mb-4">
                  <div>
                    <div class="flex items-center gap-2">
                      <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">STEP 2</p>
                      <span v-if="isGenerating" class="text-xs text-indigo-600 animate-pulse font-medium">✨ 生成中...</span>
                    </div>
                    <h2 class="text-lg font-medium text-gray-900">生成されたフォームを確認・編集してください</h2>
                  </div>
                </div>

                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                  <div>
                     <div class="flex gap-2">
                       <span class="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">編集可能</span>
                       <span class="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">保存可能</span>
                    </div>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <UButton 
                      icon="i-heroicons-arrow-uturn-left" 
                      color="neutral" 
                      variant="ghost" 
                      size="xs"
                      :disabled="!canUndo"
                      @click="undo"
                    />
                    <UButton 
                      icon="i-heroicons-arrow-uturn-right" 
                      color="neutral" 
                      variant="ghost" 
                      size="xs" 
                      :disabled="!canRedo"
                      @click="redo"
                    />
                  </div>

                  <div class="flex flex-wrap items-center gap-2">
                    <UButton variant="outline" color="neutral" size="xs" @click="resetForm">新規作成</UButton>
                    <UButton color="primary" size="xs" @click="saveForm">
                      {{ currentFormId ? '上書き保存' : '業務フォームとして保存' }}
                    </UButton>
                  </div>
                </div>

                <!-- Form Builder Component -->
                <FormBuilder
                  :schema="currentFormSpec"
                  :selected-id="selectedComponentId"
                  @select="selectComponent"
                />
              </UCard>

              <!-- Saved Forms List -->
              <UCard class="mt-8">
                  <div class="mb-4">
                    <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">作成済みフォーム一覧</p>
                    <h3 class="text-sm font-medium text-gray-900">保存済みフォーム ({{ savedForms.length }})</h3>
                  </div>
                  <div class="space-y-2">
                    <div v-if="savedForms.length === 0" class="block px-4 py-4 bg-gray-50 text-gray-500 text-sm rounded-lg border border-gray-200 text-center">
                       保存されたフォームはありません
                    </div>
                    <div 
                      v-for="form in savedForms" 
                      :key="form.id"
                      class="relative flex items-center justify-between space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400 cursor-pointer"
                      @click="loadForm(form)"
                    >
                      <div class="flex-1">
                         <h4 class="text-sm font-medium text-gray-900">{{ form.name }}</h4>
                         <p class="text-xs text-gray-500 line-clamp-1">{{ form.prompt }}</p>
                      </div>
                      <UButton icon="i-heroicons-trash" size="xs" color="neutral" variant="ghost" @click.stop="confirmDelete(form.id)" />
                    </div>
                  </div>
              </UCard>
            </section>

            <!-- Right Column: Prompt Input & Property Panel -->
            <section class="lg:col-span-5 space-y-4">
              <UCard>
                <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">STEP 1</p>
                <h2 class="text-lg font-medium text-gray-900 mb-2">作成したいフォーム内容を文章で入力してください</h2>
                <div class="prompt-input relative">
                  <UTextarea
                    v-model="promptText"
                    :placeholder="'例:\n・出張申請フォームを作成したい\n・日付、金額、添付ファイルを入力項目に含めたい'"
                    class="w-full"
                    :rows="6"
                  />
                  <div class="mt-2 flex justify-end">
                    <UButton
                      color="primary"
                      icon="i-heroicons-sparkles"
                      :loading="isGenerating"
                      @click="handleGenerate"
                    >
                      フォームを生成
                    </UButton>
                  </div>
                </div>
              </UCard>

              <!-- Property Panel -->
              <UCard class="mt-4 min-h-[400px]">
                 <PropertyPanel
                   :component="selectedComponent"
                   @update="updateComponentField"
                   @updateProps="updateComponentProps"
                 />
              </UCard>
            </section>
          </main>
          
          <footer class="mt-12 text-center text-xs text-gray-400">
            本デモは業務PoC・検証用途を想定しています。入力データはデモ環境内でのみ利用されます。
          </footer>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFormLogic } from '~/composables/useFormLogic';
import type { SavedForm } from '~/types';

useHead({
  title: "A2UI Form Builder (Vue)",
});

const { 
  currentFormSpec, 
  selectedComponentId, 
  savedForms, 
  isGenerating, 
  initSavedForms, 
  generateForm, 
  saveFormToStorage,
  deleteSavedForm,
  currentFormId,
  undo,
  redo,
  canUndo,
  canRedo
} = useFormLogic();

const promptText = ref('');

onMounted(() => {
  initSavedForms();
});

const handleGenerate = async () => {
  if (!promptText.value.trim()) return;
  // Generating a new form resets the ID
  currentFormId.value = null;
  await generateForm(promptText.value);
};

const selectComponent = (id: string | null) => {
  selectedComponentId.value = id;
};

const selectedComponent = computed(() => {
  if (!currentFormSpec.value?.components || !selectedComponentId.value) return null;
  return currentFormSpec.value.components[selectedComponentId.value] ?? null;
});

const updateComponentField = (field: string, value: any) => {
  if (!selectedComponent.value) return;
  (selectedComponent.value as any)[field] = value;
};

const updateComponentProps = (key: string, value: any) => {
  if (!selectedComponent.value) return;
  if (!selectedComponent.value.props) selectedComponent.value.props = {};
  selectedComponent.value.props[key] = value;
};



const saveForm = async () => {
  if (!currentFormSpec.value) return;
  // Pass currentFormId to overwrite if it exists
  const saved = await saveFormToStorage(currentFormSpec.value, promptText.value, currentFormId.value || undefined);
  currentFormId.value = saved.id;
  alert('保存しました');
};

const resetForm = () => {
  currentFormSpec.value = null;
  selectedComponentId.value = null;
  currentFormId.value = null;
  promptText.value = '';
};

const loadForm = (form: SavedForm) => {
  currentFormSpec.value = JSON.parse(JSON.stringify(form.formSpec)); // Deep copy to avoid mutating store directly through UI before save
  promptText.value = form.prompt;
  currentFormId.value = form.id;
  selectedComponentId.value = null;
};

const confirmDelete = async (id: string) => {
  if (confirm('この保存済みフォームを削除しますか？')) {
    await deleteSavedForm(id);
  }
};
</script>



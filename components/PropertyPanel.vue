<template>
  <div class="property-panel p-4 bg-white border border-gray-200 rounded-lg shadow-sm h-full overflow-y-auto">
    <div v-if="!component" class="text-center text-gray-400 py-8">
      コンポーネントを選択してください
    </div>
    <template v-else>
      <h3 class="font-bold text-gray-900 mb-4 border-b pb-2">プロパティ: {{ component.component }}</h3>

      <div class="space-y-4">
        <!-- Common: Label -->
        <div v-if="hasProp('label')">
          <label class="block text-sm font-medium text-gray-700">ラベル</label>
          <input 
            type="text" 
            :value="component.label"
            @input="updateField('label', ($event.target as HTMLInputElement).value)"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <!-- Common: Placeholder -->
        <div v-if="hasProp('placeholder')">
           <label class="block text-sm font-medium text-gray-700">プレースホルダー</label>
           <input 
            type="text" 
            :value="component.props?.placeholder"
            @input="updateProps('placeholder', ($event.target as HTMLInputElement).value)"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <!-- Button: Text -->
         <div v-if="component.component === 'Button'">
          <label class="block text-sm font-medium text-gray-700">ボタンテキスト</label>
          <input 
            type="text" 
            :value="component.text"
            @input="updateField('text', ($event.target as HTMLInputElement).value)"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <!-- Options (Select/Radio) -->
        <div v-if="component.options">
          <label class="block text-sm font-medium text-gray-700 mb-2">選択肢 (カンマ区切り)</label>
          <textarea
            rows="5"
            :value="optionsString"
            @input="updateOptions(($event.target as HTMLTextAreaElement).value)"
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          ></textarea>
        </div>
      </div>
      
      <div class="mt-8 pt-4 border-t border-gray-100">
         <p class="text-xs text-gray-400">Component ID: {{ component.id }}</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { FormComponent } from '~/types';

const props = defineProps<{
  component: FormComponent | null;
}>();

const emit = defineEmits<{
  (e: 'update', field: string, value: any): void;
  (e: 'updateProps', key: string, value: any): void;
}>();

const hasProp = (key: string) => {
  if (!props.component) return false;
  // Simple heuristic: if it's not a container or button, it probably has a label
  if (key === 'label') return !['Row', 'Column', 'Container', 'Button'].includes(props.component.component);
  if (key === 'placeholder') return ['TextField', 'EmailField', 'TelField', 'UrlField', 'TextArea'].includes(props.component.component);
  return false;
};

const updateField = (field: string, value: any) => {
  emit('update', field, value);
};

const updateProps = (key: string, value: any) => {
  emit('updateProps', key, value);
};

const optionsString = computed(() => {
  return props.component?.options?.map(o => o.label).join('\n') || '';
});

const updateOptions = (str: string) => {
  const lines = str.split('\n').filter(l => l.trim());
  const newOptions = lines.map(l => ({ label: l, value: l })); // Simple generated value
  emit('update', 'options', newOptions);
};
</script>

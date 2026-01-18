<template>
  <div class="form-builder p-4 min-h-[400px] bg-white rounded-lg border border-gray-200" @click.self="$emit('select', null)">
    <div v-if="!schema || !schema.rootComponentId" class="text-center text-gray-400 py-12">
      フォームが生成されていません
    </div>
    <template v-else>
      <div class="mb-6 border-b border-gray-100 pb-4">
        <h1 class="text-2xl font-bold">{{ schema.title }}</h1>
        <p class="text-gray-600 mt-2">{{ schema.description }}</p>
      </div>
      <FormNode
        :node-id="schema.rootComponentId"
        :components="schema.components"
        :selected-id="selectedId"
        @select="$emit('select', $event)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { FormSpec } from '~/types';
import FormNode from './FormNode.vue'; // Explicit import to ensure it works

defineProps<{
  schema: FormSpec | null;
  selectedId: string | null;
}>();

defineEmits<{
  (e: 'select', id: string | null): void;
}>();
</script>

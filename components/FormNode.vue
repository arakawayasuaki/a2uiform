<template>
  <div 
    v-if="component"
    :class="[
      'form-node relative p-2 rounded transition-all',
      isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/50' : 'hover:bg-gray-50',
      isContainer ? 'border border-dashed border-gray-300 min-h-[50px]' : ''
    ]"
    @click.stop="$emit('select', nodeId)"
  >
    <!-- Label -->
    <label v-if="component.label" class="block text-sm font-medium text-gray-700 mb-1 pointer-events-none">
      {{ component.label }}
    </label>

    <!-- Inputs based on Type -->
    <div class="pointer-events-none"> <!-- Disable interaction in preview mode to make selection easier -->
      <input 
        v-if="['TextField', 'EmailField', 'TelField', 'UrlField'].includes(component.component)"
        type="text" 
        class="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 sm:text-sm sm:leading-6"
        :placeholder="component.props?.placeholder"
        readonly
      />
      <input 
        v-else-if="component.component === 'NumberField' || component.component === 'CurrencyField'"
        type="number"
        class="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 sm:text-sm sm:leading-6"
        readonly
      />
      <input 
        v-else-if="component.component === 'DateField'"
        type="date"
        class="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 sm:text-sm sm:leading-6"
        readonly
      />
       <select
        v-else-if="component.component === 'Select'"
        class="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
        disabled
      >
        <option v-for="opt in component.options" :key="opt.value">{{ opt.label }}</option>
      </select>
       <div v-else-if="component.component === 'RadioGroup'" class="space-y-2">
         <div v-for="opt in component.options" :key="opt.value" class="flex items-center">
            <input type="radio" disabled class="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"/>
            <label class="ml-2 block text-sm text-gray-900">{{ opt.label }}</label>
         </div>
      </div>
      <div v-else-if="component.component === 'CheckboxField'" class="flex items-center">
         <input type="checkbox" disabled class="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"/>
         <label class="ml-2 block text-sm text-gray-900">{{ component.label }}</label>
      </div>
       <button
        v-else-if="component.component === 'Button'"
        type="button"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600"
      >
        {{ component.text || 'Button' }}
      </button>
    </div>

    <!-- Children (Recursive via Draggable) -->
    <draggable
      v-if="isContainer && component.children"
      v-model="childrenList"
      :group="{ name: 'form-components' }"
      item-key="id"
      :class="[containerClass, 'min-h-[50px]']"
      ghost-class="bg-indigo-50/50"
      :animation="200"
    >
        <template #item="{ element: childId }">
             <FormNode 
               :node-id="childId" 
               :components="components" 
               :selected-id="selectedId" 
               @select="$emit('select', $event)"
             />
        </template>
    </draggable>
    <!-- Empty Container Placeholder if no children -->
    <div v-else-if="isContainer" class="min-h-[50px] border-2 border-dashed border-gray-100 rounded flex items-center justify-center text-xs text-gray-400">
      Drop components here
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FormComponent } from '~/types';
import draggable from 'vuedraggable';

defineOptions({
  name: 'FormNode'
});

const props = defineProps<{
  nodeId: string;
  components: Record<string, FormComponent>;
  selectedId: string | null;
}>();

defineEmits<{
  (e: 'select', id: string): void;
}>();

const component = computed(() => props.components[props.nodeId]);
const isSelected = computed(() => props.selectedId === props.nodeId);
const isContainer = computed(() => ['Column', 'Row', 'Container'].includes(component.value?.component || ''));

// Writable computed for draggable v-model
const childrenList = computed({
  get: () => component.value?.children || [],
  set: (val: string[]) => {
    if (component.value) {
      component.value.children = val;
    }
  }
});

const containerClass = computed(() => {
  if (component.value?.component === 'Row') return 'flex flex-row gap-4 flex-wrap p-2 border border-dashed border-transparent hover:border-gray-200 rounded';
  return 'flex flex-col gap-4 p-2 border border-dashed border-transparent hover:border-gray-200 rounded';
});
</script>

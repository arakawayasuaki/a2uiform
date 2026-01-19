import type { FormSpec, SavedForm, FormComponent } from '~/types';
import { useRefHistory } from '@vueuse/core';

export const useFormLogic = () => {
  const currentFormSpec = useState<FormSpec | null>('currentFormSpec', () => null);
  const selectedComponentId = useState<string | null>('selectedComponentId', () => null);
  const savedForms = useState<SavedForm[]>('savedForms', () => []);
  const currentFormId = useState<string | null>('currentFormId', () => null);
  const isGenerating = useState<boolean>('isGenerating', () => false);
  const lastRawResponse = useState<string | null>('lastRawResponse', () => null);

  // Undo/Redo history for currentFormSpec
  const { history, undo, redo, canUndo, canRedo } = useRefHistory(currentFormSpec, {
    deep: true,
    capacity: 20
  });



  const generateSampleData = async (formSpec: any) => {
      const formTitle = formSpec.title || '無題';
      const sampleDataPrompt = `
        Based on this form schema, generate 10 plausible sample submissions.
        Schema: ${JSON.stringify(formSpec)}
        Output a valid JSON object with a "data" property containing an array of objects.
        Keys must match the component IDs. Values must be realistic data in Japanese.
        Example: { "data": [{"comp1_id": "山田太郎", "comp2_id": "2024-01-01"}, ...] }
      `;

      try {
        const sampleResponse = await fetch('/api/openai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a data generator. Output only JSON array.' },
                    { role: 'user', content: sampleDataPrompt }
                ],
                response_format: { type: 'json_object' }
            })
        });
        
        const sampleData = await sampleResponse.json();
        const sampleContent = sampleData.choices?.[0]?.message?.content;
        
        if (sampleContent) {
           let samples = JSON.parse(sampleContent);
           if (samples.data && Array.isArray(samples.data)) {
             samples = samples.data;
           } else if (!Array.isArray(samples)) {
             samples = []; 
           }

           if (Array.isArray(samples)) {
             console.log(`Generated ${samples.length} sample items`);
             const items = samples.map((item: Record<string, unknown>) => ({
               formName: formTitle,
               data: item,
               createdAt: new Date().toISOString()
             }));
             await $fetch('/api/submissions', {
                method: 'POST',
                body: { items }
             });
           }
        }
      } catch (err) {
        console.error('Sample data generation failed', err);
      }
  };

  // Initialize saved forms from Server (Redis)
  const initSavedForms = async () => {
    try {
      const data = await $fetch<SavedForm[]>('/api/forms');
      savedForms.value = data || [];
    } catch (e) {
      console.error('Failed to load saved forms', e);
    }
  };

  const saveFormToStorage = async (form: FormSpec, prompt: string, overwriteId?: string) => {
    const now = new Date().toISOString(); 
    const title = form.title || '無題';
    
    // Optimistic UI update or wait for server? Let's wait for server to get confirmed ID/timestamp
    try {
        const payload = {
            id: overwriteId,
            name: title,
            prompt,
            formSpec: form,
            createdAt: undefined, // Let server handle if new, or preserve if we knew it (but we don't send full obj)
            // Ideally we should pass existing createdAt if updating.
            // But let's keep it simple: Server sets defaults if missing.
        };

        const savedEntry = await $fetch<SavedForm>('/api/forms', {
            method: 'POST',
            body: payload
        });
        
        // Update local state
        const index = savedForms.value.findIndex(f => f.id === savedEntry.id);
        if (index !== -1) {
            savedForms.value[index] = savedEntry;
        } else {
            savedForms.value.unshift(savedEntry);
            // New form saved, generate sample data
            generateSampleData(form);
        }
        
        return savedEntry;
    } catch (e) {
        console.error('Failed to save form', e);
        throw e;
    }
  };

  const deleteSavedForm = async (id: string) => {
    try {
        await $fetch('/api/forms', {
            method: 'DELETE',
            params: { id }
        });
        savedForms.value = savedForms.value.filter(f => f.id !== id);
        
        if (currentFormId.value === id) {
             currentFormId.value = null; // Clear ID if the loaded form was deleted
        }
    } catch (e) {
        console.error('Failed to delete form', e);
        alert('削除に失敗しました');
    }
  };

  // Logic to generate form from prompt (migrated from app.js)

  const mapFieldTypeToComponent = (type: string) => {
    switch (type) {
      case 'email':
        return 'EmailField';
      case 'tel':
        return 'TelField';
      case 'url':
        return 'UrlField';
      case 'number':
        return 'NumberField';
      case 'currency':
        return 'CurrencyField';
      case 'date':
        return 'DateField';
      case 'select':
        return 'Select';
      case 'radio':
        return 'RadioGroup';
      case 'checkbox':
      case 'switch':
        return 'CheckboxField';
      default:
        return 'TextField';
    }
  };

  const buildComponentsFromFields = (fields: Array<any>) => {
    const rootId = 'root';
    const components: Record<string, FormComponent> = {
      [rootId]: { id: rootId, component: 'Column', children: [] }
    };
    fields.forEach((field, index) => {
      const id = field?.id ? String(field.id) : `field_${index}`;
      const componentType = mapFieldTypeToComponent(String(field?.type || 'text'));
      const component: FormComponent = {
        id,
        component: componentType,
        label: field?.label || `項目${index + 1}`
      };
      if (field?.options && Array.isArray(field.options) && ['Select', 'RadioGroup'].includes(componentType)) {
        component.options = field.options.map((opt: string) => ({ label: opt, value: opt }));
      }
      components[id] = component;
      components[rootId]?.children?.push(id);
    });
    const submitId = 'submit_button';
    components[submitId] = { id: submitId, component: 'Button', text: '送信' };
    components[rootId]?.children?.push(submitId);
    return { components, rootId };
  };

  const normalizeFormSpec = (parsed: any, prompt: string): FormSpec => {
    const titleFromPrompt = prompt?.trim()?.slice(0, 30) || '無題';
    let components: Record<string, FormComponent> =
      parsed?.components && typeof parsed.components === 'object' && !Array.isArray(parsed.components)
        ? parsed.components
        : {};
    if (Object.keys(components).length === 0 && Array.isArray(parsed?.fields)) {
      const built = buildComponentsFromFields(parsed.fields);
      components = built.components;
      parsed.rootComponentId = built.rootId;
    }
    const rootId = parsed.rootComponentId && components[parsed.rootComponentId]
      ? parsed.rootComponentId
      : undefined;
    const containerTypes = new Set(['Column', 'Row', 'Container']);

    // Ensure component ids and normalize map entries.
    for (const key in components) {
      const comp = components[key];
      if (!comp || typeof comp !== 'object') {
        components[key] = { id: key, component: 'TextField', label: key };
        continue;
      }
      if (!comp.id) comp.id = key;
      // Normalize AI hallucinations (type -> component).
      if (!comp.component && (comp as any).type) {
        (comp as any).component = (comp as any).type;
        delete (comp as any).type;
      }
    }

    let resolvedRootId = rootId || 'root';
    if (!components[resolvedRootId]) {
      components[resolvedRootId] = { id: resolvedRootId, component: 'Column', children: [] };
    }

    const root = components[resolvedRootId]!;
    if (!containerTypes.has(root.component)) {
      const newRootId = components.root ? 'root_container' : 'root';
      components[newRootId] = { id: newRootId, component: 'Column', children: [resolvedRootId] };
      resolvedRootId = newRootId;
    }
    if (!components[resolvedRootId]) {
      components[resolvedRootId] = { id: resolvedRootId, component: 'Column', children: [] };
    }

    const resolvedRoot = components[resolvedRootId]!;
    if (!resolvedRoot.children) resolvedRoot.children = [];

    const referencedChildren = new Set<string>();
    for (const comp of Object.values(components)) {
      comp?.children?.forEach((childId) => referencedChildren.add(childId));
    }

    const orphanIds = Object.keys(components).filter(
      (id) => id !== resolvedRootId && !referencedChildren.has(id)
    );
    orphanIds.forEach((id) => {
      if (!resolvedRoot.children?.includes(id)) {
        resolvedRoot.children?.push(id);
      }
    });

    return {
      title: parsed.title || titleFromPrompt,
      description: parsed.description || '',
      fields: Array.isArray(parsed.fields) ? parsed.fields : [],
      components,
      rootComponentId: resolvedRootId
    };
  };

  const generateForm = async (prompt: string, model: string = 'gpt-4o-mini') => {
    isGenerating.value = true;
    lastRawResponse.value = null;
    try {
      const systemPrompt = `
        あなたは業務フォームの設計者です。
        次のJSONスキーマだけを返してください。
        {
          "title": "Form Title",
          "description": "Form Description",
          "components": { ...flat map of components... },
          "rootComponentId": "root_id"
        }
        - JSON以外の文章は一切出力しないでください。
        - ルートコンポーネントは "Column" または "Row" のコンテナにしてください。
        - 子要素は "children" 配列で階層化してください。
        - "type" ではなく "component" を使用してください。
        - 例:
          "root": { "id": "root", "component": "Column", "children": ["name", "amount", "submit"] }
        - component の許可値:
          TextField, EmailField, TelField, UrlField, NumberField, CurrencyField, DateField,
          Select, RadioGroup, CheckboxField, Button, Column, Row
        - ラベルは日本語にしてください。
      `;
      
      const response = await fetch('/api/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Create a form based on this request: ${prompt}` }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: 1200
        })
      });

      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('No content returned');
      
      console.log('API Raw Response:', content);
      lastRawResponse.value = content;
      const parsed = JSON.parse(content);

      const normalized = normalizeFormSpec(parsed, prompt);
      console.log('API Response Schema:', normalized);
      currentFormSpec.value = normalized;
      return normalized;
    } catch (e) {
      console.error('Generation failed', e);
      throw e;
    } finally {
      isGenerating.value = false;
    }
  };



  const removeComponent = (id: string) => {
    if (!currentFormSpec.value) return;
    const comps = currentFormSpec.value.components;
    
    // Find parent
    let parentId: string | undefined;
    for (const key in comps) {
      const comp = comps[key];
      if (comp?.children?.includes(id)) {
        parentId = key;
        break;
      }
    }
    
    // Remove from parent
    const parent = parentId ? comps[parentId] : undefined;
    if (parent?.children) {
      parent.children = parent.children.filter(childId => childId !== id);
    }
    
    // Recursive delete
    const deleteRecursive = (targetId: string) => {
      const target = comps[targetId];
      if (target?.children) {
        target.children.forEach(deleteRecursive);
      }
      delete comps[targetId];
    };
    
    deleteRecursive(id);
    
    if (selectedComponentId.value === id) {
      selectedComponentId.value = null;
    }
  };

  return {
    currentFormSpec,
    selectedComponentId,
    savedForms,
    currentFormId,
    isGenerating,
    lastRawResponse,
    initSavedForms,
    saveFormToStorage,
    deleteSavedForm,
    generateForm,
    removeComponent,
    undo,
    redo,
    canUndo,
    canRedo
  };
};

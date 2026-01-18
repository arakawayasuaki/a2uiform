import type { FormSpec, SavedForm, FormComponent } from '~/types';
import { useRefHistory } from '@vueuse/core';

export const useFormLogic = () => {
  const currentFormSpec = useState<FormSpec | null>('currentFormSpec', () => null);
  const selectedComponentId = useState<string | null>('selectedComponentId', () => null);
  const savedForms = useState<SavedForm[]>('savedForms', () => []);
  const currentFormId = useState<string | null>('currentFormId', () => null);
  const isGenerating = useState<boolean>('isGenerating', () => false);

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
  const generateForm = async (prompt: string, model: string = 'gpt-4o-mini') => {
    isGenerating.value = true;
    try {
      const systemPrompt = `
        You are a form generation assistant.
        Output a JSON object satisfying the FormSpec interface.
        {
          "title": "Form Title",
          "description": "Form Description",
          "components": { ...flat map of components... },
          "rootComponentId": "root_id"
        }
        - The root component should be a "Column" or "Row" container.
        - Create a hierarchy using 'children' array.
        - KEY REQUIREMENT: Use "component" property for the component type (NOT "type").
        - Example component object:
          "some_id": { "id": "some_id", "component": "TextField", "label": "Name" }
        - Supported "component" values: TextField, LocalTextField, EmailField, TelField, UrlField, NumberField, CurrencyField, DateField, Select, RadioGroup, CheckboxField, Button, Column, Row.
        - Use Japanese for labels.
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
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('No content returned');
      
      const parsed = JSON.parse(content);
      
      
      // Normalize 'type' to 'component' to handle AI hallucinations
      if (parsed.components) {
        for (const key in parsed.components) {
          const comp = parsed.components[key];
          if (!comp.component && comp.type) {
             comp.component = comp.type;
             delete comp.type;
          }
        }
      }

      console.log('API Response Schema:', parsed);
      currentFormSpec.value = parsed;
      return parsed;
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
      if (comps[key].children?.includes(id)) {
        parentId = key;
        break;
      }
    }
    
    // Remove from parent
    if (parentId && comps[parentId].children) {
      comps[parentId].children = comps[parentId].children.filter(childId => childId !== id);
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

export interface FormComponent {
  id: string;
  component: string; // 'TextField', 'Button', 'Container', etc.
  label?: string;
  props?: Record<string, any>; // Generic key-value store for props like placeholder, options
  style?: Record<string, any>; // CSS styles
  children?: string[]; // IDs of children components
  parentId?: string;
  value?: { path: string }; // Binding path
  action?: { name: string; context?: any }; // For buttons
  text?: string; // For Text or Button labels
  options?: { label: string; value: string }[]; // For Select/Radio
}

export interface FormSpec {
  title: string;
  description?: string;
  fields: any[]; // Legacy flat field list for table view
  components: Record<string, FormComponent>; // Normalized component tree
  rootComponentId: string;
  titleStyle?: Record<string, any>;
}

export interface SavedForm {
  id: string;
  name: string;
  prompt: string;
  formSpec: FormSpec;
  createdAt: string;
  updatedAt?: string;
}

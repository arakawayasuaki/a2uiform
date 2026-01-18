import Modeler from "bpmn-js/lib/Modeler";

declare global {
  interface Window {
    BpmnModeler?: typeof Modeler;
    BpmnJS?: typeof Modeler;
  }
}

export default defineNuxtPlugin(() => {
  if (typeof window === "undefined") {
    return;
  }
  window.BpmnModeler = Modeler;
  window.BpmnJS = Modeler;
});

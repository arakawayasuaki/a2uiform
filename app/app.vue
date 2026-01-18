<template>
  <NuxtPage />
</template>

<script setup>
const colorMode = useColorMode();

useHead({
  meta: [{ name: "color-scheme", content: "light" }],
  htmlAttrs: { "data-theme": "light", class: "light" },
});

if (process.client) {
  colorMode.preference = "light";
  colorMode.value = "light";
  onMounted(() => {
    const root = document.documentElement;
    const body = document.body;
    const enforceLight = () => {
      root.classList.remove("dark");
      root.classList.add("light");
      root.dataset.theme = "light";
      if (body) {
        body.classList.remove("dark");
      }
    };
    enforceLight();
    const observer = new MutationObserver(enforceLight);
    observer.observe(root, { attributes: true, attributeFilter: ["class", "data-theme"] });
  });
}
</script>

<style src="../assets/css/styles.css"></style>

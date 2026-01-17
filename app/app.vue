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
}
</script>

<style src="../assets/css/styles.css"></style>

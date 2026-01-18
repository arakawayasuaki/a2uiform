<template>
  <div class="container py-4">
    <p class="text-muted">利用者ガイドへ移動します...</p>
  </div>
</template>

<script setup>
onMounted(() => {
  window.location.href = "/guide.html";
});
</script>

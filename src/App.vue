<template>
  <OtomadMain />
</template>

<script setup lang="ts">
import OtomadMain from './components/OtomadMain.vue'
</script>

<style scoped>
.wrapper {
  margin: 20px;
}

.visualized {
  overflow-x: auto;
}

.track {
  position: relative;
  border: 1px solid rgb(197.7, 225.9, 255);
  height: 80px;
  background-color: rgb(235.9, 245.3, 255);
}

.note {
  position: absolute;
  height: 1px;
  background-color: rgb(51.2, 126.4, 204);
}
</style>

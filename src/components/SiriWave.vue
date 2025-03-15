<template>
  <div ref="divRef" :class="{ 'visible': modelValue }" class="siri-wave"></div>
</template>

<script lang="ts" setup>

import { debounce } from "lodash";
import SiriWave from "siriwave";
import { onMounted, ref } from 'vue'

defineProps({
  modelValue: { type: Boolean, default: false, required: false }
})

const divRef = ref<HTMLElement>()
const siriWave = ref<SiriWave>()

onMounted(() => init())

window.addEventListener('resize', () => {
  if (siriWave.value) siriWave.value.dispose()
  init()
})

const init = debounce(() => {
  if (!divRef.value) return
  siriWave.value = new SiriWave({
    style: 'ios9',
    container: divRef.value,
    width: window.innerWidth,
    height: 200,
    amplitude: 2,
    speed: 0.15,
    autostart: true,
  })
}, 100)


</script>

<style scoped lang="less">
.siri-wave {
  transition: all 0.3s ease-in-out;
  transform: scaleY(0) translateX(-50%);
  overflow: hidden;
  position: absolute;
  margin-left: 50%;
  opacity: 0;

  &.visible {
    transform: scaleY(1) translateX(-50%);
    opacity: 1;
  }
}
</style>
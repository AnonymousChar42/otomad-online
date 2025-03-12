<template>
  <el-dialog title="音频波形" v-model="visible" @close="close">
    <div v-if="sound && visible" class="sound-wrapper">
      <div ref="waveformRef" />
      <div class="ver-line-wrapper">
        <div v-for="line, index in lines" :key="index" v-bind="line" class="ver-line" />
      </div>
      <div v-if="audioCrx.duration">
        <el-slider v-model="sound.offset" :step="0.001" :max="audioCrx.duration" />
        <el-slider v-model="sound.loopRange" range :step="0.001" :max="audioCrx.duration" />
        <el-slider v-model="sound.basePitch" :step="1" :max="127" />
      </div>
      <el-button type="primary" @click="stop" v-if="audioCrx.playing">stop</el-button>
      <el-button type="primary" @click="play" v-else>play</el-button>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { nextTick, reactive, ref, computed } from 'vue'
import { ElDialog, ElButton, ElSlider } from 'element-plus'
import { SoundFileItem, MyAudioContext } from './logic'

import WaveSurfer from 'wavesurfer.js'
const waveformRef = ref<HTMLElement>()

const visible = ref(false)

const sound = ref<SoundFileItem>()
const audioCrx = reactive(new MyAudioContext())
let wavesurfer: WaveSurfer | null = null


const show = async (soundItem?: SoundFileItem) => {
  if (!soundItem) return
  sound.value = soundItem
  visible.value = true
  await nextTick()
  if (!soundItem || !waveformRef.value) return
  waveformRef.value.innerHTML = ''
  wavesurfer = WaveSurfer.create({
    height: 150,
    container: waveformRef.value as HTMLElement,
    normalize: true,
    url: soundItem.src,
  })
  sound.value.init().then(() => {
    audioCrx!.init(sound.value!.buffer as AudioBuffer)
  })
}

const play = async () => {
  audioCrx.init(sound.value!.buffer as AudioBuffer)
  const { offset, basePitch, loopRange: [loopStart, loopEnd] } = sound.value!
  const playbackRate = audioCrx.calculatePlaybackRate(basePitch)
  const callback = (time: number) => wavesurfer?.setTime(time)
  audioCrx?.play({ offset, loopStart, loopEnd, callback, playbackRate })
}

const stop = () => {
  audioCrx.pause()
}

const close = () => {
  visible.value = false
  audioCrx.pause()
}

const lines = computed(() => {
  const { offset, loopRange: [loopStart, loopEnd] } = sound.value!
  const duration = audioCrx.duration
  if (!duration) return []

  return [offset, loopStart, loopEnd].filter(Boolean).map(time => ({
    style: { left: `${time / duration * 100}%` }
  }))
})

defineExpose({ show })

</script>


<style scoped>
.sound-wrapper {
  width: 100%;
  position: relative;
}

.ver-line-wrapper {
  position: absolute;
  height: 150px;
  width: 100%;
  top: 0;
}

.ver-line {
  position: absolute;
  background-color: var(--el-color-danger);
  ;
  width: 2px;
  height: 100%;
  z-index: 100;
}
</style>

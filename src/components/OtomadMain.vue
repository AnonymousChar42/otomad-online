<template>
  <div class="otomad-main flex-col">
    <div class="wrapper p-20 flex-col flex-1">
      <div class="flex-row mb-10">
        <el-button class="mr-20" type="primary" @click="showFileLib">素材库</el-button>
        <div class="flex-row items-center">
          <div class="mr-10">配置选择</div>
          <el-select value-key="id" v-model="otomad.curConfig" @change="handleCfgChange">
            <el-option v-for="item in otomad.configList" :key="item.id" :label="item.name" :value="item" />
          </el-select>
        </div>
      </div>

      <div class="flex-row justify-between mb-10">
        <div v-for="key in keyList" :key="key" class="flex-row">
          <el-select value-key="id" v-model="otomad.curConfig[key]" @change="handleCfgChange" class="mr-10">
            <el-option v-for="item in otomad.fileLibrary[key]" :key="item.id" :label="item.name" :value="item" />
          </el-select>
          <el-button type="primary" @click="showDetail(key)">查看 {{ key.toUpperCase() }}</el-button>
        </div>
      </div>

      <div class="flex-1">
        <div class="flex-row">
          <el-button type="primary" @click="stop" v-if="audioCrx.playing">stop</el-button>
          <el-button type="primary" @click="play" v-else>play</el-button>
          <ElSlider :model-value="audioCrx.progress" :step="1e-5" :max="1" class="unselectable flex-1 ml-50"
            :show-tooltip="false" />
        </div>
        <div class="img-row unselectable m-100">
          <img :src="otomad.curConfig.image?.src" :class="count % 2 ? 'img-flip' : 'img-unflip'"
            :width="imageWidth + '%'" v-for="count, index in audioCrx.counter" :key="index" class="img-cell"
            :style="{ left: imageWidth * index + '%' }">
        </div>
      </div>
    </div>

    <MidiTracksDialog ref="midiTracksDialogRef" />
    <SoundDialog ref="soundDialogRef" />
    <FileLibraryDialog ref="fileLibDialogRef" />
    <ImageDialog ref="imageDialogRef" />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted, onUnmounted } from 'vue'
import { ElButton, ElSelect, ElOption, ElSlider } from 'element-plus'
import { OtomadMain, OtomadConfig, MyAudioContext } from './logic'
import MidiTracksDialog from './MidiTracksDialog.vue'
import SoundDialog from './SoundDialog.vue'
import ImageDialog from './ImageDialog.vue'
import FileLibraryDialog from './FileLibraryDialog.vue'
const keyList: (keyof OtomadConfig)[] = ['midi', 'sound', 'image']

const fileLibDialogRef = ref<InstanceType<typeof FileLibraryDialog>>()
const midiTracksDialogRef = ref<InstanceType<typeof MidiTracksDialog>>()
const soundDialogRef = ref<InstanceType<typeof SoundDialog>>()
const imageDialogRef = ref<InstanceType<typeof ImageDialog>>()

const showDetail = (key: keyof OtomadConfig) => {
  switch (key) {
    case 'midi': return midiTracksDialogRef.value?.show(otomad.tracks)
    case 'sound': return soundDialogRef.value?.show(otomad.curConfig.sound)
    case 'image': return imageDialogRef.value?.show(otomad.curConfig.image)
  }
}

const showFileLib = () => fileLibDialogRef.value?.show(otomad.fileLibrary)
const otomad = reactive(new OtomadMain())
otomad.init()

const handleCfgChange = (config: OtomadConfig) => {
  config.init()
}


const audioCrx = reactive(new MyAudioContext())
const play = async () => {
  const { sound, midi } = otomad.curConfig
  audioCrx.playMidi(midi, sound)
}

const stop = () => {
  audioCrx.stop()
}

const imageWidth = computed(() => (100 / audioCrx.counter.length))

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.code !== "Space") return
  if (document.activeElement?.nodeName === "INPUT") return

  if (audioCrx.playing) stop()
  else play()
}


onMounted(() => document.addEventListener("keydown", handleKeyDown))
onUnmounted(() => document.removeEventListener("keydown", handleKeyDown))



</script>


<style lang="less">
body {
  margin: 0;

  & * {
    box-sizing: border-box;
  }
}

.otomad-main {
  height: 100vh;
  width: 100vw;

  .wrapper {
    .el-select {
      width: 200px;
    }
  }

  .visualized {
    overflow-x: auto;
  }

  .unselectable {
    user-select: none;
    pointer-events: none;
  }

  .img-row {
    z-index: -100;
    position: relative;

    .img-cell {
      position: absolute;
      max-height: 50vh;
      object-fit: contain;
    }

    .img-flip {
      transform: scaleX(-1) scaleY(1);
    }

    .img-unflip {
      transform: scaleX(1) scaleY(1);
    }

    .img-unflip {
      animation: unflip-scale .1s ease-in-out;
    }

    .img-flip {
      animation: flip-scale .1s ease-in-out;
    }
  }
}

@keyframes flip-scale {
  0% {
    transform: scaleX(-0.8) scaleY(1.2);
  }

  100% {
    transform: scaleX(-1) scaleY(1);
  }
}

@keyframes unflip-scale {
  0% {
    transform: scaleX(0.8) scaleY(1.2);
  }

  100% {
    transform: scaleX(1) scaleY(1);
  }
}
</style>

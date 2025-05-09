<template>
  <div class="otomad-main flex-col" :class="{ 'is-mobile': isMobile }">
    <div class="wrapper p-20 flex-col flex-1">
      <div class="flex-row mb-10">
        <div class="flex-row items-center">
          <div class="mr-10">配置选择</div>
          <el-select value-key="id" v-model="otomad.curConfig" @change="handleCfgChange" class="mr-10" filterable>
            <el-option v-for="item in otomad.configList" :key="item.id" :label="item.name" :value="item" />
          </el-select>
          <el-input v-model="otomad.curConfig.name" placeholder="配置名称" style="width: 150px;" class="mr-10" />
          <el-button type="primary" @click="addConfig()" class="mr-10">新建配置</el-button>
          <CurvyRat @click="showFileLib()" class="mr-10">素材库</CurvyRat>
          <el-button type="primary" @click="save()">保存</el-button>
        </div>
      </div>

      <div class="flex-row justify-between mb-10">
        <div v-for="key in keyList" :key="key" class="flex-row">
          <el-select value-key="id" v-model="otomad.curConfig[key]" @change="handleCfgChange" class="mr-10" filterable>
            <el-option v-for="item in otomad.fileLibrary[key]" :key="item.id" :label="item.name" :value="item" />
          </el-select>
          <el-button type="primary" @click="showDetail(key)">查看 {{ key.toUpperCase() }}</el-button>
        </div>
      </div>

      <div class="flex-1">
        <div class="flex-row items-center">
          <TameSnake @click="audioCrx.playing ? pause() : play()" :checked="audioCrx.playing" />
          <ElSlider v-model="audioCrx.progress" :step="1e-5" :max="1" class="flex-1 ml-20" :show-tooltip="false"
            @input="handleProgressChange" />
        </div>
        <div class="img-row unselectable m-100">
          <img :src="otomad.curConfig.image?.src" :class="count % 2 ? 'img-flip' : 'img-unflip'"
            :width="imageWidth + '%'" v-for="count, index in audioCrx.counter" :key="index" class="img-cell"
            :style="{ left: imageWidth * index + '%' }" />
          <img v-if="!audioCrx.counter.length" :src="otomad.curConfig.image?.src" class="img-center" />
          <SiriWave :model-value="audioCrx.playing" class="siri-wave" v-if="!isMobile" />
        </div>
      </div>
    </div>
    <MidiTracksDialog ref="midiTracksDialogRef" />
    <SoundDialog ref="soundDialogRef" />
    <FileLibraryDialog ref="fileLibDialogRef" />
    <ImageDialog ref="imageDialogRef" />
    <BackgroundParticle style="position: absolute; z-index: -300;opacity: 0.8;" v-if="!isMobile" />
    <div class="dark-overlay"></div>
  </div>
</template>

<script setup lang="ts">
import CurvyRat from './uiverse/CurvyRat.vue'
import TameSnake from './uiverse/TameSnake.vue'
import { reactive, ref, computed, onMounted, onUnmounted } from 'vue'
import { ElButton, ElInput, ElSelect, ElOption, ElSlider, ElMessage } from 'element-plus'
import { OtomadMain, OtomadConfig, MyAudioContext } from './logic'
import MidiTracksDialog from './MidiTracksDialog.vue'
import SoundDialog from './SoundDialog.vue'
import ImageDialog from './ImageDialog.vue'
import FileLibraryDialog from './FileLibraryDialog.vue'
import BackgroundParticle from './BackgroundParticle.vue'
import SiriWave from './SiriWave.vue'
import type { Arrayable } from 'element-plus/es/utils/typescript.mjs'

const keyList: (keyof OtomadConfig)[] = ['midi', 'sound', 'image']

const fileLibDialogRef = ref<InstanceType<typeof FileLibraryDialog>>()
const midiTracksDialogRef = ref<InstanceType<typeof MidiTracksDialog>>()
const soundDialogRef = ref<InstanceType<typeof SoundDialog>>()
const imageDialogRef = ref<InstanceType<typeof ImageDialog>>()

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Mobile|Opera Mini/i.test(navigator.userAgent)
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
// otomad.clearStore()

const handleCfgChange = (config: OtomadConfig) => {
  config.init().then(() => {
    if (audioCrx.playing) play()
  })
}


const audioCrx = reactive(new MyAudioContext())
const play = async () => {
  const { sound, midi } = otomad.curConfig
  if (!sound || !midi) return ElMessage.warning('请选择midi和sound')
  audioCrx.playMidi(midi, sound, audioCrx.progress)
}

const handleProgressChange = (progress: Arrayable<number>) => {
  if (!audioCrx.playing) return
  const { sound, midi } = otomad.curConfig
  audioCrx.playMidi(midi, sound, progress as number)
}

const pause = () => {
  audioCrx.pause()
}

const imageWidth = computed(() => (100 / audioCrx.counter.length))

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.code !== "Space") return
  if (document.activeElement?.nodeName === "INPUT") return

  if (audioCrx.playing) pause()
  else play()
}

const addConfig = () => {
  otomad.addConfig()
}

const save = () => {
  otomad.save()
    .then(() => ElMessage.success("保存成功"))
    .catch(() => ElMessage.error("保存失败"))
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
  overflow: hidden;

  &.is-mobile {
    transform: scale(0.5);
    transform-origin: 0 0;
    width: 200vw;
    height: 200vh;
  }

  .el-input,
  .el-select {
    backdrop-filter: blur(10px);

    .el-select__wrapper,
    .el-input__wrapper {
      border: solid 1px var(--el-color-primary);
    }

    .el-select__caret {
      color: var(--el-color-primary);
    }
  }

  .el-slider {
    .el-slider__runway {
      background-color: #41424366;
    }

    .el-slider__bar {
      background: linear-gradient(115deg, #4fcf70, #fad648);
      filter: hue-rotate(0deg);
      animation: hue-rotate 1s linear infinite;
      position: relative;

      &::after {
        content: '';
        position: absolute;
        top: -2px;
        left: 0;
        right: 0;
        bottom: -2px;
        background: inherit;
        filter: blur(5px);
        opacity: 0.7;
        z-index: -1;
      }
    }
  }

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

  .el-button {
    background: none;
  }

  .img-row {
    z-index: -100;
    position: relative;
    filter: drop-shadow(16px 16px 10px rgba(100, 100, 200, 0.2));

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

    .img-center {
      max-height: 30vh;
      margin-left: 50%;
      transform: translateX(-50%);
    }

    .siri-wave {
      z-index: -300;
      top: 20vh;
      filter: drop-shadow(16px 16px 10px rgba(128, 128, 128, 0.5)) blur(2px) opacity(80%);
    }
  }

  .dark-overlay {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    background: radial-gradient(circle at center, transparent 50%, rgba(0, 0, 10, 1) 100%);
    z-index: -200;
  }

  .el-dialog {
    --el-dialog-bg-color: #14141488;

  }

  .el-overlay .el-dialog {
    backdrop-filter: blur(10px);
  }

  .el-button {
    cursor: pointer;
    padding: 8px 25px;
    border: solid 2px var(--el-color-primary);
    position: relative;
    overflow: hidden;
    transition: 0.1s linear 0.1s;
  }

  .el-button span {
    color: rgba(255, 255, 255, 0.767);
    font-weight: 500;
    position: relative;
    z-index: 2;
    transition: 0.1s linear 0.1s;
  }

  .el-button::after {
    display: block;
    content: "";
    background-color: var(--el-color-primary);
    width: 200px;
    height: 200px;
    border-radius: 50%;
    position: absolute;
    top: 100%;
    transform: translateX(-50%);
    left: 50%;
    transition: 0.1s ease-in-out;
    z-index: 1;
  }

  .el-button:hover {
    box-shadow: 0px 0px 20px var(--el-color-primary);
  }

  .el-button:hover::after {
    top: -100%;
  }

  .el-button:hover span {
    color: white;
    transform: scale(1.1);
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

@keyframes hue-rotate {
  to {
    filter: hue-rotate(360deg);
  }
}
</style>

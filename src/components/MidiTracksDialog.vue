<template>
  <el-dialog title="音轨预览（点击轨道以启用/禁用）" v-model="visible" @close="close">
    <div class="visualized">
      <div v-for="(track, index) in visualizedMidi" :key="index" class="track" :class="{ selected: track.selected }"
        :style="{ width: `${time2px(track.endTime)}px`, display: `${track.notes.length ? 'block' : 'none'}` }"
        @click="selectTrack(track)">
        <div v-for="(note, index) in track.notes" :key="index" class="note"
          :style="{ width: `${time2px(note.end - note.start)}px`, left: `${time2px(note.start)}px`, bottom: `${note.pitch}%` }">
        </div>
      </div>
    </div>
  </el-dialog>
</template>


<script setup lang="ts">

import { ref } from 'vue'
import { ElDialog } from 'element-plus'
import { MidiTrack } from './logic'

const visible = ref(false)

const visualizedMidi = ref<MidiTrack[]>([])

const show = (tracks: MidiTrack[]) => {
  visualizedMidi.value = tracks
  visible.value = true
}

const close = () => {
  visible.value = false
}

const selectTrack = (track: MidiTrack) => {
  track.selected = !track.selected
}

defineExpose({ show })

const time2px = (t: number) => t / 5

</script>


<style scoped>
.wrapper {
  margin: 20px;
}

.visualized {
  overflow-x: auto;
}

.track {
  cursor: pointer;
  position: relative;
  border: 1px solid rgb(197.7, 225.9, 255);
  height: 80px;
  background-color: rgb(243.9, 244.2, 244.8);
}

.track.selected {
  background-color: rgb(235.9, 245.3, 255);
}

.note {
  position: absolute;
  height: 1px;
  background-color: rgb(51.2, 126.4, 204);
}
</style>

<template>
  <el-dialog title="图片预览" v-model="visible" @close="close">
    <div class="image-wrapper">
      <WittyDeer class="witty-deer">
        <el-image fit="contain" :src="image.src" v-if="image" />
      </WittyDeer>
    </div>
  </el-dialog>
</template>


<script setup lang="ts">

import { ref } from 'vue'
import { ElDialog, ElImage } from 'element-plus'
import { ImageFileItem } from './logic'
import WittyDeer from '@/components/uiverse/WittyDeer.vue'

const visible = ref(false)

const image = ref<ImageFileItem>()

const show = async (imageItem?: ImageFileItem) => {
  image.value = imageItem
  visible.value = true
}

const close = () => {
  visible.value = false
}

defineExpose({ show })

</script>


<style scoped>
.wrapper {
  margin: 20px;
}

.image-wrapper {
  text-align: center;
  height: 50vh;
}

:deep(.el-image) {
  margin: 20px auto;
  height: 50vh;
}

.witty-deer {
  margin: 0 auto;
  --h: 50vh;
  --w: 50vw;
}
</style>

<template>
  <el-dialog title="素材库" v-model="visible" @close="close" width="80%">
    <div class="folder-wrapper flex-row justify-between">
      <div v-for="cfg in libConfigs " :key="cfg.key" class="file-folder flex-col">
        <div class="folder-name">
          {{ cfg.key.toUpperCase() }}
        </div>
        <el-scrollbar height="40vh" wrap-class="file-list flex-1 p-10">
          <template v-for="file, index in cfg.fileList" :key="index">
            <div class="file-item flex-col mb-5">
              <el-image style="width: 100px; height: 100px" fit="contain" :src="(file as ImageFileItem).src"
                v-if="file.isImage" />
              <el-tag closable disable-transitions @close="handleDelete(cfg.fileList, file)" type="info" effect="dark">
                {{ file.name }}
              </el-tag>
            </div>
          </template>
        </el-scrollbar>
        <el-upload class="upload-area m-10" drag action="" multiple :auto-upload="false"
          @change="file => handleUpload(cfg.fileList, file)" :accept="cfg.accept" :show-file-list="false">
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        </el-upload>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">

import { ref, reactive, computed } from 'vue'
import type { UploadFile } from 'element-plus'
import { ElMessageBox, ElDialog, ElUpload, ElIcon, ElScrollbar, ElTag, ElImage } from 'element-plus'

import { UploadFilled } from '@element-plus/icons-vue'
import { OtomadMain, FileLibrary, FileItem, ImageFileItem } from './logic'


const visible = ref(false)

const state = reactive({
  library: {} as OtomadMain["fileLibrary"],
})

const libConfigs = computed(() => [
  { key: 'midi', fileList: state.library.midi, accept: 'audio/midi,audio/x - midi' },
  { key: 'sound', fileList: state.library.sound, accept: '.wav, .aiff, .aif, .flac, .alac, .m4a, .mp3, .ogg, .wma, .aac' },
  { key: 'image', fileList: state.library.image, accept: 'image/*' },
])

const handleDelete = async (folder: FileLibrary, file: FileItem) => {
  const confirm = await ElMessageBox.confirm(`确定删除【${file.name}】？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).catch(() => false)
  if (!confirm) return
  folder.remove(file)
}

const handleUpload = async (folder: FileLibrary, file: UploadFile) => {
  folder.addFile(file.raw as File)
}

const show = (library: OtomadMain["fileLibrary"]) => {
  visible.value = true
  state.library = library
}

const close = () => {
  visible.value = false
}


defineExpose({ show })

</script>

<style lang="less">
.folder-wrapper {
  gap: 20px;
  min-height: 50vh;

  .file-folder {
    flex-basis: 33%;
    background: rgba(0, 0, 0, 0.05);

    .folder-name {
      padding: 10px 0;
      font-size: 14px;
      text-align: center;
      border-bottom: 1px solid #ccc;
      color: #666;
      font-weight: bold;
    }

    .file-list {

      .file-item {
        display: inline-flex;
        align-items: center;
      }

      .file-item:not(:last-child) {
        margin-right: 10px;
      }
    }

    .upload-area {
      opacity: 0.8;
    }
  }
}
</style>
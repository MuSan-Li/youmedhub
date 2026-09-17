<script setup lang="ts">
import { ref } from 'vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { validateVideoFile } from '@/api/temporaryFile'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Upload, Link } from 'lucide-vue-next'
import { useLocale } from '@/composables/useLocale'

const va = useVideoAnalysis()
const { t } = useLocale()

const dragOver = ref(false)
const errorMsg = ref('')
const urlInput = ref('')
const showUrlInput = ref(false)

function checkDuration(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      if (video.duration > 600) {
        errorMsg.value = t('upload.durationLimit')
        resolve(false)
      } else {
        resolve(true)
      }
    }
    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      errorMsg.value = t('upload.readFail')
      resolve(false)
    }
    video.src = URL.createObjectURL(file)
  })
}

async function handleFile(file: File) {
  errorMsg.value = ''

  const validation = validateVideoFile(file)
  if (!validation.isValid) {
    errorMsg.value = validation.error || t('upload.validateFail')
    return
  }

  const durationOk = await checkDuration(file)
  if (!durationOk) return

  // 释放旧的 object URL
  if (va.localVideoUrl.value) {
    URL.revokeObjectURL(va.localVideoUrl.value)
  }

  // 创建本地预览 URL
  va.localVideoUrl.value = URL.createObjectURL(file)

  // 保存文件，不立即上传
  va.videoFile.value = file
  va.uploadStatus.value = 'idle'
  va.resetAnalysis()
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file) handleFile(file)
}

function onFileInput(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) handleFile(file)
}

function handleUrlInput() {
  if (!urlInput.value.trim()) {
    errorMsg.value = t('upload.urlRequired')
    return
  }
  if (!urlInput.value.startsWith('http')) {
    errorMsg.value = t('upload.urlInvalid')
    return
  }
  errorMsg.value = ''
  va.videoUrl.value = urlInput.value.trim()
  va.uploadStatus.value = 'success'
  va.videoFile.value = null // URL 方式不需要上传
  va.resetAnalysis()
}

// 清除视频文件
function handleClearVideo() {
  va.clearVideoFile()
  errorMsg.value = ''
}
</script>

<template>
  <Card
    class="flex flex-col items-center justify-center border-2 border-dashed p-6 transition-colors shadow-none"
    :class="dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'"
    @dragover.prevent="dragOver = true"
    @dragleave="dragOver = false"
    @drop.prevent="onDrop"
  >
    <!-- 已选择文件提示 -->
    <div v-if="va.videoFile.value" class="text-center">
      <p class="text-sm font-medium text-foreground">{{ va.videoFile.value.name }}</p>
      <p class="mt-1 text-xs text-muted-foreground">
        {{ t('upload.selected') }}
      </p>
      <Button
        variant="ghost"
        size="sm"
        class="mt-2 text-xs"
        @click="handleClearVideo"
      >
        {{ t('upload.reselect') }}
      </Button>
    </div>

    <!-- 上传/输入区域 -->
    <template v-else>
      <label class="flex cursor-pointer flex-col items-center gap-2">
        <Upload class="h-10 w-10 text-muted-foreground" />
        <span class="text-sm font-medium">{{ t('upload.dropzone') }}</span>
        <span class="text-xs text-muted-foreground">{{ t('upload.formatHint') }}</span>
        <input
          type="file"
          accept="video/mp4,video/quicktime,.mp4,.mov"
          class="hidden"
          @change="onFileInput"
        />
      </label>

      <!-- URL 输入区域 -->
      <div class="mt-4 w-full">
        <Button
          variant="ghost"
          size="sm"
          class="mb-2 text-xs"
          @click="showUrlInput = !showUrlInput"
        >
          <Link class="mr-1 h-3 w-3" />
          {{ showUrlInput ? t('upload.hideUrl') : t('upload.showUrl') }}
        </Button>
        <div v-if="showUrlInput" class="flex gap-2">
          <Input
            v-model="urlInput"
            :placeholder="t('upload.urlPlaceholder')"
            class="text-xs"
            @keyup.enter="handleUrlInput"
          />
          <Button size="sm" @click="handleUrlInput">{{ t('upload.confirm') }}</Button>
        </div>
      </div>
    </template>

    <p v-if="errorMsg" class="mt-2 text-xs text-destructive">{{ errorMsg }}</p>
  </Card>
</template>

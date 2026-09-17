<script setup lang="ts">
import { ref } from 'vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { useLocale } from '@/composables/useLocale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const { dashscopeApiKey, setDashscopeApiKey } = useVideoAnalysis()
const { t } = useLocale()

const dashscopeInput = ref(dashscopeApiKey.value)
const saved = ref(false)

function handleSave() {
  setDashscopeApiKey(dashscopeInput.value.trim())
  saved.value = true
  setTimeout(() => {
    saved.value = false
  }, 2000)
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <h1 class="text-2xl font-semibold">{{ t('settings.title') }}</h1>
    <p class="mt-2 text-muted-foreground">
      {{ t('settings.description') }}
    </p>

    <div class="mt-8 space-y-6">
      <!-- 阿里百炼 API Key -->
      <div class="space-y-2">
        <label class="text-sm font-medium">{{ t('apiKey.label') }}</label>
        <Input
          v-model="dashscopeInput"
          type="password"
          placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
        />
        <p class="text-xs text-muted-foreground">
          {{ t('settings.getKeyAt') }}
          <a
            href="https://dashscope.console.aliyun.com/apiKey"
            target="_blank"
            class="text-primary hover:underline"
          >
            dashscope.console.aliyun.com
          </a>
        </p>
      </div>

      <!-- 保存按钮 -->
      <Button class="w-full" @click="handleSave">
        {{ saved ? t('settings.saved') : t('settings.saveSettings') }}
      </Button>
    </div>
  </div>
</template>

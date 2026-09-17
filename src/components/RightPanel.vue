<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import ResultToolbar from '@/components/ResultToolbar.vue'
import MarkdownView from '@/components/MarkdownView.vue'
import ScriptTable from '@/components/ScriptTable.vue'
import ThinkingPanel from '@/components/ThinkingPanel.vue'
import AdSlot from '@/components/AdSlot.vue'
import { ADSENSE_SLOT_RESULT } from '@/lib/adsense'
import { useLocale } from '@/composables/useLocale'

const route = useRoute()
const va = useVideoAnalysis()
const { t } = useLocale()

const emptyState = computed(() => {
  if (route.name === 'create') {
    return {
      title: t('result.emptyCreateTitle'),
      description: t('result.emptyCreateDesc'),
    }
  }

  return {
    title: t('result.emptyAnalyzeTitle'),
    description: t('result.emptyAnalyzeDesc'),
  }
})
</script>

<template>
  <div class="flex flex-col overflow-hidden">
    <!-- 右侧上方工具栏 -->
    <ResultToolbar />

    <!-- 内容区 -->
    <div class="flex-1 overflow-auto p-4">
      <!-- 思考面板 -->
      <ThinkingPanel class="mb-4" />

      <template v-if="va.hasResult.value">
        <MarkdownView v-if="va.viewMode.value === 'markdown'" />
        <ScriptTable v-else />
      </template>
      <div v-else class="flex h-full items-center justify-center">
        <div class="text-center text-muted-foreground">
          <p class="text-lg">{{ emptyState.title }}</p>
          <p class="mt-1 text-sm">{{ emptyState.description }}</p>
        </div>
      </div>

      <!-- 广告位（结果区底部） -->
      <AdSlot :ad-slot="ADSENSE_SLOT_RESULT" />
    </div>
  </div>
</template>

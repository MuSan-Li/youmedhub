<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { useFavorites } from '@/composables/useFavorites'
import { AVAILABLE_MODELS } from '@/config/models'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Brain, Sparkles, FileText, ChevronDown, ChevronUp } from 'lucide-vue-next'
import { useLocale } from '@/composables/useLocale'
import { useModelSelect } from '@/composables/useModelSelect'

const va = useVideoAnalysis()
const favorites = useFavorites()
const { t } = useLocale()

// 创作参数
const topic = ref('')
const additionalNotes = ref('')

// 参考来源
const referenceSource = ref<'input' | 'favorite'>('input')
const referenceScript = ref('')
const selectedFavoriteId = ref('')

// 是否展开参考脚本
const isScriptExpanded = ref(false)

// 初始化：检查是否有待引用的参考脚本
onMounted(() => {
  favorites.loadFavorites()

  if (va.pendingReference.value) {
    referenceScript.value = va.pendingReference.value
    referenceSource.value = 'input'
    // 清除待引用状态
    va.clearPendingReference()
  }
})

// 本地计算属性
const enableThinkingModel = computed({
  get: () => va.enableThinking.value,
  set: (val: boolean) => { va.enableThinking.value = val }
})

// 模型选择（无已绑定文件场景，不显示切换提示）
const { selectedModelId } = useModelSelect('', () => false)

// 选中的收藏
const selectedFavorite = computed(() => {
  if (!selectedFavoriteId.value) return null
  return favorites.favorites.value.find(f => f.id === selectedFavoriteId.value)
})

// 参考脚本预览
const referencePreview = computed(() => {
  if (referenceSource.value === 'favorite' && selectedFavorite.value) {
    return selectedFavorite.value.raw_markdown?.slice(0, 500) + '...'
  }
  if (referenceSource.value === 'input' && referenceScript.value) {
    return referenceScript.value.slice(0, 500) + (referenceScript.value.length > 500 ? '...' : '')
  }
  return ''
})

// 从收藏加载
function loadFromFavorite() {
  if (selectedFavorite.value) {
    referenceScript.value = selectedFavorite.value.raw_markdown || ''
  }
}

// 检查是否可以生成
const canGenerate = computed(() => {
  const hasTopic = topic.value.trim().length >= 2
  const hasReference = referenceSource.value === 'input'
    ? referenceScript.value.trim().length >= 50
    : !!selectedFavoriteId.value
  return hasTopic && hasReference && va.currentApiKey.value
})

// 暴露给父组件
defineExpose({
  canGenerate,
  getParams: () => ({
    topic: topic.value,
    additionalNotes: additionalNotes.value,
    referenceScript: referenceSource.value === 'favorite' && selectedFavorite.value
      ? selectedFavorite.value.raw_markdown
      : referenceScript.value,
  }),
})
</script>

<template>
  <div class="space-y-4">
    <!-- 主题输入 -->
    <div class="space-y-2">
      <Label for="topic" class="flex items-center gap-2">
        <Sparkles class="h-4 w-4" />
        {{ t('reference.newTopic') }}
      </Label>
      <Input
        id="topic"
        v-model="topic"
        :placeholder="t('reference.topicPlaceholder')"
        maxlength="100"
      />
      <p class="text-xs text-muted-foreground">
        {{ t('reference.topicHint') }}
      </p>
    </div>

    <!-- 参考来源选择 -->
    <div class="space-y-2">
      <Label class="flex items-center gap-2">
        <FileText class="h-4 w-4" />
        {{ t('reference.source') }}
      </Label>
      <div class="flex gap-2">
        <Button
          :variant="referenceSource === 'input' ? 'default' : 'outline'"
          size="sm"
          @click="referenceSource = 'input'"
        >
          {{ t('reference.manualInput') }}
        </Button>
        <Button
          :variant="referenceSource === 'favorite' ? 'default' : 'outline'"
          size="sm"
          @click="referenceSource = 'favorite'"
        >
          {{ t('reference.fromFavorite') }}
        </Button>
      </div>
    </div>

    <!-- 手动输入参考脚本 -->
    <div v-if="referenceSource === 'input'" class="space-y-2">
      <Label for="reference">{{ t('reference.scriptLabel') }}</Label>
      <Textarea
        id="reference"
        v-model="referenceScript"
        :placeholder="t('reference.scriptPlaceholder')"
        rows="6"
        maxlength="10000"
      />
      <p class="text-xs text-muted-foreground">
        {{ t('reference.scriptHint') }}
      </p>
    </div>

    <!-- 从收藏选择 -->
    <div v-else class="space-y-2">
      <Label>{{ t('reference.selectFavorite') }}</Label>
      <Select v-model="selectedFavoriteId" @update:model-value="loadFromFavorite">
        <SelectTrigger>
          <SelectValue :placeholder="t('reference.selectFavoritePlaceholder')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="item in favorites.favorites.value"
            :key="item.id"
            :value="item.id"
          >
            {{ item.title }}
          </SelectItem>
        </SelectContent>
      </Select>
      <p v-if="favorites.favorites.value.length === 0" class="text-xs text-muted-foreground">
        {{ t('reference.noFavorites') }}
      </p>
    </div>

    <!-- 参考脚本预览 -->
    <div v-if="referencePreview" class="space-y-2">
      <div class="flex items-center justify-between">
        <Label class="text-muted-foreground text-xs">{{ t('reference.preview') }}</Label>
        <Button
          variant="ghost"
          size="sm"
          class="h-6 px-2"
          @click="isScriptExpanded = !isScriptExpanded"
        >
          {{ isScriptExpanded ? t('reference.collapse') : t('reference.expand') }}
          <ChevronUp v-if="isScriptExpanded" class="h-3 w-3 ml-1" />
          <ChevronDown v-else class="h-3 w-3 ml-1" />
        </Button>
      </div>
      <div
        class="rounded-md bg-muted/50 p-3 text-xs font-mono overflow-auto"
        :class="isScriptExpanded ? 'max-h-64' : 'max-h-20'"
      >
        <pre class="whitespace-pre-wrap text-muted-foreground">{{ referencePreview }}</pre>
      </div>
    </div>

    <!-- 补充说明 -->
    <div class="space-y-2">
      <Label for="notes">{{ t('reference.notes') }}</Label>
      <Textarea
        id="notes"
        v-model="additionalNotes"
        :placeholder="t('reference.notesPlaceholder')"
        rows="2"
        maxlength="500"
      />
    </div>

    <!-- 模型选择 + 思考模式 -->
    <div class="flex items-center gap-3">
      <!-- 模型选择 -->
      <Select v-model="selectedModelId">
        <SelectTrigger class="h-8 w-auto min-w-[140px]">
          <SelectValue :placeholder="t('analyze.selectModel')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="model in AVAILABLE_MODELS"
            :key="model.id"
            :value="model.id"
          >
            {{ model.name }}
          </SelectItem>
        </SelectContent>
      </Select>

      <!-- 分隔线 -->
      <div class="w-px h-6 bg-border" />

      <!-- 思考模式 -->
      <div class="flex items-center gap-2">
        <Brain class="h-4 w-4 text-muted-foreground" />
        <Switch v-model:checked="enableThinkingModel" />
      </div>
    </div>

    <!-- API Key 状态提示 -->
    <div v-if="!va.currentApiKey.value" class="rounded-md bg-muted p-3 text-xs text-muted-foreground">
      {{ t('analyze.apiKeyRequired') }}
    </div>
  </div>
</template>

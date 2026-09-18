<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { generateWithImages } from '@/api/analysis'
import { uploadToTemporaryFile } from '@/api/temporaryFile'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { useFavorites } from '@/composables/useFavorites'
import { useLocale } from '@/composables/useLocale'
import { AVAILABLE_MODELS } from '@/config/models'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import ImageUploader from '@/components/ImageUploader.vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles, AlertTriangle, Brain } from 'lucide-vue-next'

const va = useVideoAnalysis()
const favorites = useFavorites()
const { locale, t } = useLocale()

interface VideoTypeConfig {
  key: string
  label: string
  template: string
  fields: Array<{ key: string; label: string }>
}

// 模板由字段标题生成，语言切换后自动跟随
function templateFromFields(fields: Array<{ key: string; label: string }>): string {
  return `${fields.map(f => `## ${f.label}`).join('\n\n\n')}\n`
}

// 删除使用场景类，增加自定义
const videoTypes = computed<VideoTypeConfig[]>(() => {
  const freeFields = [{ key: 'requirement', label: t('field.requirement') }]
  const ecommerceFields = [
    { key: 'productName', label: t('field.productName') },
    { key: 'heroSpec', label: t('field.heroSpec') },
    { key: 'coreSellingPoint', label: t('field.coreSellingPoint') },
    { key: 'priceOffer', label: t('field.priceOffer') },
    { key: 'targetAudience', label: t('field.targetAudience') },
    { key: 'trustProof', label: t('field.trustProof') },
    { key: 'cta', label: t('field.cta') },
  ]
  const sellingPointFields = [
    { key: 'sellingPoint1', label: t('field.sellingPointN', { n: 1 }) },
    { key: 'sellingPoint2', label: t('field.sellingPointN', { n: 2 }) },
    { key: 'sellingPoint3', label: t('field.sellingPointN', { n: 3 }) },
    { key: 'proofMethod', label: t('field.proofMethod') },
    { key: 'priority', label: t('field.priority') },
    { key: 'objectionHandling', label: t('field.objectionHandling') },
  ]
  const unboxingFields = [
    { key: 'unboxingHighlight', label: t('field.unboxingHighlight') },
    { key: 'reviewDimensions', label: t('field.reviewDimensions') },
    { key: 'testScenario', label: t('field.testScenario') },
    { key: 'prosCons', label: t('field.prosCons') },
    { key: 'conclusion', label: t('field.conclusion') },
    { key: 'targetUserFit', label: t('field.targetUserFit') },
  ]
  const comparisonFields = [
    { key: 'comparisonTarget', label: t('field.comparisonTarget') },
    { key: 'comparisonDimension', label: t('field.comparisonDimension') },
    { key: 'baselineRule', label: t('field.baselineRule') },
    { key: 'keyDifference', label: t('field.keyDifference') },
    { key: 'recommendReason', label: t('field.recommendReason') },
    { key: 'applicableAudience', label: t('field.applicableAudience') },
    { key: 'purchaseAdvice', label: t('field.purchaseAdvice') },
  ]

  const freeTemplate = locale.value === 'en'
    ? `## Video brief\n\nDescribe your video needs freely, including:\n- Product / service info\n- Target audience\n- Key selling points\n- Style & tone\n- Duration\n`
    : `## 视频要求\n\n在此自由描述你的视频需求，包括：\n- 产品/服务信息\n- 目标受众\n- 核心卖点\n- 风格调性\n- 时长要求\n`

  return [
    { key: 'free', label: t('videoType.free'), fields: freeFields, template: freeTemplate },
    { key: 'ecommerce', label: t('videoType.ecommerce'), fields: ecommerceFields, template: templateFromFields(ecommerceFields) },
    { key: 'sellingPoint', label: t('videoType.sellingPoint'), fields: sellingPointFields, template: templateFromFields(sellingPointFields) },
    { key: 'unboxing', label: t('videoType.unboxing'), fields: unboxingFields, template: templateFromFields(unboxingFields) },
    { key: 'comparison', label: t('videoType.comparison'), fields: comparisonFields, template: templateFromFields(comparisonFields) },
  ]
})

const selectedVideoType = ref(videoTypes.value[0]?.key || '')
const requirementText = ref('')
const hasUserEdited = ref(false)

// 覆盖确认弹窗
const showOverwriteConfirm = ref(false)
const pendingVideoType = ref('')

// AI 优化
const aiOptimizing = ref(false)
const aiOptimizeError = ref('')

const duration = ref('')
const scriptCount = ref('1')

// 参考脚本 - 直接选择收藏
const selectedFavoriteId = ref('_none')

const selectedVideoTypeConfig = computed(() =>
  videoTypes.value.find(item => item.key === selectedVideoType.value) || null
)

const selectedFavorite = computed(() => {
  if (!selectedFavoriteId.value || selectedFavoriteId.value === '_none') return null
  return favorites.favorites.value.find(item => item.id === selectedFavoriteId.value) || null
})

const resolvedReferenceScript = computed(() => {
  return selectedFavorite.value?.raw_markdown?.trim() || ''
})

const scriptCountNumber = computed(() => {
  const num = Number.parseInt(scriptCount.value, 10)
  if (Number.isNaN(num)) return 1
  return Math.min(5, Math.max(1, num))
})

// 提示清除定时器（切换多次时先清旧定时器，避免新提示被提前清掉）
let modelChangeTimer: ReturnType<typeof setTimeout> | null = null

const selectedModelId = computed({
  get: () => va.selectedModel.value.id,
  set: (val: string) => {
    const oldModelId = va.selectedModel.value.id
    const model = AVAILABLE_MODELS.find(m => m.id === val)
    if (model) {
      va.setSelectedModel(model)
      // 如果模型变化且有已上传的文件，显示提示（5 秒后自动清除）
      if (oldModelId && oldModelId !== val && va.imageUrls.value.length > 0) {
        modelChangeMessage.value = t('panel.modelChangedImages')
        if (modelChangeTimer) clearTimeout(modelChangeTimer)
        modelChangeTimer = setTimeout(() => {
          modelChangeMessage.value = ''
          modelChangeTimer = null
        }, 5000)
      }
    }
  },
})

// 思考模式开关
const enableThinking = computed({
  get: () => va.enableThinking.value,
  set: (val: boolean) => {
    va.enableThinking.value = val
  },
})

// 图片引用提示
const imageHint = computed(() => {
  const count = va.imageFiles.value.length
  if (count === 0) return ''
  const refs = Array.from({ length: count }, (_, i) => `@${t('panel.imageRefTag', { n: i + 1 })}`).join(' ')
  return t('panel.imageHint', { refs })
})

const canGenerate = computed(() => {
  if (!va.currentApiKey.value) return false
  const text = requirementText.value.trim()
  if (!text) return false
  const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('##'))
  return lines.length > 0
})

// 模型切换提示
const modelChangeMessage = ref('')

function handleVideoTypeChange(typeKey: string) {
  if (typeKey === selectedVideoType.value) return

  if (hasUserEdited.value && requirementText.value.trim()) {
    pendingVideoType.value = typeKey
    showOverwriteConfirm.value = true
  } else {
    applyVideoType(typeKey)
  }
}

function applyVideoType(typeKey: string) {
  const config = videoTypes.value.find(item => item.key === typeKey)
  if (!config) return

  selectedVideoType.value = typeKey
  requirementText.value = config.template
  hasUserEdited.value = false
}

function confirmOverwrite() {
  showOverwriteConfirm.value = false
  applyVideoType(pendingVideoType.value)
  pendingVideoType.value = ''
}

function cancelOverwrite() {
  showOverwriteConfirm.value = false
  pendingVideoType.value = ''
}

function handleTextareaInput() {
  hasUserEdited.value = true
}

// 语言切换后刷新模板标题语言（仅限用户未编辑过内容时；已填写的内容优先保留）
watch(locale, () => {
  if (hasUserEdited.value) return
  const config = videoTypes.value.find(item => item.key === selectedVideoType.value)
  if (config) {
    requirementText.value = config.template
  }
})

function parseTextToFields(text: string, fields: Array<{ key: string; label: string }>): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = text.split('\n')
  let currentKey = ''
  let currentValue: string[] = []

  for (const line of lines) {
    const headerMatch = line.match(/^##\s*(.+)$/)
    if (headerMatch) {
      if (currentKey) {
        result[currentKey] = currentValue.join('\n').trim()
      }
      const headerLabel = headerMatch[1].trim()
      const field = fields.find(f => f.label === headerLabel)
      currentKey = field?.key || ''
      currentValue = []
    } else if (currentKey) {
      currentValue.push(line)
    }
  }

  if (currentKey) {
    result[currentKey] = currentValue.join('\n').trim()
  }

  return result
}

function buildAiOptimizePrompt(): string {
  const config = selectedVideoTypeConfig.value
  if (!config) return ''

  const currentFields = parseTextToFields(requirementText.value, config.fields)
  const fieldsDesc = config.fields
    .map(f => `- ${f.key}（${f.label}）：${currentFields[f.key] || '（未填写）'}`)
    .join('\n')

  const fieldLabels = config.fields.map(f => f.label).join('、')

  return `你是短视频商业脚本策划专家。请基于用户填写的内容进行优化，使其更加具体、可执行、有转化力。

要求：
1. 直接输出 Markdown 格式，不要输出解释或代码块标记。
2. 每个字段使用二级标题格式：## 字段名称
3. 字段内容紧跟在标题下方，空一行后写内容。
4. 必须覆盖所有字段：${fieldLabels}
5. 每个字段内容控制在 10-50 字，具体且可落地，避免空泛口号。
6. 如果原内容为空或不够具体，请根据视频类型补齐合理的建议内容。
7. 保持专业、简洁的表达风格。
8. 如果有参考图片，请结合图片内容进行优化。
${locale.value === 'en' ? '9. Write the optimized content in English (translate field titles and content accordingly).\n' : ''}
视频类型：${config.label}
当前字段内容：
${fieldsDesc}

请直接输出优化后的 Markdown 内容：
`
}

async function handleAiOptimize() {
  if (!va.currentApiKey.value) {
    aiOptimizeError.value = t('analyze.apiKeyRequired')
    return
  }
  if (!selectedVideoTypeConfig.value) {
    aiOptimizeError.value = t('panel.aiOptimizeNoType')
    return
  }

  aiOptimizing.value = true
  aiOptimizeError.value = ''

  // 用于收集流式输出
  let streamedContent = ''

  try {
    // 1. 上传图片到临时存储（如果有的话，与模型绑定）
    const uploadedImageUrls: string[] = []
    const model = va.selectedModel.value.id
    const apiKey = va.currentApiKey.value
    if (!apiKey) {
      throw new Error(t('analyze.apiKeyRequired'))
    }
    for (let i = 0; i < va.imageFiles.value.length; i++) {
      const file = va.imageFiles.value[i]
      // 如果已经有 URL 了，直接使用
      if (va.imageUrls.value[i]) {
        uploadedImageUrls.push(va.imageUrls.value[i])
      } else {
        // 上传到百炼临时存储
        const result = await uploadToTemporaryFile(file, model, apiKey)
        uploadedImageUrls.push(result.downloadLink)
        // 保存 URL 避免重复上传
        va.imageUrls.value[i] = result.downloadLink
      }
    }

    // 2. 构建提示词
    const prompt = buildAiOptimizePrompt()

    // 3. 调用 AI（流式）- qwen3.8 系列支持多模态
    if (uploadedImageUrls.length > 0) {
      // 有图片，使用多模态 API
      await generateWithImages({
        apiKey: va.currentApiKey.value,
        model,
        prompt,
        imageUrls: uploadedImageUrls,
        onChunk: (chunk) => {
          streamedContent += chunk
          // 实时更新显示
          requirementText.value = streamedContent
        },
      })
    } else {
      // 无图片，使用普通流式 API
      const { generateText } = await import('@/api/analysis')
      await generateText({
        apiKey: va.currentApiKey.value,
        model,
        prompt,
        onChunk: (chunk) => {
          streamedContent += chunk
          // 实时更新显示
          requirementText.value = streamedContent
        },
      })
    }

    hasUserEdited.value = true
  } catch (error) {
    aiOptimizeError.value = error instanceof Error ? error.message : t('panel.aiOptimizeFail')
  } finally {
    aiOptimizing.value = false
  }
}

onMounted(() => {
  favorites.loadFavorites()

  if (videoTypes.value[0]) {
    requirementText.value = videoTypes.value[0].template
  }

  if (va.pendingReference.value.trim()) {
    // 从收藏中选择匹配的脚本
    const matched = favorites.favorites.value.find(
      f => f.raw_markdown === va.pendingReference.value
    )
    if (matched) {
      selectedFavoriteId.value = matched.id
    }
    va.clearPendingReference()
  }
})

defineExpose({
  canGenerate,
  getParams: () => ({
    videoType: selectedVideoType.value,
    videoTypeLabel: selectedVideoTypeConfig.value?.label || '',
    requirementText: requirementText.value,
    duration: duration.value,
    referenceScript: resolvedReferenceScript.value,
    scriptCount: scriptCountNumber.value,
  }),
})
</script>

<template>
  <div class="space-y-4">
    <!-- 参考图片 - 放在最上方 -->
    <div class="space-y-2">
      <Label class="text-xs font-normal text-muted-foreground">{{ t('panel.referenceImage') }}</Label>
      <ImageUploader />
    </div>

    <!-- 视频类型选择 -->
    <div class="space-y-2">
      <Label class="text-xs font-normal text-muted-foreground">{{ t('panel.videoType') }}</Label>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="item in videoTypes"
          :key="item.key"
          type="button"
          class="px-2.5 py-1 text-xs font-normal rounded-md border transition-colors"
          :class="selectedVideoType === item.key
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-transparent hover:bg-accent hover:text-accent-foreground'"
          @click="handleVideoTypeChange(item.key)"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <!-- 视频要求 -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <Label class="text-xs font-normal text-muted-foreground">{{ t('panel.videoRequirement') }}</Label>
        <Button
          variant="ghost"
          size="sm"
          class="h-6 px-2 text-xs font-normal"
          :disabled="aiOptimizing || !va.currentApiKey.value"
          @click="handleAiOptimize"
        >
          <Loader2 v-if="aiOptimizing" class="mr-1 h-3 w-3 animate-spin" />
          <Sparkles v-else class="mr-1 h-3 w-3" />
          {{ t('panel.aiOptimize') }}
        </Button>
      </div>
      <Textarea
        v-model="requirementText"
        rows="10"
        class="font-mono text-sm"
        :placeholder="t('panel.requirementPlaceholder')"
        @input="handleTextareaInput"
      />
      <div class="flex items-center justify-between">
        <p v-if="imageHint" class="text-[10px] text-muted-foreground">
          {{ imageHint }}
        </p>
        <p v-else class="text-[10px] text-muted-foreground">
          {{ t('panel.requirementHint') }}
        </p>
      </div>
      <p v-if="aiOptimizeError" class="text-xs text-destructive">
        {{ aiOptimizeError }}
      </p>
    </div>

    <!-- 参考脚本 - 直接下拉选择收藏 -->
    <div class="space-y-2">
      <Label class="text-xs font-normal text-muted-foreground">{{ t('panel.referenceScript') }}</Label>
      <Select v-model="selectedFavoriteId">
        <SelectTrigger class="h-8">
          <SelectValue :placeholder="t('panel.selectFavoritePlaceholder')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_none">
            {{ t('panel.noReference') }}
          </SelectItem>
          <SelectItem
            v-for="item in favorites.favorites.value"
            :key="item.id"
            :value="item.id"
          >
            {{ item.title }}
          </SelectItem>
        </SelectContent>
      </Select>
      <p v-if="favorites.favorites.value.length === 0" class="text-[10px] text-muted-foreground">
        {{ t('panel.noFavoritesHint') }}
      </p>
    </div>

    <!-- 时长和数量 -->
    <div class="grid grid-cols-2 gap-3">
      <div class="space-y-2">
        <Label class="text-xs font-normal text-muted-foreground">{{ t('panel.durationLabel') }}</Label>
        <Input
          v-model="duration"
          type="text"
          :placeholder="t('panel.durationPlaceholder')"
          class="h-8"
        />
      </div>

      <div class="space-y-2">
        <Label class="text-xs font-normal text-muted-foreground">{{ t('panel.scriptCountLabel') }}</Label>
        <div class="flex gap-1.5">
          <button
            v-for="n in 3"
            :key="n"
            type="button"
            class="flex-1 h-8 text-xs font-normal rounded-md border transition-colors"
            :class="scriptCount === String(n)
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-transparent hover:bg-accent hover:text-accent-foreground'"
            @click="scriptCount = String(n)"
          >
            {{ n }}
          </button>
        </div>
      </div>
    </div>

    <!-- 模型选择 + 思考模式（一行，各占 50%） -->
    <div class="space-y-2">
      <Label class="text-xs font-normal text-muted-foreground">{{ t('analyze.modelLabel') }}</Label>
      <div class="flex items-center gap-3">
        <Select v-model="selectedModelId" class="flex-1" :disabled="va.isAnalyzing.value || aiOptimizing">
          <SelectTrigger class="h-8 w-full">
            <SelectValue :placeholder="t('analyze.selectModel')" />
          </SelectTrigger>
          <SelectContent class="max-w-[50vw]">
            <SelectItem
              v-for="model in AVAILABLE_MODELS"
              :key="model.id"
              :value="model.id"
            >
              {{ model.name }}
            </SelectItem>
          </SelectContent>
        </Select>

        <!-- 思考模式按钮 -->
        <Button
          variant="outline"
          size="sm"
          class="h-8 gap-1.5 px-3 flex-1"
          :class="enableThinking && 'bg-purple-100 border-purple-300 hover:bg-purple-200'"
          :disabled="!va.currentApiKey.value"
          @click="enableThinking = !enableThinking"
        >
          <Brain class="h-4 w-4 text-purple-500" />
          <span class="text-purple-700">{{ t('analyze.thinking') }}</span>
        </Button>
      </div>
    </div>

    <div v-if="modelChangeMessage" class="rounded-md bg-blue-500/10 p-2 text-[10px] text-blue-600">
      {{ modelChangeMessage }}
    </div>

    <div v-if="!va.currentApiKey.value" class="rounded-md bg-muted p-2 text-[10px] text-muted-foreground">
      {{ t('analyze.apiKeyRequired') }}
    </div>

    <!-- 覆盖确认弹窗 -->
    <AlertDialog :open="showOverwriteConfirm" @update:open="showOverwriteConfirm = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle class="flex items-center gap-2">
            <AlertTriangle class="h-5 w-5 text-yellow-500" />
            {{ t('panel.overwriteTitle') }}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {{ t('panel.overwriteDesc') }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="cancelOverwrite">{{ t('panel.overwriteCancel') }}</AlertDialogCancel>
          <AlertDialogAction @click="confirmOverwrite">{{ t('panel.overwriteConfirm') }}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

/**
 * 模型选择 composable
 * 统一「选中模型 + 切换时重传提示」逻辑（原 AnalysisControl / CreateModePanel / ReferenceModePanel 三处复制）。
 *
 * - messageKey 为空时不显示提示（ReferenceModePanel 场景）
 * - hasBoundFiles 决定是否提示（临时文件与模型绑定，切换后需重传）
 */
import { ref, computed } from 'vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { useLocale } from '@/composables/useLocale'
import { AVAILABLE_MODELS } from '@/config/models'

export function useModelSelect(messageKey: string, hasBoundFiles: () => boolean) {
  const va = useVideoAnalysis()
  const { t } = useLocale()

  const modelChangeMessage = ref('')
  // 提示清除定时器（连续切换时先清旧定时器，避免新提示被提前清掉）
  let clearTimer: ReturnType<typeof setTimeout> | null = null

  const selectedModelId = computed<string>({
    get: () => va.selectedModel.value.id,
    set: (val: string) => {
      const oldModelId = va.selectedModel.value.id
      const model = AVAILABLE_MODELS.find(m => m.id === val)
      if (!model || oldModelId === val) return

      va.setSelectedModel(model)

      // 模型变化且有模型绑定的已上传文件时提示（5 秒后自动清除）
      if (messageKey && hasBoundFiles()) {
        modelChangeMessage.value = t(messageKey)
        if (clearTimer) clearTimeout(clearTimer)
        clearTimer = setTimeout(() => {
          modelChangeMessage.value = ''
          clearTimer = null
        }, 5000)
      }
    },
  })

  return { selectedModelId, modelChangeMessage }
}

import type { VideoAnalysisResponse, TokenUsage } from '../types/video'
import { uploadToTemporaryFile, validateVideoFile } from './temporaryFile'
import {
  VIDEO_ANALYSIS_PROMPT,
  buildPromptByMode,
  buildTranscriptSection,
  getPromptByMode,
  type AnalysisMode,
  type CreatePromptContext,
  type ReferencePromptContext,
  type OutputLocale,
} from '../prompts/videoAnalysis'
import type { TranscriptSentence } from './asr'
import * as analysis from './analysis'
import type { ModelConfig } from '@/config/models'
import { AVAILABLE_MODELS, MODELS_BY_PROVIDER, getModelById, DEFAULT_MODEL_ID } from '@/config/models'
import { useLocale } from '@/composables/useLocale'

// 导出提示词供组件使用
export { VIDEO_ANALYSIS_PROMPT, buildPromptByMode, getPromptByMode }
export type { AnalysisMode, CreatePromptContext, ReferencePromptContext, OutputLocale }

// 导出模型相关
export { AVAILABLE_MODELS, MODELS_BY_PROVIDER, getModelById }
export type { ModelConfig }

// AI 模型类型
// 注意：qwen3.7-max 为纯文本模型，不支持视频/图片输入，不在此列
export type AIModel = 'qwen3.8-flash' | 'qwen3.8-max' | 'qwen3.7-flash' | 'qwen3.7-plus'

// 流式输出回调类型
export type StreamCallback = (chunk: string) => void

// Token 使用回调类型
export type TokenUsageCallback = (usage: TokenUsage) => void

// 思考内容回调类型
export type ReasoningCallback = (chunk: string) => void

// 分析参数接口
export interface AnalysisParams {
  enableThinking?: boolean
}

interface BaseRequestOptions {
  apiKey: string
  model?: AIModel
  customPrompt?: string
  locale?: OutputLocale
  onProgress?: (message: string) => void
  onStream?: StreamCallback
  onTokenUsage?: TokenUsageCallback
  params?: AnalysisParams
  onReasoning?: ReasoningCallback
}

export interface AnalyzeVideoOptions extends BaseRequestOptions {
  source: File | string
  mode?: AnalysisMode
  /** ASR 前置转写（句级，带时间戳），注入提示词供台词列抄录；缺省则退回模型自身听觉 */
  audioTranscript?: TranscriptSentence[]
}

export interface GenerateCreateScriptOptions extends BaseRequestOptions {
  mode: 'create'
  context: CreatePromptContext
}

export interface GenerateReferenceScriptOptions extends BaseRequestOptions {
  mode: 'reference'
  context: ReferencePromptContext
}

export type GenerateScriptOptions = GenerateCreateScriptOptions | GenerateReferenceScriptOptions

// 解析 Markdown 表格转换为 JSON
function parseMarkdownTable(markdown: string): VideoAnalysisResponse {
  const { t } = useLocale()
  const lines = markdown.trim().split('\n')
  const rep: VideoAnalysisResponse['rep'] = []

  // 找到表格开始位置（包含表头的行）
  // 中文表头：兼容 '运镜方式' 或 '运镜'
  // 英文表头：'No.' + 'Shot' + 'Camera'
  const isHeaderLine = (line: string): boolean => {
    if (!line) return false
    const isZh = line.includes('序号') && line.includes('景别') && (line.includes('运镜方式') || line.includes('运镜'))
    const isEn = line.includes('No.') && line.includes('Shot') && line.includes('Camera')
    return isZh || isEn
  }

  let tableStartIndex = -1
  for (let i = 0; i < lines.length; i += 1) {
    if (isHeaderLine(lines[i])) {
      tableStartIndex = i
      break
    }
  }

  if (tableStartIndex === -1) {
    throw new Error(t('api.noTable'))
  }

  // 跳过表头和分隔线，从数据行开始解析
  for (let i = tableStartIndex + 2; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line || !line.trim() || !line.startsWith('|')) continue

    // 分割单元格：仅去除行首尾 | 产生的空串，保留中间的空单元格
    // （filter 会删掉空单元格导致后续列整体左移错位）
    let cells = line.split('|').map(cell => cell.trim())
    if (cells[0] === '') cells = cells.slice(1)
    if (cells.length > 0 && cells[cells.length - 1] === '') cells = cells.slice(0, -1)

    if (cells.length >= 11) {
      rep.push({
        sequenceNumber: Number.parseInt(cells[0] || '0', 10) || 0,
        shotType: cells[1] || '',
        cameraMovement: cells[2] || '',
        visualContent: cells[3] || '',
        shootingGuide: cells[4] || '',
        onScreenText: cells[5] || '',
        voiceover: cells[6] || '',
        audio: cells[7] || '',
        startTime: cells[8] || '',
        endTime: cells[9] || '',
        duration: cells[10] || '',
      })
    } else {
      console.warn(`表格第 ${i} 行列数不足（${cells.length} < 11），跳过`)
    }
  }

  if (rep.length === 0) {
    throw new Error(t('api.noRows'))
  }

  return { rep }
}

// 解析错误信息
function parseErrorMessage(error: unknown): string {
  const { t } = useLocale()
  if (!(error instanceof Error)) {
    return t('api.requestFail')
  }

  const message = error.message || ''

  if (message.includes('SafetyError') || message.includes('DataInspection')) {
    return t('api.safetyError')
  }
  if (message.includes('InvalidParameter')) {
    return t('api.invalidParameter')
  }
  if (message.includes('TooLarge') || message.includes('size') || message.includes('Exceeded limit')) {
    return t('api.tooLarge')
  }
  if (message.includes('AuthenticationNotPass') || message.includes('401')) {
    return t('api.authFail')
  }
  if (message.includes('Throttling')) {
    return t('api.throttling')
  }

  return message || t('api.requestFail')
}

function resolvePrompt(
  mode: AnalysisMode,
  customPrompt: string | undefined,
  locale: OutputLocale,
  context?: CreatePromptContext | ReferencePromptContext
): string {
  const normalizedCustomPrompt = customPrompt?.trim()
  if (normalizedCustomPrompt) {
    return normalizedCustomPrompt
  }

  if (mode === 'create') {
    if (!context || !('topic' in context)) {
      throw new Error('从零创作模式缺少创作参数')
    }
    return buildPromptByMode('create', context, locale)
  }

  if (mode === 'reference') {
    if (!context || !('referenceScript' in context)) {
      throw new Error('参考生成模式缺少参考脚本')
    }
    return buildPromptByMode('reference', context, locale)
  }

  return getPromptByMode('analyze', locale)
}

// 使用视频 URL 分析（核心分析逻辑）
async function analyzeVideoByUrl(
  videoUrl: string,
  apiKey: string,
  model: AIModel,
  prompt: string,
  onProgress?: (message: string) => void,
  onStream?: StreamCallback,
  onTokenUsage?: TokenUsageCallback,
  params?: AnalysisParams,
  onReasoning?: ReasoningCallback
): Promise<VideoAnalysisResponse> {
  const { t } = useLocale()
  onProgress?.(t('api.callingAi'))

  const fullContent = await analysis.analyzeVideo({
    model,
    apiKey,
    videoUrl,
    prompt,
    onChunk: onStream,
    onUsage: onTokenUsage,
    enableThinking: params?.enableThinking,
    onReasoningChunk: onReasoning,
  })

  onProgress?.(t('api.parsingResult'))
  return parseMarkdownTable(fullContent)
}

// 通过临时文件服务分析视频（主要方法）
async function analyzeVideoByTemporaryFile(
  file: File,
  apiKey: string,
  model: AIModel,
  prompt: string,
  onProgress?: (message: string) => void,
  onStream?: StreamCallback,
  onTokenUsage?: TokenUsageCallback,
  params?: AnalysisParams,
  onReasoning?: ReasoningCallback
): Promise<VideoAnalysisResponse> {
  const { t } = useLocale()
  const validation = validateVideoFile(file)
  if (!validation.isValid) {
    throw new Error(validation.error)
  }

  onProgress?.(t('api.uploadingTemp'))

  const uploadResult = await uploadToTemporaryFile(file, model, apiKey)

  onProgress?.(t('api.uploadedCallingAi'))

  return analyzeVideoByUrl(
    uploadResult.downloadLink,
    apiKey,
    model,
    prompt,
    onProgress,
    onStream,
    onTokenUsage,
    params,
    onReasoning
  )
}

// 统一视频分析接口
export async function analyzeVideo(options: AnalyzeVideoOptions): Promise<VideoAnalysisResponse> {
  const {
    source,
    apiKey,
    model = DEFAULT_MODEL_ID as AIModel,
    mode = 'analyze',
    customPrompt,
    locale = 'zh',
    audioTranscript,
    onProgress,
    onStream,
    onTokenUsage,
    params,
    onReasoning,
  } = options

  let prompt = resolvePrompt(mode, customPrompt, locale)

  // 注入 ASR 前置转写（方案 A），供「口播/台词」列按时间对位抄录
  if (audioTranscript && audioTranscript.length > 0) {
    prompt += buildTranscriptSection(audioTranscript, locale)
  }

  try {
    if (typeof source === 'string') {
      return await analyzeVideoByUrl(source, apiKey, model, prompt, onProgress, onStream, onTokenUsage, params, onReasoning)
    }

    return await analyzeVideoByTemporaryFile(source, apiKey, model, prompt, onProgress, onStream, onTokenUsage, params, onReasoning)
  } catch (error) {
    throw new Error(parseErrorMessage(error))
  }
}

// 文本生成脚本接口（从零创作 / 参考生成）
export async function generateScript(options: GenerateScriptOptions): Promise<VideoAnalysisResponse> {
  const {
    apiKey,
    model = DEFAULT_MODEL_ID as AIModel,
    mode,
    context,
    customPrompt,
    locale = 'zh',
    onProgress,
    onStream,
    onTokenUsage,
    params,
    onReasoning,
  } = options

  const prompt = resolvePrompt(mode, customPrompt, locale, context)
  const { t } = useLocale()
  onProgress?.(t('api.callingGenerate'))

  try {
    // 检查是否有图片输入（支持多图，create/reference 均可携带参考图片）
    const imageUrls = 'imageUrls' in context ? context.imageUrls || [] : []
    const hasImages = imageUrls.length > 0

    let fullContent: string

    if (hasImages) {
      // 多图模式：使用 generateWithImages
      fullContent = await analysis.generateWithImages({
        model,
        apiKey,
        prompt,
        imageUrls,
        onChunk: onStream,
        onUsage: onTokenUsage,
        enableThinking: params?.enableThinking,
        onReasoningChunk: onReasoning,
      })
    } else {
      // 纯文本模式
      fullContent = await analysis.generateText({
        model,
        apiKey,
        prompt,
        onChunk: onStream,
        onUsage: onTokenUsage,
        enableThinking: params?.enableThinking,
        onReasoningChunk: onReasoning,
      })
    }

    onProgress?.(t('api.parsingResult'))
    return parseMarkdownTable(fullContent)
  } catch (error) {
    throw new Error(parseErrorMessage(error))
  }
}

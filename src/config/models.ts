/**
 * 模型配置文件
 * 硬编码可选模型列表，不依赖环境变量
 */

export interface ModelConfig {
  id: string
  name: string
  provider: 'aliyun'
  providerName: string
  description: string
  capabilities: ('video' | 'image' | 'audio' | 'text')[]
}

/**
 * 可选模型列表
 */
export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'qwen3.8-omni-flash',
    name: 'Qwen3.8 Omni Flash',
    provider: 'aliyun',
    providerName: '阿里百炼',
    description: '通义千问 3.8 全模态版（原生理解视频画面与音频）',
    capabilities: ['video', 'image', 'audio', 'text'],
  },
  {
    id: 'qwen3.8-flash',
    name: 'Qwen3.8 Flash',
    provider: 'aliyun',
    providerName: '阿里百炼',
    description: '通义千问 3.8 快速版',
    capabilities: ['video', 'image', 'text'],
  },
  {
    id: 'qwen3.8-max',
    name: 'Qwen3.8 Max',
    provider: 'aliyun',
    providerName: '阿里百炼',
    description: '通义千问 3.8 旗舰版',
    capabilities: ['video', 'image', 'text'],
  },
  {
    id: 'qwen3.7-flash',
    name: 'Qwen3.7 Flash',
    provider: 'aliyun',
    providerName: '阿里百炼',
    description: '通义千问 3.7 快速版（上一代）',
    capabilities: ['video', 'image', 'text'],
  },
  {
    id: 'qwen3.7-plus',
    name: 'Qwen3.7 Plus',
    provider: 'aliyun',
    providerName: '阿里百炼',
    description: '通义千问 3.7 增强版（上一代）',
    capabilities: ['video', 'image', 'text'],
  },
]

/**
 * 按提供商分组的模型
 */
export const MODELS_BY_PROVIDER = {
  aliyun: AVAILABLE_MODELS.filter(m => m.provider === 'aliyun'),
}

/**
 * 是否原生理解视频音频轨（omni 系列）
 * 此类模型自带听觉，无需 ASR 前置转写
 */
export function supportsNativeAudio(modelId: string): boolean {
  return modelId.includes('omni')
}

// ---------- 按页面区分的可选模型 ----------

/**
 * 视频拆解页（/analyze）可选模型与默认
 */
export const ANALYZE_MODEL_IDS = ['qwen3.8-flash', 'qwen3.8-omni-flash'] as const
export const ANALYZE_DEFAULT_MODEL_ID = 'qwen3.8-flash'

/**
 * 脚本生成页（/create）可选模型与默认
 */
export const CREATE_MODEL_IDS = ['qwen3.8-max', 'qwen3.8-flash'] as const
export const CREATE_DEFAULT_MODEL_ID = 'qwen3.8-max'

/**
 * 全局初始模型（模块加载时未知页面，取拆解页默认；各面板挂载时会校正到本页默认）
 */
export const DEFAULT_MODEL_ID = ANALYZE_DEFAULT_MODEL_ID

function pickModels(ids: readonly string[]): ModelConfig[] {
  return ids.map(id => getModelById(id)).filter((m): m is ModelConfig => !!m)
}

/** 视频拆解页可选模型 */
export const ANALYZE_MODELS = pickModels(ANALYZE_MODEL_IDS)
/** 脚本生成页可选模型 */
export const CREATE_MODELS = pickModels(CREATE_MODEL_IDS)

/**
 * 根据 ID 获取模型配置
 */
export function getModelById(id: string): ModelConfig | undefined {
  return AVAILABLE_MODELS.find(m => m.id === id)
}

/**
 * 获取模型提供商的 API 端点
 */
export function getApiEndpoint(provider: 'aliyun'): string {
  const endpoints = {
    aliyun: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  }
  return endpoints[provider]
}

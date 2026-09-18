/**
 * 语音转写（ASR）前置模块
 *
 * 使用百炼 paraformer-v2 文件转写（异步任务）：
 * - 直接支持 mp4 等音视频容器（服务端提取音轨）
 * - 输出句级时间戳（毫秒），供台词列按镜头时间对位抄录
 *
 * 上传后的视频 URL（百炼临时存储 oss:// 或公网 http URL）直接作为输入。
 * 任何失败由调用方降级处理（不注入转写、照常分析）。
 */

export interface TranscriptSentence {
  /** 开始时间（毫秒） */
  beginMs: number
  /** 结束时间（毫秒） */
  endMs: number
  /** 该句文本 */
  text: string
}

const SUBMIT_URL = 'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription'
const TASK_URL = 'https://dashscope.aliyuncs.com/api/v1/tasks'

// 轮询节奏：2.5s 间隔，上限 5 分钟（百炼异步转写通常 1 分钟内完成）
const POLL_INTERVAL_MS = 2500
const POLL_MAX_ATTEMPTS = 120

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** 毫秒 → MM:SS */
export function formatMsToTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

async function requestJson(url: string, apiKey: string, init?: RequestInit): Promise<any> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`ASR API ${response.status}: ${body.slice(0, 200)}`)
  }

  return response.json()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractSentences(result: any): TranscriptSentence[] {
  // paraformer-v2 结果结构：{ file_url, transcripts: [{ channel_id, content, begin_time, end_time, sentences: [...] }] }
  const transcripts = result?.transcripts
  if (!Array.isArray(transcripts) || transcripts.length === 0) {
    return []
  }

  const sentences: TranscriptSentence[] = []
  for (const transcript of transcripts) {
    const list = transcript?.sentences
    if (Array.isArray(list)) {
      for (const item of list) {
        if (typeof item?.text === 'string' && item.text.trim()) {
          sentences.push({
            beginMs: Number(item.begin_time) || 0,
            endMs: Number(item.end_time) || 0,
            text: item.text.trim(),
          })
        }
      }
    }
  }

  // 兜底：无分句时使用整段转写（对位精度降级但不丢内容）
  if (sentences.length === 0) {
    for (const transcript of transcripts) {
      if (typeof transcript?.content === 'string' && transcript.content.trim()) {
        sentences.push({
          beginMs: Number(transcript.begin_time) || 0,
          endMs: Number(transcript.end_time) || 0,
          text: transcript.content.trim(),
        })
      }
    }
  }

  return sentences.sort((a, b) => a.beginMs - b.beginMs)
}

/**
 * 转写视频音轨（paraformer-v2 异步任务）
 *
 * @param videoUrl 视频地址（百炼临时存储 oss:// 或公网 URL）
 * @param apiKey 百炼 API Key
 * @param onStage 进度回调（提交/轮询状态提示）
 * @returns 句级转写（按开始时间升序）
 */
export async function transcribeVideo(
  videoUrl: string,
  apiKey: string,
  onStage?: (message: string) => void
): Promise<TranscriptSentence[]> {
  // 1. 提交转写任务
  const submitResponse = await requestJson(SUBMIT_URL, apiKey, {
    method: 'POST',
    body: JSON.stringify({
      model: 'paraformer-v2',
      input: { file_urls: [videoUrl] },
      parameters: {
        disfluency_removal_enabled: true,
      },
    }),
  })

  const taskId = submitResponse?.output?.task_id
  if (!taskId) {
    throw new Error('ASR task submission failed')
  }

  // 2. 轮询任务状态
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS)

    const task = await requestJson(`${TASK_URL}/${taskId}`, apiKey)
    const status = task?.output?.task_status

    if (status === 'SUCCEEDED') {
      // 3. 获取结果文件（transcription_url 指向 JSON）
      const resultUrl = task?.output?.results?.[0]?.transcription_url
      if (!resultUrl) {
        throw new Error('ASR result URL missing')
      }

      const resultResponse = await fetch(resultUrl)
      if (!resultResponse.ok) {
        throw new Error(`ASR result fetch failed: ${resultResponse.status}`)
      }

      return extractSentences(await resultResponse.json())
    }

    if (status === 'FAILED' || status === 'CANCELED') {
      const message = task?.output?.message || 'ASR task failed'
      throw new Error(`ASR task failed: ${message}`)
    }

    // PENDING / RUNNING → 继续轮询
    onStage?.(status)
  }

  throw new Error('ASR task timeout')
}

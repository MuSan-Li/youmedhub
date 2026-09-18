/**
 * 语音转写（ASR）前置模块
 *
 * 使用百炼 qwen3-asr-flash（OpenAI 兼容接口）：
 * - 该模型只接受音频输入，因此先在浏览器用 WebAudio 提取视频音轨，
 *   重采样为 16kHz 单声道后按 30 秒分块转 WAV
 * - 模型不输出原生时间戳，以「块偏移」作为句级时间戳（粒度 30s，供镜头对位参考）
 * - 分块请求按批并发（4 路），失败整块跳过（缺块不阻断整体转写）
 *
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

// 分块时长（秒）：块越小时间戳越准，请求越多；30s 是精度与请求量的折中
const CHUNK_SECONDS = 30
// 并发请求数（避免触发 RPM 限流）
const CONCURRENCY = 4

/** 毫秒 → MM:SS */
export function formatMsToTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

// ---------- 音轨提取与编码 ----------

type AudioContextCtor = typeof AudioContext

function getAudioContextCtor(): AudioContextCtor {
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor }
  return w.AudioContext || w.webkitAudioContext || AudioContext
}

/**
 * 解码视频/音频文件为 16kHz 单声道 AudioBuffer
 * （decodeAudioData 自动提取容器内的音频轨，mp4/mov 的 AAC 均可解）
 */
async function decodeTo16kMono(file: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer()

  const DecodeCtx = getAudioContextCtor()
  const decodeContext = new DecodeCtx()
  try {
    const decoded = await decodeContext.decodeAudioData(arrayBuffer.slice(0))

    const frameCount = Math.max(1, Math.ceil(decoded.duration * 16000))
    const offline = new OfflineAudioContext(1, frameCount, 16000)
    const source = offline.createBufferSource()
    source.buffer = decoded
    source.connect(offline.destination)
    source.start()
    return await offline.startRendering()
  } finally {
    void decodeContext.close()
  }
}

/** AudioBuffer → PCM16 WAV（little-endian，44 字节头） */
function encodeWav(buffer: AudioBuffer): ArrayBuffer {
  const channels = buffer.getChannelData(0)
  const dataLength = channels.length * 2
  const output = new ArrayBuffer(44 + dataLength)
  const view = new DataView(output)

  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true) // fmt chunk size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, buffer.sampleRate, true)
  view.setUint32(28, buffer.sampleRate * 2, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeString(36, 'data')
  view.setUint32(40, dataLength, true)

  let offset = 44
  for (let i = 0; i < channels.length; i++) {
    const sample = Math.max(-1, Math.min(1, channels[i]))
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
    offset += 2
  }

  return output
}

// ---------- qwen3-asr-flash 调用 ----------

async function transcribeChunk(wavBase64: string, apiKey: string): Promise<string> {
  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen3-asr-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'input_audio',
              input_audio: { data: wavBase64, format: 'wav' },
            },
            {
              type: 'text',
              text: '<|startoftranscript|>',
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`qwen3-asr ${response.status}: ${body.slice(0, 200)}`)
  }

  const data = await response.json()
  return (data?.choices?.[0]?.message?.content || '').toString().trim()
}

// ---------- 对外接口 ----------

/**
 * 转写视频音轨（qwen3-asr-flash）
 *
 * @param source 视频文件（Blob，浏览器本地提取音轨）
 * @param apiKey 百炼 API Key
 * @param onStage 进度回调（解码/转写中）
 * @returns 句级转写（按块偏移生成时间戳，粒度 CHUNK_SECONDS）
 */
export async function transcribeVideo(
  source: Blob,
  apiKey: string,
  onStage?: (message: string) => void
): Promise<TranscriptSentence[]> {
  onStage?.('decoding')

  // 1. 提取音轨并重采样
  const audioBuffer = await decodeTo16kMono(source)
  const totalSeconds = audioBuffer.duration
  if (totalSeconds < 1) {
    return []
  }

  // 2. 切块（在原 buffer 上按时间截取，逐块重渲染为单块 buffer 再编码）
  const chunkCount = Math.ceil(totalSeconds / CHUNK_SECONDS)
  const chunks: Array<{ index: number; beginMs: number; endMs: number; base64: string }> = []

  for (let i = 0; i < chunkCount; i++) {
    const beginSecond = i * CHUNK_SECONDS
    const duration = Math.min(CHUNK_SECONDS, totalSeconds - beginSecond)
    const offline = new OfflineAudioContext(1, Math.ceil(duration * 16000), 16000)
    const sourceNode = offline.createBufferSource()
    sourceNode.buffer = audioBuffer
    sourceNode.connect(offline.destination)
    sourceNode.start(0, beginSecond, duration)
    const rendered = await offline.startRendering()

    // ArrayBuffer → base64（分片转换避免 apply 栈溢出）
    const wav = encodeWav(rendered)
    const bytes = new Uint8Array(wav)
    let binary = ''
    const STEP = 0x8000
    for (let offset = 0; offset < bytes.length; offset += STEP) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + STEP))
    }

    chunks.push({
      index: i,
      beginMs: beginSecond * 1000,
      endMs: (beginSecond + duration) * 1000,
      base64: btoa(binary),
    })
  }

  // 3. 分批并发转写（单块失败跳过，不阻断整体）
  onStage?.('transcribing')
  const results: Array<{ beginMs: number; endMs: number; text: string } | null> = new Array(chunks.length).fill(null)

  for (let start = 0; start < chunks.length; start += CONCURRENCY) {
    const batch = chunks.slice(start, start + CONCURRENCY)
    await Promise.all(
      batch.map(async (chunk) => {
        try {
          const text = await transcribeChunk(chunk.base64, apiKey)
          if (text) {
            results[chunk.index] = { beginMs: chunk.beginMs, endMs: chunk.endMs, text }
          }
        } catch (e) {
          console.warn(`[asr] chunk ${chunk.index} failed, skipped:`, e)
        }
      })
    )
  }

  return results.filter((item): item is { beginMs: number; endMs: number; text: string } => item !== null)
}

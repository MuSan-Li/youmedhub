/**
 * 错误消息提取
 * 统一各组件 catch 中 `e instanceof Error ? e.message : t(fallback)` 的重复写法。
 */
import { useLocale } from '@/composables/useLocale'

export function extractErrorMessage(error: unknown, fallbackKey = 'api.requestFail'): string {
  const message = error instanceof Error ? error.message : ''
  return message || useLocale().t(fallbackKey)
}

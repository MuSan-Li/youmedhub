/**
 * 多语言状态管理（模块级单例）
 * - locale 持久化到 localStorage
 * - t() 支持点路径键与 {name} 插值
 */
import { ref, computed } from 'vue'
import { zh } from '@/locales/zh'
import { en } from '@/locales/en'

export type Locale = 'zh' | 'en'

const messages: Record<Locale, Record<string, string>> = { zh, en }

const LOCALE_STORAGE_KEY = 'app_locale'

// 中国大陆及港澳台时区
const CHINA_TIMEZONES = new Set([
  'Asia/Shanghai',
  'Asia/Urumqi',
  'Asia/Chongqing',
  'Asia/Harbin',
  'Asia/Hong_Kong',
  'Asia/Macau',
  'Asia/Taipei',
])

/**
 * 初始语言检测：
 * 1. 用户手动选择过（localStorage）→ 尊重选择
 * 2. 浏览器时区属于中国 → 中文
 * 3. 浏览器语言为中文 → 中文
 * 4. 其他地区 → 英文
 */
function getInitialLocale(): Locale {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (stored === 'zh' || stored === 'en') {
    return stored
  }

  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (CHINA_TIMEZONES.has(timezone)) {
      return 'zh'
    }
  } catch {
    // timezone 探测失败，继续用浏览器语言判断
  }

  const languages = navigator.languages?.length ? navigator.languages : [navigator.language]
  if (languages.some(lang => lang?.toLowerCase().startsWith('zh'))) {
    return 'zh'
  }

  return 'en'
}

const locale = ref<Locale>(getInitialLocale())

function translate(key: string, params?: Record<string, string | number>): string {
  const text = messages[locale.value][key] ?? messages.zh[key] ?? key
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match
  )
}

function setLocale(next: Locale) {
  locale.value = next
  localStorage.setItem(LOCALE_STORAGE_KEY, next)
  document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en'
}

export function useLocale() {
  const currentLocale = computed(() => locale.value)
  const isZh = computed(() => locale.value === 'zh')
  return { locale: currentLocale, isZh, t: translate, setLocale }
}

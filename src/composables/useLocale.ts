/**
 * 多语言状态管理（模块级单例）
 * - locale 持久化到 localStorage（存储被禁时静默降级，不阻断应用启动）
 * - t() 支持点路径键与 {name} 插值
 * - setLocale 广播 'app:locale-change' 事件（router 监听后刷新页面 meta）
 */
import { ref, computed } from 'vue'
import { zh } from '@/locales/zh'
import { en } from '@/locales/en'

export type Locale = 'zh' | 'en'

const messages: Record<Locale, Record<string, string>> = { zh, en }

const LOCALE_STORAGE_KEY = 'app_locale'

// localStorage 在「阻止所有 Cookie」等场景下访问即抛 SecurityError，需防御
function readStoredLocale(): string | null {
  try {
    return localStorage.getItem(LOCALE_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStoredLocale(value: Locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, value)
  } catch {
    // 存储不可用时仅跳过持久化，语言切换在当前会话内仍然生效
  }
}

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
  const stored = readStoredLocale()
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

function applyHtmlLang(value: Locale) {
  document.documentElement.lang = value === 'zh' ? 'zh-CN' : 'en'
}

const locale = ref<Locale>(getInitialLocale())
// 首次加载即同步 <html lang>（覆盖 index.html 的静态 zh-CN）
applyHtmlLang(locale.value)

function translate(key: string, params?: Record<string, string | number>): string {
  const text = messages[locale.value][key] ?? messages.zh[key] ?? key
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match
  )
}

function setLocale(next: Locale) {
  locale.value = next
  writeStoredLocale(next)
  applyHtmlLang(next)
  // 通知 router 等监听方刷新语言相关状态（页面标题/meta）
  window.dispatchEvent(new CustomEvent('app:locale-change'))
}

export function useLocale() {
  const currentLocale = computed(() => locale.value)
  const isZh = computed(() => locale.value === 'zh')
  return { locale: currentLocale, isZh, t: translate, setLocale }
}

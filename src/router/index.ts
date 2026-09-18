import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/composables/useLocale'

// 站点线上地址（换自定义域名时同步修改，与 sitemap.xml/robots.txt 保持一致）
const SITE_URL = 'https://www.youmedhub.com'

function setMeta(name: string, content: string | null) {
  let tag = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!content) {
    tag?.remove()
    return
  }
  if (!tag) {
    tag = document.createElement('meta')
    tag.name = name
    document.head.appendChild(tag)
  }
  tag.content = content
}

function setMetaProperty(property: string, content: string) {
  let tag = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('property', property)
    document.head.appendChild(tag)
  }
  tag.content = content
}

function setLinkCanonical(href: string) {
  let tag = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!tag) {
    tag = document.createElement('link')
    tag.rel = 'canonical'
    document.head.appendChild(tag)
  }
  tag.href = href
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      components: {
        default: () => import('@/views/HomePage.vue'),
      },
      meta: { title: 'page.home', description: 'seo.home' },
    },
    {
      path: '/analyze',
      name: 'analyze',
      components: {
        default: () => import('@/views/AnalyzePage.vue'),
        config: () => import('@/components/LeftPanel.vue'),
      },
      meta: { title: 'menu.analyze', description: 'seo.analyze', hasConfig: true, requiresAuth: false },
    },
    {
      path: '/create',
      name: 'create',
      components: {
        default: () => import('@/views/CreatePage.vue'),
        config: () => import('@/components/LeftPanel.vue'),
      },
      meta: { title: 'menu.create', description: 'seo.create', hasConfig: true, requiresAuth: false },
    },
    {
      path: '/favorites',
      name: 'favorites',
      components: {
        default: () => import('@/views/FavoritesPage.vue'),
      },
      meta: { title: 'menu.favorites', requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      components: {
        default: () => import('@/views/SettingsPage.vue'),
      },
      meta: { title: 'menu.settings' },
    },
    {
      path: '/profile',
      name: 'profile',
      components: {
        default: () => import('@/views/ProfilePage.vue'),
      },
      meta: { title: 'menu.profile', requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      components: {
        default: () => import('@/views/LoginPage.vue'),
      },
      meta: { title: 'menu.login' },
    },
    {
      path: '/privacy',
      name: 'privacy',
      components: {
        default: () => import('@/views/PrivacyPage.vue'),
      },
      meta: { title: 'privacy.link', description: 'seo.privacy' },
    },
  ],
})

// 根据当前路由与界面语言刷新页面标题和 meta（Google 可执行 JS，动态 meta 对其可见）
function refreshRouteMeta(path: string, titleKey: unknown, descriptionKey: unknown) {
  const { t, locale } = useLocale()
  const rawTitle = titleKey || 'YouMedHub'
  document.title = `${t(String(rawTitle))} - YouMedHub`

  // 无路由级描述时回退到首页描述，避免 meta 被删空
  const description = descriptionKey ? t(String(descriptionKey)) : t('seo.home')
  setMeta('description', description)
  setMetaProperty('og:title', document.title)
  setMetaProperty('og:description', description)
  setMetaProperty('og:url', `${SITE_URL}${path}`)
  setMetaProperty('og:locale', locale.value === 'zh' ? 'zh_CN' : 'en_US')
  setLinkCanonical(`${SITE_URL}${path}`)
}

// 路由守卫
router.beforeEach(async (to, _from, next) => {
  // /index.html 直达路径规范化为 /
  const normalizedPath = to.path.replace(/\/index\.html$/, '') || '/'
  refreshRouteMeta(normalizedPath, to.meta.title, to.meta.description)

  // 检查登录状态
  if (to.meta.requiresAuth) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      next({ name: 'login', query: { redirect: to.fullPath } })
      return
    }
  }

  next()
})

// 语言切换时刷新当前路由的标题/meta（切换不触发路由导航）
window.addEventListener('app:locale-change', () => {
  const current = router.currentRoute.value
  const normalizedPath = current.path.replace(/\/index\.html$/, '') || '/'
  refreshRouteMeta(normalizedPath, current.meta.title, current.meta.description)
})

export default router

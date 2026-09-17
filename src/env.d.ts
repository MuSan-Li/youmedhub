/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Supabase
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  // AI Model API Keys (可选)
  readonly VITE_DASHSCOPE_API_KEY: string
  // Google AdSense（可选，未配置时不渲染广告）
  readonly VITE_ADSENSE_CLIENT: string
  readonly VITE_ADSENSE_SLOT_HOME: string
  readonly VITE_ADSENSE_SLOT_RESULT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

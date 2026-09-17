/**
 * Google AdSense 配置
 *
 * - 脚本已在 index.html <head> 中静态引入（Google 审核要求，爬虫必须能在源码中看到）
 * - 广告位通过 VITE_ADSENSE_SLOT_* 环境变量配置，未配置时不渲染
 */

/** 发布商 ID（与 index.html 中脚本保持一致） */
export const ADSENSE_CLIENT: string =
  import.meta.env.VITE_ADSENSE_CLIENT || 'ca-pub-5816904682968994'

// 广告单元 ID（AdSense 控制台创建广告单元后获得，形如 1234567890）
// 未配置时对应广告位不渲染
export const ADSENSE_SLOT_HOME: string = import.meta.env.VITE_ADSENSE_SLOT_HOME || ''
export const ADSENSE_SLOT_RESULT: string = import.meta.env.VITE_ADSENSE_SLOT_RESULT || ''

/** 是否启用广告位渲染（广告单元 ID 配置后才渲染具体广告） */
export function isAdsEnabled(): boolean {
  return ADSENSE_CLIENT.startsWith('ca-pub-')
}

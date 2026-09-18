/**
 * 使用统计上报
 *
 * 每次 AI 调用成功后记录一条 usage_logs（谁、什么功能、哪个模型、什么时候）。
 * 统计不允许影响主流程：任何失败（未登录、网络、RLS 拒绝）均静默降级。
 *
 * 表结构见 supabase/migrations/20260918_usage_logs.sql（需先在 Supabase 执行建表）。
 */
import { supabase } from '@/lib/supabase'

export type UsageFeature = 'analyze' | 'create' | 'reference'

export async function logUsage(feature: UsageFeature, modelId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    const { error } = await supabase
      .from('usage_logs')
      .insert({ user_id: session.user.id, feature, model_id: modelId })

    if (error) {
      console.warn('[usage] failed to log:', error.message)
    }
  } catch (e) {
    console.warn('[usage] failed to log:', e)
  }
}

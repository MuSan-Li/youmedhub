<script setup lang="ts">
/**
 * Google AdSense 广告位组件
 *
 * - 通过 props.adSlot 指定广告单元 ID（形如 1234567890）
 * - 脚本已在 index.html head 静态引入，这里直接 push 到 adsbygoogle 队列
 *   （官方异步模式：脚本加载完成后自动处理队列中的请求）
 * - 每次挂载渲染新的 <ins>（SPA 路由切换时组件重建，自动刷新广告）
 */
import { ref, onMounted } from 'vue'
import { isAdsEnabled, ADSENSE_CLIENT } from '@/lib/adsense'

const props = withDefaults(
  defineProps<{
    /** 广告单元 ID（AdSense 控制台创建后获得） */
    adSlot?: string
    /** 广告格式，默认 auto */
    format?: string
    /** 是否响应式布局，默认 true */
    responsive?: boolean
  }>(),
  {
    adSlot: '',
    format: 'auto',
    responsive: true,
  }
)

const failed = ref(false)

onMounted(() => {
  if (!isAdsEnabled() || !props.adSlot) return

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({})
  } catch {
    // 异常时静默隐藏，不破坏页面
    failed.value = true
  }
})
</script>

<template>
  <div
    v-if="isAdsEnabled() && adSlot && !failed"
    class="ad-container w-full overflow-hidden"
    aria-label="advertisement"
  >
    <ins
      class="adsbygoogle block"
      style="display: block"
      :data-ad-client="ADSENSE_CLIENT"
      :data-ad-slot="adSlot"
      :data-ad-format="format"
      :data-full-width-responsive="responsive ? 'true' : 'false'"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFavorites, type FavoriteItem } from '@/composables/useFavorites'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Search, Trash2, FileText, Calendar, Layers, Clock } from 'lucide-vue-next'
import { useLocale } from '@/composables/useLocale'

const router = useRouter()
const favorites = useFavorites()
const videoAnalysis = useVideoAnalysis()
const { toast } = useToast()
const { t, locale } = useLocale()

const searchQuery = ref('')
const deleteTarget = ref<FavoriteItem | null>(null)
const loading = ref(true)

// 加载收藏列表
onMounted(async () => {
  try {
    await favorites.loadFavorites()
  } catch (e) {
    toast({
      title: t('favorites.loadFail'),
      description: e instanceof Error ? e.message : '未知错误',
      variant: 'destructive',
    })
  } finally {
    loading.value = false
  }
})

// 过滤后的列表
const filteredFavorites = computed(() => {
  if (!searchQuery.value) return favorites.favorites.value
  const query = searchQuery.value.toLowerCase()
  return favorites.favorites.value.filter(
    (f) =>
      f.title.toLowerCase().includes(query) ||
      f.description?.toLowerCase().includes(query)
  )
})

// 按日期分组（返回有序数组）
const groupedFavorites = computed(() => {
  const groups: Record<string, FavoriteItem[]> = {}
  for (const item of filteredFavorites.value) {
    const date = new Date(item.created_at).toLocaleDateString(locale.value === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    if (!groups[date]) groups[date] = []
    groups[date].push(item)
  }
  // 转换为有序数组（按日期降序）
  return Object.entries(groups)
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    .map(([date, items]) => ({ date, items }))
})

// 加载到编辑器
function handleLoad(item: FavoriteItem) {
  // 回填视频链接
  if (item.source_url) {
    videoAnalysis.videoUrl.value = item.source_url
  }
  videoAnalysis.markdownContent.value = item.raw_markdown
  videoAnalysis.scriptItems.value = item.script_data
  videoAnalysis.viewMode.value = 'table'
  router.push('/analyze')
}

// 确认删除
async function handleDelete() {
  if (!deleteTarget.value) return
  try {
    await favorites.deleteFavorite(deleteTarget.value.id)
    toast({
      title: t('favorites.deleteSuccess'),
    })
  } catch (e) {
    toast({
      title: t('favorites.deleteFail'),
      description: e instanceof Error ? e.message : '未知错误',
      variant: 'destructive',
    })
  } finally {
    deleteTarget.value = null
  }
}

// 格式化时长
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 格式化时间
function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(locale.value === 'zh' ? 'zh-CN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- 头部 -->
    <div class="shrink-0 border-b p-4">
      <div class="flex items-center gap-4">
        <h1 class="text-xl font-semibold">{{ t('favorites.title') }}</h1>
        <Badge variant="secondary">
          {{ t('favorites.count', { n: favorites.favorites.value.length }) }}
        </Badge>
      </div>

      <!-- 搜索 -->
      <div class="mt-4 relative">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          :placeholder="t('favorites.searchPlaceholder')"
          class="pl-9"
        />
      </div>
    </div>

    <!-- 列表 -->
    <div class="flex-1 overflow-y-auto p-4">
      <!-- 加载中 -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="text-muted-foreground">{{ t('common.loading') }}</div>
      </div>

      <!-- 空状态 -->
      <div
        v-else-if="favorites.favorites.value.length === 0"
        class="flex flex-col items-center justify-center py-12 text-muted-foreground"
      >
        <FileText class="h-12 w-12 mb-4 opacity-50" />
        <p>{{ t('favorites.empty') }}</p>
        <p class="text-sm mt-1">{{ t('favorites.emptyHint') }}</p>
      </div>

      <!-- 无搜索结果 -->
      <div
        v-else-if="filteredFavorites.length === 0"
        class="flex flex-col items-center justify-center py-12 text-muted-foreground"
      >
        <Search class="h-12 w-12 mb-4 opacity-50" />
        <p>{{ t('favorites.noResults') }}</p>
      </div>

      <!-- 分组列表 -->
      <div v-else class="space-y-6">
        <div v-for="group in groupedFavorites" :key="group.date">
          <h3 class="mb-3 text-sm font-medium text-muted-foreground">{{ group.date }}</h3>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Card
              v-for="item in group.items"
              :key="item.id"
              class="cursor-pointer transition-colors hover:bg-accent"
              @click="handleLoad(item)"
            >
              <CardHeader class="pb-2">
                <div class="flex items-start justify-between gap-2">
                  <CardTitle class="text-base line-clamp-1">{{ item.title }}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8 shrink-0"
                    @click.stop="deleteTarget = item"
                  >
                    <Trash2 class="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
                <CardDescription v-if="item.description" class="line-clamp-2">
                  {{ item.description }}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <div class="flex items-center gap-1">
                    <Layers class="h-3.5 w-3.5" />
                    {{ t('favorites.shotCount', { n: item.shot_count }) }}
                  </div>
                  <div v-if="item.source_video_duration" class="flex items-center gap-1">
                    <Clock class="h-3.5 w-3.5" />
                    {{ formatDuration(item.source_video_duration) }}
                  </div>
                  <div class="flex items-center gap-1">
                    <Calendar class="h-3.5 w-3.5" />
                    {{ formatTime(item.created_at) }}
                  </div>
                </div>
                <div v-if="item.model_provider" class="mt-2">
                  <Badge variant="outline" class="text-xs">
                    {{ item.model_provider }}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <AlertDialog :open="!!deleteTarget" @update:open="deleteTarget = null">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t('favorites.deleteTitle') }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ t('favorites.deleteDesc', { title: deleteTarget?.title || '' }) }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{{ t('common.cancel') }}</AlertDialogCancel>
          <AlertDialogAction @click="handleDelete" class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {{ t('common.delete') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useProfile } from '@/composables/useProfile'
import { useFavorites } from '@/composables/useFavorites'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  User,
  Mail,
  Calendar,
  FileText,
  LogOut,
  Pencil,
} from 'lucide-vue-next'
import { useLocale } from '@/composables/useLocale'

const router = useRouter()
const auth = useAuth()
const profile = useProfile()
const favorites = useFavorites()
const { toast } = useToast()
const { t, locale } = useLocale()

const loading = ref(true)
const editDialogOpen = ref(false)
const editNickname = ref('')
const saving = ref(false)

// 格式化日期
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(locale.value === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// 获取用户名首字母
function getInitials(name: string): string {
  if (!name) return 'U'
  return name.charAt(0).toUpperCase()
}

// 打开编辑弹窗
function openEditDialog() {
  editNickname.value = profile.nickname.value
  editDialogOpen.value = true
}

// 保存昵称
async function saveNickname() {
  const trimmedName = editNickname.value.trim()
  if (!trimmedName) {
    toast({
      title: t('profile.nicknameRequired'),
      variant: 'destructive',
    })
    return
  }

  if (trimmedName === profile.nickname.value) {
    editDialogOpen.value = false
    return
  }

  saving.value = true
  try {
    await profile.updateNickname(trimmedName)
    toast({
      title: t('profile.nicknameUpdated'),
    })
    editDialogOpen.value = false
  } catch (e) {
    toast({
      title: t('profile.saveFail'),
      description: e instanceof Error ? e.message : '未知错误',
      variant: 'destructive',
    })
  } finally {
    saving.value = false
  }
}

// 退出登录
async function handleSignOut() {
  try {
    await auth.signOut()
    router.push('/')
    toast({
      title: t('menu.logoutSuccess'),
    })
  } catch (e) {
    toast({
      title: t('menu.logoutFailed'),
      description: e instanceof Error ? e.message : '未知错误',
      variant: 'destructive',
    })
  }
}

// 加载数据
onMounted(async () => {
  try {
    await profile.loadProfile()
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
</script>

<template>
  <div class="h-full overflow-y-auto">
    <!-- 加载中 -->
    <div v-if="loading" class="flex items-center justify-center h-full">
      <div class="text-muted-foreground">{{ t('common.loading') }}</div>
    </div>

    <!-- 主内容 -->
    <div v-else class="max-w-3xl mx-auto p-6 space-y-6">
      <!-- 个人信息卡片 -->
      <Card>
        <CardHeader>
          <CardTitle class="text-lg">{{ t('profile.infoTitle') }}</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="flex items-start gap-6">
            <!-- 头像 -->
            <Avatar class="h-20 w-20">
              <AvatarImage :src="profile.avatarUrl.value" />
              <AvatarFallback class="text-xl">
                {{ getInitials(profile.nickname.value) }}
              </AvatarFallback>
            </Avatar>

            <!-- 信息 -->
            <div class="flex-1 space-y-3">
              <!-- 昵称 -->
              <div class="flex items-center gap-2">
                <User class="h-4 w-4 text-muted-foreground" />
                <span class="font-medium">{{ profile.nickname.value }}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-7 w-7"
                  @click="openEditDialog"
                >
                  <Pencil class="h-3.5 w-3.5" />
                </Button>
              </div>

              <!-- 邮箱 -->
              <div class="flex items-center gap-2 text-muted-foreground">
                <Mail class="h-4 w-4" />
                <span>{{ auth.userEmail.value }}</span>
              </div>

              <!-- 注册时间 -->
              <div class="flex items-center gap-2 text-muted-foreground">
                <Calendar class="h-4 w-4" />
                <span class="text-sm">
                  {{ profile.profile.value ? t('profile.joinedAt', { date: formatDate(profile.profile.value.created_at) }) : t('profile.unknownDate') }}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- 统计卡片 -->
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-primary/10 rounded-lg">
              <FileText class="h-5 w-5 text-primary" />
            </div>
            <div>
              <div class="text-2xl font-bold">{{ favorites.favorites.value.length }}</div>
              <div class="text-sm text-muted-foreground">{{ t('profile.favoriteScripts') }}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- 退出登录 -->
      <Button
        variant="outline"
        class="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
        @click="handleSignOut"
      >
        <LogOut class="h-4 w-4 mr-2" />
        {{ t('profile.signOut') }}
      </Button>
    </div>

    <!-- 编辑昵称弹窗 -->
    <Dialog v-model:open="editDialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('profile.editNicknameTitle') }}</DialogTitle>
          <DialogDescription>
            {{ t('profile.editNicknameDesc') }}
          </DialogDescription>
        </DialogHeader>
        <div class="py-4">
          <Label for="nickname">{{ t('profile.nickname') }}</Label>
          <Input
            id="nickname"
            v-model="editNickname"
            :placeholder="t('profile.nicknamePlaceholder')"
            class="mt-2"
            maxlength="20"
            @keyup.enter="saveNickname"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" @click="editDialogOpen = false">
            {{ t('common.cancel') }}
          </Button>
          <Button :disabled="saving" @click="saveNickname">
            {{ saving ? t('profile.saving') : t('common.save') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

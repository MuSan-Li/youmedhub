<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Mail, Github } from 'lucide-vue-next'
import { useLocale } from '@/composables/useLocale'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const auth = useAuth()
const { t } = useLocale()

// 表单状态
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')
const activeTab = ref('login')

// Supabase 错误信息翻译（跟随界面语言）
function translateError(errorMessage: string): string {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': t('auth.err.invalidCredentials'),
    'Email not confirmed': t('auth.err.emailNotConfirmed'),
    'User already registered': t('auth.err.alreadyRegistered'),
    'Password should be at least 6 characters': t('auth.passwordMinLength'),
    'Unable to validate email address': t('auth.err.invalidEmail'),
    'Signups not allowed': t('auth.err.signupsNotAllowed'),
    'Email rate limit exceeded': t('auth.err.rateLimit'),
    'Invalid email': t('auth.err.invalidEmail'),
    'User not found': t('auth.err.userNotFound'),
    'Invalid password': t('auth.err.invalidPassword'),
    'New password should be different from the old password': t('auth.err.samePassword'),
  }

  for (const [key, value] of Object.entries(errorMap)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }

  return errorMessage
}

// 重置表单
function resetForm() {
  email.value = ''
  password.value = ''
  confirmPassword.value = ''
  error.value = ''
  success.value = ''
}

// 邮箱登录
async function handleLogin() {
  if (!email.value || !password.value) {
    error.value = t('auth.fillEmailPassword')
    return
  }

  loading.value = true
  error.value = ''

  try {
    await auth.signIn(email.value, password.value)
    emit('update:open', false)
    resetForm()
  } catch (e) {
    const msg = e instanceof Error ? e.message : t('auth.loginFail')
    error.value = translateError(msg)
  } finally {
    loading.value = false
  }
}

// 邮箱注册
async function handleRegister() {
  if (!email.value || !password.value || !confirmPassword.value) {
    error.value = t('auth.fillAllFields')
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = t('auth.passwordMismatch')
    return
  }

  if (password.value.length < 6) {
    error.value = t('auth.passwordMinLength')
    return
  }

  loading.value = true
  error.value = ''

  try {
    const result = await auth.signUp(email.value, password.value)
    // 如果注册成功且返回了 session（无需邮箱验证），直接登录
    if (result.session) {
      success.value = t('auth.registerSuccess')
      setTimeout(() => {
        emit('update:open', false)
        resetForm()
      }, 1000)
    } else {
      // 需要邮箱验证
      success.value = t('auth.registerSuccessVerify')
      setTimeout(() => {
        resetForm()
        activeTab.value = 'login'
      }, 2000)
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : t('auth.registerFail')
    error.value = translateError(msg)
  } finally {
    loading.value = false
  }
}

// GitHub 登录
async function handleGitHubLogin() {
  loading.value = true
  error.value = ''

  try {
    await auth.signInWithGitHub()
  } catch (e) {
    const msg = e instanceof Error ? e.message : t('auth.githubFail')
    error.value = translateError(msg)
    loading.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t('auth.title') }}</DialogTitle>
        <DialogDescription>
          {{ t('auth.description') }}
        </DialogDescription>
      </DialogHeader>

      <Tabs v-model="activeTab" class="w-full">
        <TabsList class="grid w-full grid-cols-2">
          <TabsTrigger value="login">{{ t('auth.loginTab') }}</TabsTrigger>
          <TabsTrigger value="register">{{ t('auth.registerTab') }}</TabsTrigger>
        </TabsList>

        <!-- 登录表单 -->
        <TabsContent value="login" class="space-y-4">
          <div class="space-y-2">
            <Label for="login-email">{{ t('auth.email') }}</Label>
            <Input
              id="login-email"
              v-model="email"
              type="email"
              placeholder="your@email.com"
              @keyup.enter="handleLogin"
            />
          </div>
          <div class="space-y-2">
            <Label for="login-password">{{ t('auth.password') }}</Label>
            <Input
              id="login-password"
              v-model="password"
              type="password"
              placeholder="••••••••"
              @keyup.enter="handleLogin"
            />
          </div>

          <Button
            class="w-full"
            @click="handleLogin"
            :disabled="loading"
          >
            <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
            <Mail v-else class="mr-2 h-4 w-4" />
            {{ t('auth.emailLogin') }}
          </Button>
        </TabsContent>

        <!-- 注册表单 -->
        <TabsContent value="register" class="space-y-4">
          <div class="space-y-2">
            <Label for="register-email">{{ t('auth.email') }}</Label>
            <Input
              id="register-email"
              v-model="email"
              type="email"
              placeholder="your@email.com"
            />
          </div>
          <div class="space-y-2">
            <Label for="register-password">{{ t('auth.password') }}</Label>
            <Input
              id="register-password"
              v-model="password"
              type="password"
              :placeholder="t('auth.passwordMinLengthPlaceholder')"
            />
          </div>
          <div class="space-y-2">
            <Label for="register-confirm">{{ t('auth.confirmPassword') }}</Label>
            <Input
              id="register-confirm"
              v-model="confirmPassword"
              type="password"
              :placeholder="t('auth.confirmPasswordPlaceholder')"
              @keyup.enter="handleRegister"
            />
          </div>

          <Button
            class="w-full"
            @click="handleRegister"
            :disabled="loading"
          >
            <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
            <Mail v-else class="mr-2 h-4 w-4" />
            {{ t('auth.emailRegister') }}
          </Button>
        </TabsContent>
      </Tabs>

      <!-- 分隔线 -->
      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <span class="w-full border-t" />
        </div>
        <div class="relative flex justify-center text-xs uppercase">
          <span class="bg-background px-2 text-muted-foreground">{{ t('auth.or') }}</span>
        </div>
      </div>

      <!-- GitHub 登录 -->
      <Button
        variant="outline"
        class="w-full"
        @click="handleGitHubLogin"
        :disabled="loading"
      >
        <Github class="mr-2 h-4 w-4" />
        {{ t('auth.githubLogin') }}
      </Button>

      <!-- 错误提示 -->
      <div v-if="error" class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        {{ error }}
      </div>

      <!-- 成功提示 -->
      <div v-if="success" class="rounded-md bg-green-500/10 p-3 text-sm text-green-600">
        {{ success }}
      </div>
    </DialogContent>
  </Dialog>
</template>

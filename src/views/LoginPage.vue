<script setup lang="ts">
// 登录/注册页
import { useLocale } from '@/composables/useLocale'

const { t } = useLocale()
</script>

<template>
  <div class="flex h-full items-center justify-center">
    <div class="text-center">
      <h1 class="text-2xl font-semibold">{{ t('login.title') }}</h1>
      <p class="mt-2 text-muted-foreground">{{ t('login.subtitle') }}</p>
    </div>
  </div>
</template>

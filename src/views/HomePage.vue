<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sparkles,
  Video,
  ArrowRight,
  ImagePlus,
  Film,
} from 'lucide-vue-next'
import { useLocale } from '@/composables/useLocale'
import AdSlot from '@/components/AdSlot.vue'
import { ADSENSE_SLOT_HOME } from '@/lib/adsense'

const router = useRouter()
const auth = useAuth()
const { t } = useLocale()

function goToAnalyze() {
  router.push('/analyze')
}

function goToCreate() {
  router.push('/create')
}

function goToLogin() {
  router.push('/login')
}
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="max-w-3xl mx-auto p-6 space-y-12">
      <!-- Hero -->
      <div class="text-center pt-12 pb-4">
        <h1 class="text-4xl font-bold tracking-tight">
          YouMedHub
          <span class="sr-only">{{ t('home.heroSeoTitle') }}</span>
        </h1>
        <p class="mt-3 text-lg text-muted-foreground">
          {{ t('home.heroSubtitle') }}
        </p>

        <div v-if="!auth.isAuthenticated.value" class="mt-4 text-sm text-muted-foreground">
          <Button variant="link" class="p-0 h-auto" @click="goToLogin">
            {{ t('home.loginHint') }}
            <ArrowRight class="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      <!-- 核心功能 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card class="group cursor-pointer transition-shadow hover:shadow-md" @click="goToAnalyze">
          <CardHeader>
            <div class="flex items-center gap-3">
              <div class="p-2 bg-primary/10 rounded-lg">
                <Video class="h-6 w-6 text-primary" />
              </div>
              <CardTitle class="text-lg">{{ t('home.analyzeTitle') }}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              {{ t('home.analyzeDesc') }}
            </CardDescription>
            <Button variant="ghost" class="mt-3 p-0 h-auto group-hover:text-primary">
              {{ t('home.analyzeCta') }}
              <ArrowRight class="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </CardContent>
        </Card>

        <Card class="group cursor-pointer transition-shadow hover:shadow-md" @click="goToCreate">
          <CardHeader>
            <div class="flex items-center gap-3">
              <div class="p-2 bg-primary/10 rounded-lg">
                <Sparkles class="h-6 w-6 text-primary" />
              </div>
              <CardTitle class="text-lg">{{ t('home.createTitle') }}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              {{ t('home.createDesc') }}
            </CardDescription>
            <Button variant="ghost" class="mt-3 p-0 h-auto group-hover:text-primary">
              {{ t('home.createCta') }}
              <ArrowRight class="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <!-- 即将推出 -->
      <div class="space-y-3">
        <h2 class="text-sm font-medium text-muted-foreground text-center">{{ t('home.upcoming') }}</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="flex items-center gap-3 p-4 rounded-lg border opacity-70">
            <ImagePlus class="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <div class="font-medium text-sm">{{ t('home.upcomingStoryboard') }}</div>
              <div class="text-xs text-muted-foreground">{{ t('home.upcomingStoryboardDesc') }}</div>
            </div>
          </div>
          <div class="flex items-center gap-3 p-4 rounded-lg border opacity-70">
            <Film class="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <div class="font-medium text-sm">{{ t('home.upcomingVideo') }}</div>
              <div class="text-xs text-muted-foreground">{{ t('home.upcomingVideoDesc') }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 广告位（首页底部） -->
      <AdSlot :ad-slot="ADSENSE_SLOT_HOME" />

      <!-- 页脚 -->
      <footer class="border-t pt-6 pb-8 text-center text-xs text-muted-foreground">
        <router-link to="/privacy" class="hover:text-foreground">
          {{ t('privacy.link') }}
        </router-link>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLocale } from '@/composables/useLocale'

const { t } = useLocale()

const sections = [
  { titleKey: 'privacy.data.title', bodyKey: 'privacy.data.body' },
  { titleKey: 'privacy.auth.title', bodyKey: 'privacy.auth.body' },
  { titleKey: 'privacy.local.title', bodyKey: 'privacy.local.body' },
  { titleKey: 'privacy.analytics.title', bodyKey: 'privacy.analytics.body' },
  { titleKey: 'privacy.ads.title', bodyKey: 'privacy.ads.body' },
  { titleKey: 'privacy.rights.title', bodyKey: 'privacy.rights.body' },
  { titleKey: 'privacy.contact.title', bodyKey: 'privacy.contact.body' },
]
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="mx-auto max-w-2xl p-6 pb-16">
      <h1 class="text-2xl font-semibold">{{ t('privacy.title') }}</h1>
      <p class="mt-2 text-sm text-muted-foreground">{{ t('privacy.updated') }}</p>

      <div class="mt-8 space-y-8">
        <section v-for="section in sections" :key="section.titleKey">
          <h2 class="text-base font-medium">{{ t(section.titleKey) }}</h2>
          <p class="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {{ t(section.bodyKey) }}
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

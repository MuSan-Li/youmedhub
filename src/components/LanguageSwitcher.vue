<script setup lang="ts">
import { Globe, Check } from 'lucide-vue-next'
import { useLocale, type Locale } from '@/composables/useLocale'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const { locale, setLocale, t } = useLocale()

const options: { value: Locale; label: string }[] = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
]
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button
        class="flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        :aria-label="t('layout.language')"
      >
        <Globe class="h-4 w-4" />
        <span>{{ locale === 'zh' ? '中文' : 'EN' }}</span>
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" :side-offset="4">
      <DropdownMenuItem
        v-for="option in options"
        :key="option.value"
        class="gap-2"
        @click="setLocale(option.value)"
      >
        <Check
          class="h-4 w-4"
          :class="locale === option.value ? 'opacity-100' : 'opacity-0'"
        />
        {{ option.label }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

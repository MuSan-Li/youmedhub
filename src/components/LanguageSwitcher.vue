<script setup lang="ts">
import { Globe, Check } from 'lucide-vue-next'
import { useLocale, type Locale } from '@/composables/useLocale'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

defineProps<{
  collapsed?: boolean
}>()

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
        class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        :class="collapsed ? 'justify-center' : 'justify-start'"
        :aria-label="t('layout.language')"
      >
        <Globe class="h-5 w-5 shrink-0" />
        <span v-if="!collapsed" class="truncate">{{ locale === 'zh' ? '中文' : 'English' }}</span>
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" :side-offset="4" :collision-padding="8">
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

<script setup lang="ts">
import { ref } from 'vue'
import { useFavorites, type SaveFavoriteParams } from '@/composables/useFavorites'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-vue-next'
import { useLocale } from '@/composables/useLocale'

const props = defineProps<{
  open: boolean
  data: Omit<SaveFavoriteParams, 'title' | 'description'> | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': [id: string]
}>()

const { saveFavorite } = useFavorites()
const { t } = useLocale()

const title = ref('')
const description = ref('')
const loading = ref(false)
const error = ref('')

// 重置表单
function resetForm() {
  title.value = ''
  description.value = ''
  error.value = ''
}

// 提交保存
async function handleSubmit() {
  if (!props.data) return

  if (!title.value.trim()) {
    error.value = t('fav.titleRequired')
    return
  }

  loading.value = true
  error.value = ''

  try {
    const result = await saveFavorite({
      ...props.data,
      title: title.value.trim(),
      description: description.value.trim(),
    })
    emit('saved', result.id)
    emit('update:open', false)
    resetForm()
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('fav.saveFail')
  } finally {
    loading.value = false
  }
}

// 关闭时重置
function handleOpenChange(open: boolean) {
  emit('update:open', open)
  if (!open) {
    resetForm()
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t('fav.saveTitle') }}</DialogTitle>
        <DialogDescription>
          {{ t('fav.saveDesc') }}
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <div class="space-y-2">
          <Label for="title">{{ t('fav.titleLabel') }}</Label>
          <Input
            id="title"
            v-model="title"
            :placeholder="t('fav.titlePlaceholder')"
            maxlength="100"
          />
        </div>

        <div class="space-y-2">
          <Label for="description">{{ t('fav.descLabel') }}</Label>
          <Textarea
            id="description"
            v-model="description"
            :placeholder="t('fav.descPlaceholder')"
            rows="3"
            maxlength="500"
          />
        </div>

        <div v-if="error" class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {{ error }}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="handleOpenChange(false)">
          {{ t('common.cancel') }}
        </Button>
        <Button @click="handleSubmit" :disabled="loading">
          <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
          {{ t('common.save') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

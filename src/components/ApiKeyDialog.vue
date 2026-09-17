<script setup lang="ts">
import { ref } from 'vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { useLocale } from '@/composables/useLocale'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Settings } from 'lucide-vue-next'

const { dashscopeApiKey, setDashscopeApiKey } = useVideoAnalysis()
const { t } = useLocale()
const open = ref(false)
const inputDashscopeKey = ref(dashscopeApiKey.value)

function handleSave() {
  setDashscopeApiKey(inputDashscopeKey.value.trim())
  open.value = false
}

function handleOpen() {
  inputDashscopeKey.value = dashscopeApiKey.value
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button variant="outline" size="sm" @click="handleOpen">
        <Settings class="mr-2 h-4 w-4" />
        {{ t('apiKey.title') }}
      </Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t('apiKey.title') }}</DialogTitle>
        <DialogDescription>
          {{ t('apiKey.description') }}
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-4">
        <div class="space-y-2">
          <label class="text-sm font-medium">{{ t('apiKey.label') }}</label>
          <Input
            v-model="inputDashscopeKey"
            type="password"
            placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="open = false">{{ t('common.cancel') }}</Button>
        <Button @click="handleSave">{{ t('common.save') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

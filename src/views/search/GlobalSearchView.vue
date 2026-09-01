<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import { searchService, type GlobalSearchEntry } from '@/services/search.service'
import { getApiErrorMessage } from '@/utils/error'

const router = useRouter(),
  q = ref(''),
  results = ref<GlobalSearchEntry[]>([]),
  loading = ref(false),
  error = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
watch(q, (value) => {
  clearTimeout(timer)
  if (value.trim().length < 2) {
    results.value = []
    return
  }
  timer = setTimeout(async () => {
    loading.value = true
    error.value = ''
    try {
      results.value = await searchService.global(value.trim())
    } catch (cause) {
      error.value = getApiErrorMessage(cause, 'Pencarian gagal.')
    } finally {
      loading.value = false
    }
  }, 250)
})
const focus = () => document.querySelector<HTMLInputElement>('#global-search')?.focus()
onMounted(() => {
  addEventListener('open-global-search', focus)
  focus()
})
onUnmounted(() => {
  clearTimeout(timer)
  removeEventListener('open-global-search', focus)
})
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <AppBreadcrumb />
    <h1 class="text-2xl font-bold">Pencarian Global</h1>
    <p class="mt-1 text-sm text-slate-500">
      Cari akun, customer, supplier, item, invoice, dan jurnal dari database.
    </p>
    <section class="panel mt-6 overflow-hidden">
      <label class="flex items-center gap-3 border-b p-5">
        <input
          id="global-search"
          v-model="q"
          class="w-full text-base outline-none"
          placeholder="Contoh: CUST-DEMO-001, INV-DEMO-001, ITEM-DEMO-001"
        />
      </label>
      <p v-if="error" class="m-4 rounded bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
      <div v-if="results.length" class="divide-y">
        <button
          v-for="result in results"
          :key="`${result.category}-${result.id}`"
          class="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50"
          @click="router.push(result.path)"
        >
          <span>
            <b class="block text-sm">{{ result.title }}</b>
            <small class="text-slate-400">{{ result.category }} · {{ result.subtitle }}</small>
          </span>
          <span class="text-blue-600">Buka</span>
        </button>
      </div>
      <div v-else class="p-12 text-center text-sm text-slate-400">
        {{
          loading
            ? 'Mencari…'
            : q.length < 2
              ? 'Ketik minimal 2 karakter.'
              : 'Tidak ada hasil yang cocok.'
        }}
      </div>
    </section>
  </div>
</template>

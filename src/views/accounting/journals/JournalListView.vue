<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppEmptyState from '@/components/common/AppEmptyState.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import { journalService } from '@/services/journal.service'
import type { Journal } from '@/types/accounting'
import { getApiErrorMessage } from '@/utils/error'

const router = useRouter()
const rows = ref<Journal[]>([])
const page = ref(1)
const total = ref(0)
const search = ref('')
const status = ref('')
const loading = ref(false)
const error = ref('')
const money = (value: string | number) => new Intl.NumberFormat('id-ID').format(Number(value))
const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await journalService.list({
      page: page.value,
      limit: 20,
      search: search.value || undefined,
      status: status.value || undefined,
    })
    rows.value = response.data
    total.value = response.meta.total
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Daftar jurnal gagal dimuat.')
  } finally {
    loading.value = false
  }
}
const filter = () => {
  page.value = 1
  void load()
}
const changePage = (value: number) => {
  page.value = value
  void load()
}
onMounted(load)
</script>

<template>
  <div>
    <AppBreadcrumb />
    <header class="mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">Daftar Jurnal</h1>
        <p class="text-sm text-slate-500">Jurnal manual dan jurnal dari transaksi operasional.</p>
      </div>
      <AppButton @click="router.push('/accounting/journals/new')">Buat Jurnal</AppButton>
    </header>
    <section class="panel overflow-hidden">
      <div class="flex gap-3 border-b p-4">
        <input
          v-model="search"
          class="field flex-1"
          placeholder="Nomor, referensi, atau deskripsi"
          @keyup.enter="filter"
        />
        <select v-model="status" class="field w-52" @change="filter">
          <option value="">Semua status</option>
          <option value="draft">Draft</option>
          <option value="pending_approval">Menunggu Persetujuan</option>
          <option value="approved">Disetujui</option>
          <option value="posted">Posted</option>
          <option value="reversed">Reversed</option>
        </select>
      </div>
      <p v-if="error" class="m-4 rounded bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b bg-slate-50 text-left">
              <th class="p-3">Nomor</th>
              <th class="p-3">Tanggal</th>
              <th class="p-3">Deskripsi</th>
              <th class="p-3">Sumber</th>
              <th class="p-3 text-right">Debit</th>
              <th class="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.id"
              class="cursor-pointer border-b hover:bg-slate-50"
              @click="router.push(`/accounting/journals/${row.id}`)"
            >
              <td class="p-3 font-medium text-blue-700">{{ row.journal_number }}</td>
              <td class="p-3">{{ String(row.journal_date).slice(0, 10) }}</td>
              <td class="p-3">{{ row.description }}</td>
              <td class="p-3">{{ row.source_type || 'Manual' }}</td>
              <td class="p-3 text-right">{{ money(row.total_debit) }}</td>
              <td class="p-3">
                <AppBadge tone="blue">{{ row.status }}</AppBadge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppEmptyState
        v-if="!loading && !rows.length && !error"
        title="Belum ada jurnal"
        description="Buat jurnal manual pertama atau ubah filter."
      />
      <div class="border-t p-4">
        <AppPagination :page="page" :total="total" :per-page="20" @change="changePage" />
      </div>
    </section>
  </div>
</template>

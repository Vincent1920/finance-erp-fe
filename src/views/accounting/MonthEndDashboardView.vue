<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { AlertCircle, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppButton from '@/components/common/AppButton.vue'
import { monthEndService, type MonthEndDashboard } from '@/services/month-end.service'
import { getApiErrorMessage } from '@/utils/error'

const asOfDate = ref(new Date().toISOString().slice(0, 10))
const dashboard = ref<MonthEndDashboard | null>(null)
const loading = ref(false)
const error = ref('')
const incomplete = computed(() => dashboard.value?.tasks.filter((task) => task.count > 0) ?? [])
const statusLabel: Record<string, string> = {
  open: 'Terbuka',
  soft_closed: 'Ditutup sementara',
  closed: 'Ditutup permanen',
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    dashboard.value = await monthEndService.dashboard(asOfDate.value)
  } catch (exception) {
    error.value = getApiErrorMessage(exception, 'Dashboard tutup bulan gagal dimuat.')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <AppBreadcrumb />
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">Dashboard Month-end</h1>
        <p class="mt-1 text-sm text-slate-500">
          Satu tempat untuk melihat hambatan sebelum periode ditutup.
        </p>
      </div>
      <div class="flex items-end gap-2">
        <label class="text-sm">
          Tanggal laporan
          <input v-model="asOfDate" type="date" class="field mt-1" />
        </label>
        <AppButton :icon="RefreshCw" :loading="loading" @click="load">Periksa kesiapan</AppButton>
      </div>
    </div>

    <div v-if="error" class="rounded-xl bg-red-50 p-4 text-sm text-red-700">{{ error }}</div>
    <div v-else-if="loading" class="grid gap-4 md:grid-cols-3">
      <div v-for="item in 6" :key="item" class="h-32 animate-pulse rounded-2xl bg-slate-100" />
    </div>
    <template v-else-if="dashboard">
      <section class="mb-6 grid gap-4 lg:grid-cols-[1.1fr_2fr]">
        <div class="panel flex items-center gap-5 p-6">
          <div
            class="grid h-28 w-28 shrink-0 place-items-center rounded-full border-[10px]"
            :class="dashboard.readinessScore === 100 ? 'border-emerald-500' : 'border-amber-400'"
          >
            <span class="text-2xl font-bold">{{ dashboard.readinessScore }}%</span>
          </div>
          <div>
            <p class="text-xs uppercase text-slate-500">Kesiapan tutup bulan</p>
            <h2 class="mt-1 text-xl font-bold">
              {{
                dashboard.readinessScore === 100
                  ? 'Siap diperiksa final'
                  : `${incomplete.length} pekerjaan perlu diselesaikan`
              }}
            </h2>
            <p class="mt-2 text-sm text-slate-500">
              Periode {{ dashboard.period.startDate }} sampai {{ dashboard.period.endDate }}
            </p>
            <span
              class="mt-2 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold"
            >
              {{ statusLabel[dashboard.period.status] }}
            </span>
          </div>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="task in dashboard.tasks" :key="task.code" class="panel p-4">
            <div class="flex items-start justify-between gap-3">
              <p class="text-sm text-slate-500">{{ task.label }}</p>
              <CheckCircle2 v-if="task.count === 0" class="h-5 w-5 text-emerald-600" />
              <AlertCircle v-else class="h-5 w-5 text-amber-600" />
            </div>
            <p class="mt-3 text-2xl font-bold">{{ task.count }}</p>
          </div>
        </div>
      </section>

      <section class="panel overflow-hidden">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b p-5">
          <div>
            <h2 class="font-bold">Daftar tindakan</h2>
            <p class="mt-1 text-xs text-slate-500">
              Urutan pekerjaan yang perlu diselesaikan sebelum menjalankan pemeriksaan penutupan.
            </p>
          </div>
          <RouterLink
            v-if="dashboard.readinessScore === 100"
            to="/accounting/closing"
            class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Lanjut ke Tutup Periode
            <ArrowRight class="h-4 w-4" />
          </RouterLink>
        </div>
        <div class="divide-y">
          <div
            v-for="task in dashboard.tasks"
            :key="task.code"
            class="flex flex-wrap items-center justify-between gap-4 p-5"
          >
            <div class="flex items-center gap-3">
              <div
                class="grid h-10 w-10 place-items-center rounded-full"
                :class="
                  task.count ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                "
              >
                <AlertCircle v-if="task.count" class="h-5 w-5" />
                <CheckCircle2 v-else class="h-5 w-5" />
              </div>
              <div>
                <p class="font-semibold">{{ task.label }}</p>
                <p class="text-xs text-slate-500">
                  {{
                    task.count ? `${task.count} item masih memerlukan tindakan` : 'Sudah selesai'
                  }}
                </p>
              </div>
            </div>
            <RouterLink
              v-if="task.count"
              :to="task.link"
              class="inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
            >
              Buka modul
              <ArrowRight class="h-4 w-4" />
            </RouterLink>
          </div>
        </div>
        <div
          v-if="dashboard.latestCloseRun"
          class="border-t bg-slate-50 p-4 text-xs text-slate-600"
        >
          Pemeriksaan terakhir: {{ dashboard.latestCloseRun.status }} ·
          {{ dashboard.latestCloseRun.failures }} kontrol wajib gagal.
        </div>
      </section>
    </template>
  </div>
</template>

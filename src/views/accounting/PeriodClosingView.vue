<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { CheckCircle2, LockKeyhole, RefreshCw, RotateCcw, XCircle } from 'lucide-vue-next'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import { periodClosingService, type ClosingPeriod } from '@/services/period-closing.service'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationStore } from '@/stores/notification.store'
import { getApiErrorMessage } from '@/utils/error'
import { formatCurrency } from '@/utils/currency'

const auth = useAuthStore()
const notifications = useNotificationStore()
const year = ref(new Date().getFullYear())
const periods = ref<ClosingPeriod[]>([])
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const selected = ref<ClosingPeriod | null>(null)
const closeMode = ref<'soft_closed' | 'closed'>('soft_closed')
const notes = ref('')
const reopenReason = ref('')
const closeModal = ref(false)
const reopenModal = ref(false)

const canReopen = computed(() => auth.hasPermission('accounting.reopen_period'))
const monthName = (month: number) =>
  new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(2026, month - 1, 1))
const statusLabel: Record<string, string> = {
  open: 'Terbuka',
  soft_closed: 'Ditutup sementara',
  closed: 'Ditutup permanen',
  failed: 'Ada masalah',
  validated: 'Siap ditutup',
  completed: 'Selesai',
}
const checkLabel: Record<string, string> = {
  ar_reconciled: 'Piutang vs buku besar',
  ap_reconciled: 'Utang vs buku besar',
  inventory_reconciled: 'Persediaan vs buku besar',
  bank_reconciled: 'Bank vs buku besar',
  depreciation_posted: 'Penyusutan aset',
  recurring_journals_reviewed: 'Jurnal berulang',
  trial_balance_balanced: 'Neraca saldo dan jurnal',
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    periods.value = await periodClosingService.list(year.value)
  } catch (exception) {
    error.value = getApiErrorMessage(exception, 'Data penutupan periode gagal dimuat.')
  } finally {
    loading.value = false
  }
}

function openValidation(period: ClosingPeriod, mode: 'soft_closed' | 'closed') {
  selected.value = period
  closeMode.value = mode
  notes.value = ''
  closeModal.value = true
}

async function validatePeriod() {
  if (!selected.value) return
  busy.value = true
  try {
    await periodClosingService.validate({
      period_id: selected.value.id,
      requested_status: closeMode.value,
      notes: notes.value || null,
    })
    closeModal.value = false
    notifications.push('Pemeriksaan selesai. Tinjau hasil sebelum menutup periode.')
    await load()
  } catch (exception) {
    notifications.push(getApiErrorMessage(exception, 'Pemeriksaan periode gagal.'), 'error')
  } finally {
    busy.value = false
  }
}

async function complete(period: ClosingPeriod) {
  if (!period.latest_run_id) return
  busy.value = true
  try {
    await periodClosingService.complete(period.latest_run_id)
    notifications.push('Periode berhasil ditutup.')
    await load()
  } catch (exception) {
    notifications.push(getApiErrorMessage(exception, 'Periode belum dapat ditutup.'), 'error')
  } finally {
    busy.value = false
  }
}

function openReopen(period: ClosingPeriod) {
  selected.value = period
  reopenReason.value = ''
  reopenModal.value = true
}

async function reopenPeriod() {
  if (!selected.value) return
  busy.value = true
  try {
    await periodClosingService.reopen(selected.value.id, reopenReason.value)
    reopenModal.value = false
    notifications.push('Periode berhasil dibuka kembali dan alasannya dicatat.')
    await load()
  } catch (exception) {
    notifications.push(
      getApiErrorMessage(exception, 'Periode tidak dapat dibuka kembali.'),
      'error',
    )
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <AppBreadcrumb />
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">Tutup Periode</h1>
        <p class="mt-1 text-sm text-slate-500">
          Periksa rekonsiliasi dan transaksi sebelum mengunci pembukuan.
        </p>
      </div>
      <div class="flex items-end gap-2">
        <label class="text-sm">
          Tahun
          <input v-model.number="year" type="number" class="field mt-1 w-28" />
        </label>
        <AppButton variant="secondary" :icon="RefreshCw" :loading="loading" @click="load">
          Muat
        </AppButton>
      </div>
    </div>

    <div v-if="error" class="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{{ error }}</div>
    <div v-if="loading" class="space-y-3">
      <div v-for="item in 4" :key="item" class="h-36 animate-pulse rounded-2xl bg-slate-100" />
    </div>
    <div v-else class="space-y-4">
      <article v-for="period in periods" :key="period.id" class="panel overflow-hidden">
        <div class="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h2 class="font-bold">{{ monthName(period.month) }} {{ period.year }}</h2>
            <p class="text-xs text-slate-500">
              {{ period.start_date }} sampai {{ period.end_date }}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
              {{ statusLabel[period.status] }}
            </span>
            <template v-if="period.status === 'open'">
              <AppButton
                variant="secondary"
                :disabled="busy"
                @click="openValidation(period, 'soft_closed')"
              >
                Periksa tutup sementara
              </AppButton>
              <AppButton :disabled="busy" @click="openValidation(period, 'closed')">
                Periksa tutup permanen
              </AppButton>
            </template>
            <AppButton
              v-if="period.run_status === 'validated' && period.status !== period.requested_status"
              :icon="LockKeyhole"
              :disabled="busy"
              @click="complete(period)"
            >
              Tutup sekarang
            </AppButton>
            <AppButton
              v-if="period.status !== 'open' && canReopen"
              variant="secondary"
              :icon="RotateCcw"
              :disabled="busy"
              @click="openReopen(period)"
            >
              Buka kembali
            </AppButton>
          </div>
        </div>

        <div v-if="period.checks.length" class="grid border-t md:grid-cols-2 xl:grid-cols-3">
          <div v-for="check in period.checks" :key="check.id" class="border-b p-4 md:border-r">
            <div class="flex items-start gap-3">
              <CheckCircle2
                v-if="check.status === 'passed'"
                class="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
              />
              <XCircle v-else class="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p class="text-sm font-semibold">
                  {{ checkLabel[check.check_code] ?? check.check_code }}
                </p>
                <p class="mt-1 text-xs text-slate-500">{{ check.details }}</p>
                <p v-if="check.difference !== null" class="mt-2 text-xs font-semibold">
                  Selisih {{ formatCurrency(Number(check.difference)) }}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="border-t p-4 text-sm text-slate-500">
          Belum ada pemeriksaan untuk periode ini.
        </div>
      </article>
      <p v-if="!periods.length" class="panel p-10 text-center text-sm text-slate-500">
        Belum ada periode akuntansi untuk tahun ini.
      </p>
    </div>

    <AppModal :open="closeModal" title="Periksa Penutupan Periode" @close="closeModal = false">
      <form id="closing-form" class="space-y-4" @submit.prevent="validatePeriod">
        <p class="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
          Sistem akan memeriksa piutang, utang, persediaan, bank, penyusutan, jurnal berulang,
          jurnal belum selesai, dan keseimbangan neraca saldo.
        </p>
        <label class="block text-sm">
          Catatan penutupan
          <textarea v-model="notes" class="field mt-1 min-h-24" maxlength="2000" />
        </label>
      </form>
      <template #footer>
        <AppButton variant="secondary" :disabled="busy" @click="closeModal = false">
          Batal
        </AppButton>
        <AppButton form="closing-form" type="submit" :loading="busy">
          Jalankan pemeriksaan
        </AppButton>
      </template>
    </AppModal>

    <AppModal :open="reopenModal" title="Buka Kembali Periode" @close="reopenModal = false">
      <form id="reopen-form" class="space-y-4" @submit.prevent="reopenPeriod">
        <p class="text-sm text-slate-600">
          Alasan akan disimpan dalam audit log. Periode setelahnya harus sudah terbuka.
        </p>
        <label class="block text-sm">
          Alasan
          <textarea
            v-model="reopenReason"
            required
            minlength="10"
            maxlength="2000"
            class="field mt-1 min-h-24"
          />
        </label>
      </form>
      <template #footer>
        <AppButton variant="secondary" :disabled="busy" @click="reopenModal = false">
          Batal
        </AppButton>
        <AppButton form="reopen-form" type="submit" :loading="busy">Buka kembali</AppButton>
      </template>
    </AppModal>
  </div>
</template>

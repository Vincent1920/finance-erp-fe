<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Calculator, CheckCircle2, LockKeyhole, RefreshCw, RotateCcw } from 'lucide-vue-next'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import {
  yearEndService,
  type YearEndAccount,
  type YearEndClosing,
  type YearEndPayload,
  type YearEndPreview,
} from '@/services/year-end.service'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationStore } from '@/stores/notification.store'
import { formatCurrency } from '@/utils/currency'
import { getApiErrorMessage } from '@/utils/error'

const auth = useAuthStore()
const notifications = useNotificationStore()
const accounts = ref<YearEndAccount[]>([])
const closings = ref<YearEndClosing[]>([])
const fiscalStart = ref(1)
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const preview = ref<YearEndPreview | null>(null)
const reverseModal = ref(false)
const selected = ref<YearEndClosing | null>(null)
const reverseReason = ref('')
const form = ref<YearEndPayload>({
  fiscal_year: new Date().getFullYear(),
  current_year_earnings_account_id: 0,
  retained_earnings_account_id: 0,
  notes: null,
})

const canReverse = computed(() => auth.hasPermission('accounting.reopen_period'))
const accountOptions = computed(() =>
  accounts.value.map((account) => ({
    value: account.id,
    label: `${account.code} · ${account.name}`,
  })),
)
const profitLabel = computed(() =>
  Number(preview.value?.netProfit ?? 0) >= 0 ? 'Laba tahun berjalan' : 'Rugi tahun berjalan',
)
const statusLabel: Record<string, string> = {
  draft: 'Draft',
  validated: 'Sudah divalidasi',
  posted: 'Sudah diposting',
  reversed: 'Sudah dibalik',
}
const statusClass: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  validated: 'bg-amber-100 text-amber-800',
  posted: 'bg-emerald-100 text-emerald-800',
  reversed: 'bg-red-100 text-red-700',
}

function defaultFiscalYear(startMonth: number) {
  const now = new Date()
  return startMonth === 1 || now.getMonth() + 1 < startMonth
    ? now.getFullYear()
    : now.getFullYear() + 1
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await yearEndService.overview()
    accounts.value = data.accounts
    closings.value = data.closings
    fiscalStart.value = data.fiscalYearStart
    if (!preview.value) form.value.fiscal_year = defaultFiscalYear(data.fiscalYearStart)
    if (!form.value.current_year_earnings_account_id)
      form.value.current_year_earnings_account_id =
        data.accounts.find(
          (account) => account.code === '3301' || /current year|laba tahun/i.test(account.name),
        )?.id ??
        data.accounts[0]?.id ??
        0
    if (!form.value.retained_earnings_account_id)
      form.value.retained_earnings_account_id =
        data.accounts.find(
          (account) =>
            account.id !== form.value.current_year_earnings_account_id &&
            (account.code === '3201' || /retained|laba ditahan/i.test(account.name)),
        )?.id ??
        data.accounts.find((account) => account.id !== form.value.current_year_earnings_account_id)
          ?.id ??
        0
  } catch (exception) {
    error.value = getApiErrorMessage(exception, 'Data tutup tahun gagal dimuat.')
  } finally {
    loading.value = false
  }
}

function validForm() {
  if (!form.value.current_year_earnings_account_id || !form.value.retained_earnings_account_id) {
    notifications.push('Pilih akun laba berjalan dan laba ditahan.', 'error')
    return false
  }
  if (form.value.current_year_earnings_account_id === form.value.retained_earnings_account_id) {
    notifications.push('Kedua akun ekuitas harus berbeda.', 'error')
    return false
  }
  return true
}

async function calculate() {
  if (!validForm()) return
  busy.value = true
  try {
    preview.value = await yearEndService.preview(form.value)
  } catch (exception) {
    notifications.push(getApiErrorMessage(exception, 'Pratinjau tutup tahun gagal.'), 'error')
  } finally {
    busy.value = false
  }
}

async function validateClosing() {
  if (!validForm()) return
  busy.value = true
  try {
    preview.value = await yearEndService.validate(form.value)
    notifications.push('Angka tutup tahun sudah dikunci sebagai hasil validasi.')
    await load()
  } catch (exception) {
    notifications.push(getApiErrorMessage(exception, 'Validasi tutup tahun gagal.'), 'error')
  } finally {
    busy.value = false
  }
}

async function postClosing(closing: YearEndClosing) {
  busy.value = true
  try {
    await yearEndService.post(closing.id)
    notifications.push('Jurnal penutupan dan pemindahan laba ditahan berhasil diposting.')
    preview.value = null
    await load()
  } catch (exception) {
    notifications.push(getApiErrorMessage(exception, 'Tutup tahun belum dapat diposting.'), 'error')
  } finally {
    busy.value = false
  }
}

function openReverse(closing: YearEndClosing) {
  selected.value = closing
  reverseReason.value = ''
  reverseModal.value = true
}

async function reverseClosing() {
  if (!selected.value) return
  busy.value = true
  try {
    await yearEndService.reverse(
      selected.value.id,
      selected.value.closing_date,
      reverseReason.value,
    )
    reverseModal.value = false
    notifications.push('Penutupan tahun berhasil dibalik pada tanggal penutupan yang sama.')
    await load()
  } catch (exception) {
    notifications.push(
      getApiErrorMessage(exception, 'Penutupan tahun tidak dapat dibalik.'),
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
        <h1 class="text-2xl font-bold">Tutup Tahun</h1>
        <p class="mt-1 text-sm text-slate-500">
          Nolkan akun laba rugi dan pindahkan hasil tahun berjalan ke laba ditahan.
        </p>
      </div>
      <AppButton variant="secondary" :icon="RefreshCw" :loading="loading" @click="load">
        Muat ulang
      </AppButton>
    </div>

    <div v-if="error" class="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{{ error }}</div>

    <section class="panel mb-6 p-5">
      <div class="mb-5 grid gap-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-900 md:grid-cols-3">
        <div>
          <strong>1. Pratinjau</strong>
          <br />
          Sistem menghitung saldo laba rugi.
        </div>
        <div>
          <strong>2. Validasi</strong>
          <br />
          Angka dikunci untuk pemeriksaan.
        </div>
        <div>
          <strong>3. Posting</strong>
          <br />
          Pengguna berwenang membuat jurnal final.
        </div>
      </div>
      <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <label class="text-sm">
          Tahun fiskal berakhir
          <input
            v-model.number="form.fiscal_year"
            type="number"
            min="1900"
            max="2200"
            class="field mt-1"
            @change="preview = null"
          />
        </label>
        <AppSelect
          v-model="form.current_year_earnings_account_id"
          label="Akun laba berjalan"
          :options="accountOptions"
          value-type="number"
          empty-label="Pilih akun"
          required
        />
        <AppSelect
          v-model="form.retained_earnings_account_id"
          label="Akun laba ditahan"
          :options="accountOptions"
          value-type="number"
          empty-label="Pilih akun"
          required
        />
        <label class="text-sm">
          Catatan
          <input v-model="form.notes" class="field mt-1" maxlength="2000" placeholder="Opsional" />
        </label>
      </div>
      <p class="mt-3 text-xs text-slate-500">
        Awal tahun fiskal perusahaan: bulan {{ fiscalStart }}. Seluruh 12 periode harus ditutup
        permanen.
      </p>
      <div class="mt-5 flex flex-wrap gap-2">
        <AppButton :icon="Calculator" :loading="busy" @click="calculate">
          Hitung pratinjau
        </AppButton>
        <AppButton
          v-if="preview"
          variant="secondary"
          :icon="CheckCircle2"
          :loading="busy"
          @click="validateClosing"
        >
          Validasi angka
        </AppButton>
      </div>
    </section>

    <section v-if="preview" class="panel mb-6 overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b p-5">
        <div>
          <h2 class="font-bold">Pratinjau jurnal penutupan</h2>
          <p class="text-xs text-slate-500">
            {{ preview.range.dateFrom }} sampai {{ preview.range.dateTo }}
          </p>
        </div>
        <div class="text-right">
          <p class="text-xs uppercase text-slate-500">{{ profitLabel }}</p>
          <p
            class="text-xl font-bold"
            :class="Number(preview.netProfit) < 0 ? 'text-red-600' : 'text-emerald-600'"
          >
            {{ formatCurrency(Math.abs(Number(preview.netProfit))) }}
          </p>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th class="p-3">Nomor akun</th>
              <th class="p-3">Nama akun</th>
              <th class="p-3 text-right">Saldo akhir</th>
              <th class="p-3 text-right">Debit penutup</th>
              <th class="p-3 text-right">Kredit penutup</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in preview.accountLines" :key="line.accountId" class="border-t">
              <td class="p-3 font-mono">{{ line.code }}</td>
              <td class="p-3">{{ line.name }}</td>
              <td class="p-3 text-right">{{ formatCurrency(Number(line.closingBalance)) }}</td>
              <td class="p-3 text-right">{{ formatCurrency(Number(line.debit)) }}</td>
              <td class="p-3 text-right">{{ formatCurrency(Number(line.credit)) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel overflow-hidden">
      <div class="border-b p-5"><h2 class="font-bold">Riwayat tutup tahun</h2></div>
      <div v-if="loading" class="p-8 text-center text-sm text-slate-500">Memuat data…</div>
      <div v-else-if="!closings.length" class="p-8 text-center text-sm text-slate-500">
        Belum ada proses tutup tahun.
      </div>
      <div v-else class="divide-y">
        <article
          v-for="closing in closings"
          :key="closing.id"
          class="flex flex-wrap items-center justify-between gap-4 p-5"
        >
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="font-bold">Tahun fiskal {{ closing.fiscal_year }}</h3>
              <span
                class="rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="statusClass[closing.status]"
              >
                {{ statusLabel[closing.status] }}
              </span>
            </div>
            <p class="mt-1 text-sm">
              {{ Number(closing.current_year_earnings) >= 0 ? 'Laba' : 'Rugi' }}
              {{ formatCurrency(Math.abs(Number(closing.current_year_earnings))) }}
            </p>
            <p class="mt-1 text-xs text-slate-500">
              {{ closing.current_account_code }} · {{ closing.current_account_name }} →
              {{ closing.retained_account_code }} · {{ closing.retained_account_name }}
            </p>
            <p v-if="closing.closing_journal_number" class="mt-1 text-xs text-slate-500">
              Jurnal: {{ closing.closing_journal_number }}
              <template v-if="closing.retained_journal_number">
                , {{ closing.retained_journal_number }}
              </template>
            </p>
          </div>
          <div class="flex gap-2">
            <AppButton
              v-if="closing.status === 'validated'"
              :icon="LockKeyhole"
              :loading="busy"
              @click="postClosing(closing)"
            >
              Posting
            </AppButton>
            <AppButton
              v-if="closing.status === 'posted' && canReverse"
              variant="danger"
              :icon="RotateCcw"
              :disabled="busy"
              @click="openReverse(closing)"
            >
              Balikkan
            </AppButton>
          </div>
        </article>
      </div>
    </section>

    <AppModal
      :open="reverseModal"
      title="Balikkan Tutup Tahun"
      :close-disabled="busy"
      @close="reverseModal = false"
    >
      <form id="reverse-year-end" class="space-y-4" @submit.prevent="reverseClosing">
        <p class="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          Jurnal pembalik memakai tanggal {{ selected?.closing_date }} agar laporan tahun berikutnya
          tidak berubah. Setelah itu periode dapat dibuka kembali untuk koreksi.
        </p>
        <label class="block text-sm">
          Alasan pembalikan
          <textarea
            v-model="reverseReason"
            required
            minlength="10"
            maxlength="2000"
            class="field mt-1 min-h-24"
          />
        </label>
      </form>
      <template #footer>
        <AppButton variant="secondary" :disabled="busy" @click="reverseModal = false">
          Batal
        </AppButton>
        <AppButton form="reverse-year-end" type="submit" variant="danger" :loading="busy">
          Balikkan penutupan
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>

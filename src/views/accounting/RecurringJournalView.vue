<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { CalendarClock, CheckCircle2, Pause, Pencil, Play, Plus, RefreshCw } from 'lucide-vue-next'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppNumberInput from '@/components/common/AppNumberInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import { accountService } from '@/services/account.service'
import {
  recurringJournalService,
  type RecurringPayload,
  type RecurringTemplate,
} from '@/services/recurring-journal.service'
import { useNotificationStore } from '@/stores/notification.store'
import type { AccountRecord } from '@/types/master'
import { formatCurrency } from '@/utils/currency'
import { getApiErrorMessage } from '@/utils/error'

const notifications = useNotificationStore()
const templates = ref<RecurringTemplate[]>([])
const accounts = ref<AccountRecord[]>([])
const loading = ref(false)
const busy = ref(false)
const modalOpen = ref(false)
const editing = ref<RecurringTemplate | null>(null)
const error = ref('')
const asOfDate = ref(new Date().toISOString().slice(0, 10))

const emptyLine = () => ({ accountId: 0, description: '', debit: 0, credit: 0 })
const form = reactive({
  name: '',
  description: '',
  reference: '',
  frequency: 'monthly' as RecurringTemplate['frequency'],
  interval_value: 1,
  interval_unit: 'month' as NonNullable<RecurringTemplate['interval_unit']>,
  start_date: new Date().toISOString().slice(0, 10),
  end_date: '',
  currency: 'IDR',
  exchange_rate: 1,
  auto_submit: true,
  lines: [emptyLine(), emptyLine()],
})

const dueCount = computed(() => templates.value.filter((item) => item.is_due).length)
const activeCount = computed(() => templates.value.filter((item) => Boolean(item.is_active)).length)
const accountOptions = computed(() =>
  accounts.value.map((account) => ({
    value: account.id,
    label: `${account.code} · ${account.name}`,
  })),
)
const debit = computed(() => form.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0))
const credit = computed(() => form.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0))
const balanced = computed(() => debit.value > 0 && Math.abs(debit.value - credit.value) < 0.005)
const frequencyLabel: Record<string, string> = {
  monthly: 'Bulanan',
  quarterly: 'Triwulanan',
  yearly: 'Tahunan',
  custom: 'Jadwal khusus',
}
const unitLabel: Record<string, string> = {
  day: 'hari',
  week: 'minggu',
  month: 'bulan',
  year: 'tahun',
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [templateData, accountData] = await Promise.all([
      recurringJournalService.list(),
      accountService.all({ limit: 500, is_active: true, is_posting: true }),
    ])
    templates.value = templateData
    accounts.value = accountData.data
  } catch (exception) {
    error.value = getApiErrorMessage(exception, 'Jadwal jurnal gagal dimuat.')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  Object.assign(form, {
    name: '',
    description: '',
    reference: '',
    frequency: 'monthly',
    interval_value: 1,
    interval_unit: 'month',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    currency: 'IDR',
    exchange_rate: 1,
    auto_submit: true,
    lines: [emptyLine(), emptyLine()],
  })
  modalOpen.value = true
}

function openEdit(template: RecurringTemplate) {
  editing.value = template
  Object.assign(form, {
    name: template.name,
    description: template.description ?? '',
    reference: template.reference ?? '',
    frequency: template.frequency,
    interval_value: Number(template.interval_value),
    interval_unit: template.interval_unit ?? 'month',
    start_date: template.start_date,
    end_date: template.end_date ?? '',
    currency: template.currency,
    exchange_rate: Number(template.exchange_rate),
    auto_submit: Boolean(template.auto_submit),
    lines: template.lines.map((line) => ({
      accountId: Number(line.account_id ?? line.accountId ?? 0),
      description: line.description ?? '',
      debit: Number(line.debit),
      credit: Number(line.credit),
    })),
  })
  modalOpen.value = true
}

function payload(): RecurringPayload {
  return {
    name: form.name,
    description: form.description || null,
    reference: form.reference || null,
    frequency: form.frequency,
    interval_value: form.frequency === 'custom' ? Number(form.interval_value) : 1,
    interval_unit: form.frequency === 'custom' ? form.interval_unit : null,
    start_date: form.start_date,
    end_date: form.end_date || null,
    currency: form.currency,
    exchange_rate: String(form.exchange_rate),
    auto_submit: form.auto_submit,
    lines: form.lines.map((line) => ({
      accountId: Number(line.accountId),
      description: line.description || undefined,
      debit: String(line.debit),
      credit: String(line.credit),
    })),
    ...(editing.value ? { version: editing.value.version } : {}),
  }
}

async function save() {
  if (!balanced.value) {
    notifications.push('Total debit dan kredit harus sama dan lebih dari nol.', 'error')
    return
  }
  busy.value = true
  try {
    if (editing.value) await recurringJournalService.update(editing.value.id, payload())
    else await recurringJournalService.create(payload())
    modalOpen.value = false
    notifications.push(editing.value ? 'Jadwal jurnal diperbarui.' : 'Jadwal jurnal dibuat.')
    await load()
  } catch (exception) {
    notifications.push(getApiErrorMessage(exception, 'Jadwal jurnal gagal disimpan.'), 'error')
  } finally {
    busy.value = false
  }
}

async function setActive(template: RecurringTemplate) {
  busy.value = true
  try {
    await recurringJournalService.setActive(template.id, !Boolean(template.is_active))
    notifications.push(Boolean(template.is_active) ? 'Jadwal dinonaktifkan.' : 'Jadwal diaktifkan.')
    await load()
  } catch (exception) {
    notifications.push(getApiErrorMessage(exception, 'Status jadwal gagal diubah.'), 'error')
  } finally {
    busy.value = false
  }
}

async function generate(template: RecurringTemplate) {
  busy.value = true
  try {
    await recurringJournalService.generate(template.id, asOfDate.value)
    notifications.push('Jurnal berhasil dibuat dan masuk ke alur persetujuan.')
    await load()
  } catch (exception) {
    notifications.push(getApiErrorMessage(exception, 'Jurnal belum dapat dibuat.'), 'error')
  } finally {
    busy.value = false
  }
}

async function generateAll() {
  busy.value = true
  try {
    const result = await recurringJournalService.generateDue(asOfDate.value)
    const message = `${result.generated.length} jurnal dibuat${result.failed.length ? `, ${result.failed.length} gagal` : ''}.`
    notifications.push(message, result.failed.length ? 'error' : 'success')
    await load()
  } catch (exception) {
    notifications.push(getApiErrorMessage(exception, 'Jurnal jatuh tempo gagal diproses.'), 'error')
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
        <h1 class="text-2xl font-bold">Jurnal Berulang</h1>
        <p class="mt-1 text-sm text-slate-500">
          Otomatisasi sewa, akrual, amortisasi, dan beban rutin dengan proses persetujuan.
        </p>
      </div>
      <div class="flex flex-wrap items-end gap-2">
        <label class="text-sm">
          Proses sampai tanggal
          <input v-model="asOfDate" type="date" class="field mt-1" />
        </label>
        <AppButton variant="secondary" :icon="RefreshCw" :loading="loading" @click="load">
          Muat ulang
        </AppButton>
        <AppButton :icon="Plus" @click="openCreate">Jadwal baru</AppButton>
      </div>
    </div>

    <div class="mb-6 grid gap-4 md:grid-cols-3">
      <div class="panel p-5">
        <p class="text-xs uppercase text-slate-500">Jadwal aktif</p>
        <p class="mt-2 text-3xl font-bold">{{ activeCount }}</p>
      </div>
      <div class="panel p-5">
        <p class="text-xs uppercase text-slate-500">Jatuh tempo hari ini</p>
        <p
          class="mt-2 text-3xl font-bold"
          :class="dueCount ? 'text-amber-600' : 'text-emerald-600'"
        >
          {{ dueCount }}
        </p>
      </div>
      <div class="panel flex items-center justify-between gap-3 p-5">
        <div>
          <p class="text-xs uppercase text-slate-500">Proses massal</p>
          <p class="mt-1 text-sm">Mencakup seluruh jadwal tertunda sampai tanggal pilihan.</p>
        </div>
        <AppButton :icon="Play" :loading="busy" @click="generateAll">Proses</AppButton>
      </div>
    </div>

    <div v-if="error" class="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{{ error }}</div>
    <section class="panel overflow-hidden">
      <div v-if="loading" class="p-10 text-center text-sm text-slate-500">Memuat jadwal…</div>
      <div v-else-if="!templates.length" class="p-10 text-center text-sm text-slate-500">
        Belum ada jurnal berulang.
      </div>
      <div v-else class="divide-y">
        <article v-for="template in templates" :key="template.id" class="p-5">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-mono text-xs text-slate-500">{{ template.template_number }}</span>
                <span
                  v-if="template.is_due"
                  class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800"
                >
                  Jatuh tempo
                </span>
                <span
                  v-else-if="template.is_active"
                  class="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                >
                  Aktif
                </span>
                <span v-else class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">
                  Tidak aktif
                </span>
              </div>
              <h2 class="mt-2 text-lg font-bold">{{ template.name }}</h2>
              <p class="mt-1 text-sm text-slate-500">
                {{ frequencyLabel[template.frequency] }}
                <template v-if="template.frequency === 'custom'">
                  · setiap {{ template.interval_value }}
                  {{ unitLabel[template.interval_unit || 'month'] }}
                </template>
                · berikutnya {{ template.next_run_date }}
              </p>
              <p class="mt-2 text-sm font-semibold">
                {{ formatCurrency(Number(template.total_debit)) }}
              </p>
              <p class="mt-1 text-xs text-slate-500">
                {{ template.run_count }} kali dibuat
                <template v-if="template.last_journal_number">
                  · terakhir {{ template.last_journal_number }}
                </template>
                · {{ template.auto_submit ? 'otomatis diajukan' : 'disimpan sebagai draft' }}
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <AppButton
                v-if="template.is_active && template.next_run_date <= asOfDate"
                :icon="CalendarClock"
                :loading="busy"
                @click="generate(template)"
              >
                Buat jurnal
              </AppButton>
              <AppButton
                variant="secondary"
                :icon="Pencil"
                :disabled="busy"
                @click="openEdit(template)"
              >
                Edit
              </AppButton>
              <AppButton
                variant="secondary"
                :icon="template.is_active ? Pause : Play"
                :disabled="busy"
                @click="setActive(template)"
              >
                {{ template.is_active ? 'Nonaktifkan' : 'Aktifkan' }}
              </AppButton>
            </div>
          </div>
          <div class="mt-4 grid gap-2 border-t pt-4 md:grid-cols-2">
            <div
              v-for="line in template.lines"
              :key="`${template.id}-${line.account_id}`"
              class="flex justify-between gap-3 text-xs"
            >
              <span>{{ line.account_code }} · {{ line.account_name }}</span>
              <span class="font-semibold">
                {{
                  Number(line.debit)
                    ? `D ${formatCurrency(Number(line.debit))}`
                    : `K ${formatCurrency(Number(line.credit))}`
                }}
              </span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <AppModal
      :open="modalOpen"
      :title="editing ? 'Edit Jurnal Berulang' : 'Jurnal Berulang Baru'"
      size="xl"
      :close-disabled="busy"
      @close="modalOpen = false"
    >
      <form id="recurring-form" class="space-y-5" @submit.prevent="save">
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label class="text-sm">
            Nama
            <input
              v-model="form.name"
              required
              minlength="3"
              maxlength="191"
              class="field mt-1"
              placeholder="Contoh: Sewa kantor bulanan"
            />
          </label>
          <label class="text-sm">
            Referensi
            <input v-model="form.reference" maxlength="100" class="field mt-1" />
          </label>
          <label class="text-sm">
            Frekuensi
            <select v-model="form.frequency" class="field mt-1">
              <option value="monthly">Bulanan</option>
              <option value="quarterly">Triwulanan</option>
              <option value="yearly">Tahunan</option>
              <option value="custom">Khusus</option>
            </select>
          </label>
          <template v-if="form.frequency === 'custom'">
            <label class="text-sm">
              Setiap
              <AppNumberInput
                v-model="form.interval_value"
                :min="1"
                :max="120"
                :decimals="0"
                class="mt-1"
              />
            </label>
            <label class="text-sm">
              Satuan
              <select v-model="form.interval_unit" class="field mt-1">
                <option value="day">Hari</option>
                <option value="week">Minggu</option>
                <option value="month">Bulan</option>
                <option value="year">Tahun</option>
              </select>
            </label>
          </template>
          <label class="text-sm">
            Tanggal mulai
            <input v-model="form.start_date" type="date" required class="field mt-1" />
          </label>
          <label class="text-sm">
            Tanggal selesai
            <input v-model="form.end_date" type="date" class="field mt-1" />
          </label>
          <label class="text-sm">
            Kurs
            <AppNumberInput
              v-model="form.exchange_rate"
              :min="0.00000001"
              :decimals="8"
              class="mt-1"
            />
          </label>
          <label
            class="flex items-center gap-2 self-end rounded-xl bg-blue-50 p-3 text-sm text-blue-900"
          >
            <input v-model="form.auto_submit" type="checkbox" />
            Ajukan otomatis untuk persetujuan
          </label>
          <label class="text-sm md:col-span-2 lg:col-span-3">
            Deskripsi
            <textarea v-model="form.description" maxlength="2000" class="field mt-1 min-h-20" />
          </label>
        </div>
        <div class="overflow-x-auto rounded-xl border">
          <table class="w-full min-w-[760px] text-sm">
            <thead class="bg-slate-50">
              <tr>
                <th class="p-3 text-left">Akun</th>
                <th class="p-3 text-left">Keterangan</th>
                <th class="p-3">Debit</th>
                <th class="p-3">Kredit</th>
                <th class="w-20" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, index) in form.lines" :key="index" class="border-t">
                <td class="p-2">
                  <AppSelect
                    v-model="line.accountId"
                    :options="accountOptions"
                    value-type="number"
                    empty-label="Pilih akun"
                    required
                  />
                </td>
                <td class="p-2"><input v-model="line.description" class="field" /></td>
                <td class="p-2"><AppNumberInput v-model="line.debit" :min="0" :decimals="2" /></td>
                <td class="p-2"><AppNumberInput v-model="line.credit" :min="0" :decimals="2" /></td>
                <td class="p-2">
                  <button
                    type="button"
                    class="text-red-600"
                    :disabled="form.lines.length <= 2"
                    @click="form.lines.splice(index, 1)"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="border-t font-bold">
                <td colspan="2" class="p-3 text-right">Total</td>
                <td class="p-3 text-right">{{ debit.toLocaleString('id-ID') }}</td>
                <td class="p-3 text-right">{{ credit.toLocaleString('id-ID') }}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <div class="flex items-center justify-between">
          <AppButton variant="secondary" :icon="Plus" @click="form.lines.push(emptyLine())">
            Tambah baris
          </AppButton>
          <span
            class="flex items-center gap-2 text-sm"
            :class="balanced ? 'text-emerald-700' : 'text-red-600'"
          >
            <CheckCircle2 class="h-4 w-4" />
            {{ balanced ? 'Jurnal seimbang' : 'Debit dan kredit belum seimbang' }}
          </span>
        </div>
      </form>
      <template #footer>
        <AppButton variant="secondary" :disabled="busy" @click="modalOpen = false">Batal</AppButton>
        <AppButton form="recurring-form" type="submit" :loading="busy" :disabled="!balanced">
          Simpan jadwal
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Download,
  FileText,
  Landmark,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  UsersRound,
  WalletCards,
} from 'lucide-vue-next'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import { payrollService } from '@/services/payroll.service'
import { formatCurrency as money } from '@/utils/currency'
import { exportRows } from '@/utils/export'
import { getApiErrorMessage } from '@/utils/error'

const now = new Date(),
  period = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
const tab = ref<'summary' | 'process' | 'employees' | 'validation' | 'reconciliation' | 'settings'>(
    'summary',
  ),
  data = ref<any>(null),
  loading = ref(false),
  busy = ref(false),
  error = ref(''),
  notice = ref('')
const runModal = ref(false),
  employeeModal = ref(false),
  slip = ref<any>(null),
  editEntry = ref<any>(null),
  payModal = ref(false),
  reopenModal = ref(false),
  reopenReason = ref('')
const runForm = ref({
  period: period.value,
  pay_date: `${period.value}-28`,
  notes: 'Payroll bulanan',
})
const employeeForm = ref<any>({
  employee_number: '',
  name: '',
  nik: '',
  npwp: '',
  email: '',
  department: '',
  position: '',
  employment_type: 'permanent',
  ptkp_status: 'TK/0',
  ter_category: 'A',
  hire_date: `${period.value}-01`,
  termination_date: null,
  bank_name: '',
  bank_account_number: '',
  bank_account_name: '',
  bpjs_health_number: '',
  bpjs_employment_number: '',
  basic_salary: 0,
  fixed_allowance: 0,
  is_active: true,
})
const entryForm = ref<any>({}),
  payment = ref({ payment_account_id: '', payment_date: `${period.value}-28` })
const current = computed(() => data.value?.current_run),
  run = computed(() => current.value?.run),
  entries = computed(() => current.value?.entries ?? [])
const validation = computed(
  () => current.value?.validation ?? { issues: [], blocking: 0, warnings: 0 },
)
const processSearch = ref(''),
  processDepartment = ref(''),
  exceptionOnly = ref(false),
  processPage = ref(1),
  pageSize = ref(25),
  employeeSearch = ref(''),
  employeeDepartment = ref(''),
  employeePage = ref(1)
const departments = computed<string[]>(() =>
  [
    ...new Set<string>(
      (data.value?.employees ?? []).map((e: any) => String(e.department ?? '')).filter(Boolean),
    ),
  ].sort(),
)
const issueEmployeeIds = computed(
  () =>
    new Set(
      validation.value.issues
        .filter((i: any) => i.employee_id)
        .map((i: any) => Number(i.employee_id)),
    ),
)
const filteredEntries = computed(() =>
  entries.value.filter((e: any) => {
    const q = processSearch.value.toLowerCase()
    return (
      (!q || `${e.employee_number} ${e.name}`.toLowerCase().includes(q)) &&
      (!processDepartment.value || e.department === processDepartment.value) &&
      (!exceptionOnly.value || issueEmployeeIds.value.has(Number(e.employee_id)))
    )
  }),
)
const pagedEntries = computed(() =>
  filteredEntries.value.slice(
    (processPage.value - 1) * pageSize.value,
    processPage.value * pageSize.value,
  ),
)
const processPages = computed(() =>
  Math.max(1, Math.ceil(filteredEntries.value.length / pageSize.value)),
)
const filteredEmployees = computed(() =>
  (data.value?.employees ?? []).filter((e: any) => {
    const q = employeeSearch.value.toLowerCase()
    return (
      (!q || `${e.employee_number} ${e.name}`.toLowerCase().includes(q)) &&
      (!employeeDepartment.value || e.department === employeeDepartment.value)
    )
  }),
)
const pagedEmployees = computed(() =>
  filteredEmployees.value.slice(
    (employeePage.value - 1) * pageSize.value,
    employeePage.value * pageSize.value,
  ),
)
const employeePages = computed(() =>
  Math.max(1, Math.ceil(filteredEmployees.value.length / pageSize.value)),
)
const expenseAccounts = computed(() =>
    (data.value?.accounts ?? []).filter((x: any) => x.account_type === 'expense'),
  ),
  liabilityAccounts = computed(() =>
    (data.value?.accounts ?? []).filter((x: any) => x.account_type === 'liability'),
  ),
  assetAccounts = computed(() =>
    (data.value?.accounts ?? []).filter((x: any) => x.account_type === 'asset'),
  )
const policy = ref<any>({})
const rateKeys = [
  'health_employee_rate',
  'health_employer_rate',
  'jht_employee_rate',
  'jht_employer_rate',
  'jp_employee_rate',
  'jp_employer_rate',
  'jkk_employer_rate',
  'jkm_employer_rate',
]
const percentRates = ref<Record<string, number>>({})
const statusLabel: any = {
  draft: 'Draft',
  calculated: 'Sudah dihitung',
  approved: 'Disetujui',
  posted: 'Jurnal diposting',
  paid: 'Dibayar',
  locked: 'Dikunci',
}
const shortDate = (value: any) => String(value ?? '').slice(0, 10)
const tabs = [
  ['summary', 'Ringkasan'],
  ['process', 'Proses Gaji'],
  ['employees', 'Pegawai'],
  ['validation', 'Validasi'],
  ['reconciliation', 'Rekonsiliasi'],
  ['settings', 'Pengaturan'],
]
const terForPtkp = (value: string) =>
  ['TK/0', 'TK/1', 'K/0'].includes(value)
    ? 'A'
    : ['TK/2', 'TK/3', 'K/1', 'K/2'].includes(value)
      ? 'B'
      : 'C'

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await payrollService.overview(period.value)
    policy.value = { ...data.value.policy }
    percentRates.value = Object.fromEntries(
      rateKeys.map((key) => [key, Number((Number(policy.value[key] ?? 0) * 100).toFixed(4))]),
    )
    runForm.value.period = period.value
    runForm.value.pay_date = `${period.value}-28`
    payment.value.payment_date = `${period.value}-28`
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Payroll gagal dimuat.')
  } finally {
    loading.value = false
  }
}
async function task(fn: () => Promise<any>, message: string) {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await fn()
    notice.value = message
    await load()
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Proses payroll gagal.')
  } finally {
    busy.value = false
  }
}
async function createRun() {
  await task(() => payrollService.createRun(runForm.value), 'Periode payroll berhasil dibuat.')
  runModal.value = false
  tab.value = 'process'
}
async function createEmployee() {
  await task(
    () =>
      payrollService.createEmployee({
        ...employeeForm.value,
        ter_category: terForPtkp(employeeForm.value.ptkp_status),
        basic_salary: Number(employeeForm.value.basic_salary),
        fixed_allowance: Number(employeeForm.value.fixed_allowance),
      }),
    'Pegawai berhasil ditambahkan.',
  )
  employeeModal.value = false
}
function openEntry(e: any) {
  editEntry.value = e
  entryForm.value = {
    variable_allowance: e.variable_allowance,
    overtime: e.overtime,
    bonus: e.bonus,
    thr: e.thr,
    rapel: e.rapel,
    reimbursement: e.reimbursement,
    absence_deduction: e.absence_deduction,
    loan_deduction: e.loan_deduction,
    other_deduction: e.other_deduction,
    pph21_override: e.pph21_override,
    pph21_override_reason: e.pph21_override_reason,
  }
}
async function saveEntry() {
  await task(
    () => payrollService.updateEntry(run.value.id, editEntry.value.id, entryForm.value),
    'Komponen gaji disimpan.',
  )
  editEntry.value = null
}
function accountOptions(kind: 'expense' | 'liability' | 'asset') {
  return kind === 'expense'
    ? expenseAccounts.value
    : kind === 'liability'
      ? liabilityAccounts.value
      : assetAccounts.value
}
async function savePolicy() {
  const numeric = [
    'health_wage_cap',
    'health_wage_floor',
    'jp_wage_cap',
    'salary_expense_account_id',
    'employer_bpjs_expense_account_id',
    'payroll_payable_account_id',
    'bpjs_payable_account_id',
    'pph21_payable_account_id',
    'employee_loan_account_id',
    'other_deduction_account_id',
  ]
  const payload = { ...policy.value }
  numeric.forEach((k) => (payload[k] = Number(payload[k])))
  rateKeys.forEach((key) => (payload[key] = Number(percentRates.value[key] ?? 0) / 100))
  await task(() => payrollService.savePolicy(payload), 'Pengaturan payroll berhasil disimpan.')
}
async function reopenRun() {
  await task(
    () => payrollService.reopen(run.value.id, reopenReason.value),
    'Payroll dikembalikan ke Draft dan alasan koreksi dicatat.',
  )
  reopenModal.value = false
  reopenReason.value = ''
}
function exportPayroll() {
  const columns = [
    ['NIP', 'NIP'],
    ['Nama', 'Nama'],
    ['Gaji Pokok', 'Gaji Pokok'],
    ['Tunjangan', 'Tunjangan'],
    ['Lembur/Bonus/THR', 'Lembur/Bonus/THR'],
    ['Potongan Operasional', 'Potongan Operasional'],
    ['BPJS Pegawai', 'BPJS Pegawai'],
    ['PPh 21', 'PPh 21'],
    ['Take Home Pay', 'Take Home Pay'],
    ['BPJS Perusahaan', 'BPJS Perusahaan'],
    ['Biaya Perusahaan', 'Biaya Perusahaan'],
  ]
  exportRows(
    `payroll-${period.value}`,
    columns,
    entries.value.map((e: any) => ({
      NIP: e.employee_number,
      Nama: e.name,
      'Gaji Pokok': e.basic_salary,
      Tunjangan: Number(e.fixed_allowance) + Number(e.variable_allowance),
      'Lembur/Bonus/THR': Number(e.overtime) + Number(e.bonus) + Number(e.thr) + Number(e.rapel),
      'Potongan Operasional': e.operational_deductions,
      'BPJS Pegawai': e.employee_bpjs,
      'PPh 21': e.pph21,
      'Take Home Pay': e.take_home_pay,
      'BPJS Perusahaan': e.employer_bpjs,
      'Biaya Perusahaan': e.company_cost,
    })),
  )
}
onMounted(load)
</script>

<template>
  <div class="space-y-5">
    <AppBreadcrumb :items="[{ label: 'PAYROLL' }]" />
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div class="flex items-center gap-3">
          <span class="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-white">
            <WalletCards class="h-6 w-6" />
          </span>
          <div>
            <h1 class="text-2xl font-bold text-slate-900">PAYROLL</h1>
            <p class="text-sm text-slate-500">
              Gaji, BPJS, PPh 21, jurnal, pembayaran, dan rekonsiliasi dalam satu alur.
            </p>
          </div>
        </div>
      </div>
      <div class="flex gap-2">
        <input v-model="period" type="month" class="rounded-lg border px-3 py-2" @change="load" />
        <AppButton variant="secondary" :disabled="!entries.length" @click="exportPayroll">
          <Download class="h-4 w-4" />
          Ekspor
        </AppButton>
        <AppButton v-if="!run" @click="runModal = true">
          <Plus class="h-4 w-4" />
          Buat Payroll
        </AppButton>
      </div>
    </header>
    <div
      v-if="error"
      class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {{ error }}
    </div>
    <div
      v-if="notice"
      class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
    >
      {{ notice }}
    </div>
    <nav class="flex gap-1 overflow-x-auto rounded-xl border bg-white p-1">
      <button
        v-for="t in tabs"
        :key="t[0]"
        class="rounded-lg px-4 py-2 text-sm font-medium"
        :class="tab === t[0] ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'"
        @click="tab = t[0] as any"
      >
        {{ t[1] }}
        <span
          v-if="t[0] === 'validation' && validation.issues.length"
          class="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800"
        >
          {{ validation.issues.length }}
        </span>
      </button>
    </nav>

    <div v-if="loading" class="rounded-2xl border bg-white p-12 text-center text-slate-500">
      <RefreshCw class="mx-auto mb-2 h-6 w-6 animate-spin" />
      Memuat payroll…
    </div>
    <template v-else>
      <section v-if="tab === 'summary'" class="space-y-5">
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div
            v-for="card in [
              { l: 'Gaji Bruto', v: run?.total_gross ?? 0, i: WalletCards },
              { l: 'Take Home Pay', v: run?.total_take_home_pay ?? 0, i: Landmark },
              { l: 'BPJS Perusahaan', v: run?.total_employer_bpjs ?? 0, i: UsersRound },
              { l: 'PPh 21', v: run?.total_pph21 ?? 0, i: FileText },
            ]"
            :key="card.l"
            class="rounded-2xl border bg-white p-5 shadow-sm"
          >
            <div class="mb-4 flex items-center justify-between text-slate-500">
              <span class="text-sm">{{ card.l }}</span>
              <component :is="card.i" class="h-5 w-5 text-blue-500" />
            </div>
            <p class="text-2xl font-bold">{{ money(card.v) }}</p>
            <p class="mt-1 text-xs text-slate-400">Periode {{ period }}</p>
          </div>
        </div>
        <div class="grid gap-4 lg:grid-cols-3">
          <div class="rounded-2xl border bg-white p-5 lg:col-span-2">
            <div class="mb-5 flex items-center justify-between">
              <h2 class="font-semibold">Status proses</h2>
              <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {{ run ? statusLabel[run.status] : 'Belum dibuat' }}
              </span>
            </div>
            <div class="grid grid-cols-6 gap-2 text-center text-xs">
              <div
                v-for="(s, i) in ['Draft', 'Hitung', 'Setujui', 'Posting', 'Bayar', 'Kunci']"
                :key="s"
              >
                <div
                  class="mx-auto mb-2 grid h-8 w-8 place-items-center rounded-full"
                  :class="
                    run &&
                    ['draft', 'calculated', 'approved', 'posted', 'paid', 'locked'].indexOf(
                      run.status,
                    ) >= i
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-400'
                  "
                >
                  {{ i + 1 }}
                </div>
                {{ s }}
              </div>
            </div>
          </div>
          <div class="rounded-2xl border bg-white p-5">
            <h2 class="font-semibold">Ringkasan pegawai</h2>
            <p class="mt-5 text-3xl font-bold">
              {{ entries.length || data?.employees?.filter((e: any) => e.is_active).length || 0 }}
            </p>
            <p class="text-sm text-slate-500">pegawai dalam payroll</p>
            <p class="mt-4 text-xs text-slate-400">
              Biaya perusahaan {{ money(run?.total_company_cost ?? 0) }}
            </p>
          </div>
        </div>
      </section>

      <section v-if="tab === 'process'" class="space-y-4">
        <div v-if="!run" class="rounded-2xl border bg-white p-12 text-center">
          <Calculator class="mx-auto mb-3 h-10 w-10 text-blue-500" />
          <h2 class="font-semibold">Belum ada payroll {{ period }}</h2>
          <p class="mt-1 text-sm text-slate-500">
            Buat periode untuk menarik seluruh pegawai aktif.
          </p>
          <AppButton class="mt-5" @click="runModal = true">Buat Payroll</AppButton>
        </div>
        <template v-else>
          <div
            class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4"
          >
            <div>
              <p class="font-semibold">
                {{ run.number }}
                <span class="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs">
                  {{ statusLabel[run.status] }}
                </span>
              </p>
              <p class="text-xs text-slate-500">
                {{ run.date_from }} s.d. {{ run.date_to }} · Bayar {{ run.pay_date }}
                <span v-if="run.calculation_version">· Mesin {{ run.calculation_version }}</span>
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <AppButton
                v-if="['draft', 'calculated'].includes(run.status)"
                :disabled="busy"
                @click="
                  task(
                    () => payrollService.action(run.id, 'calculate'),
                    'Perhitungan gaji selesai.',
                  )
                "
              >
                <Calculator class="h-4 w-4" />
                Hitung ulang
              </AppButton>
              <AppButton
                v-if="['calculated', 'approved'].includes(run.status)"
                variant="secondary"
                :disabled="busy"
                @click="reopenModal = true"
              >
                Kembalikan ke Draft
              </AppButton>
              <AppButton
                v-if="run.status === 'calculated'"
                :disabled="busy || validation.blocking > 0"
                :title="validation.blocking ? 'Selesaikan masalah wajib pada tab Validasi' : ''"
                @click="task(() => payrollService.action(run.id, 'approve'), 'Payroll disetujui.')"
              >
                <CheckCircle2 class="h-4 w-4" />
                Setujui
              </AppButton>
              <AppButton
                v-if="run.status === 'approved'"
                :disabled="busy"
                @click="
                  task(() => payrollService.action(run.id, 'post'), 'Jurnal payroll diposting.')
                "
              >
                <FileText class="h-4 w-4" />
                Posting jurnal
              </AppButton>
              <AppButton v-if="run.status === 'posted'" @click="payModal = true">
                <Landmark class="h-4 w-4" />
                Catat pembayaran
              </AppButton>
              <AppButton
                v-if="run.status === 'paid'"
                @click="task(() => payrollService.action(run.id, 'lock'), 'Payroll dikunci.')"
              >
                <LockKeyhole class="h-4 w-4" />
                Kunci
              </AppButton>
            </div>
          </div>
          <div class="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-4">
            <label class="relative min-w-56 flex-1">
              <Search class="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                v-model="processSearch"
                class="field pl-9"
                placeholder="Cari nama atau NIP"
                @input="processPage = 1"
              />
            </label>
            <select v-model="processDepartment" class="field w-auto" @change="processPage = 1">
              <option value="">Semua departemen</option>
              <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
            </select>
            <label class="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <input v-model="exceptionOnly" type="checkbox" @change="processPage = 1" />
              Hanya bermasalah
            </label>
            <select
              v-model.number="pageSize"
              class="field w-auto"
              @change="(processPage = 1), (employeePage = 1)"
            >
              <option :value="25">25/baris</option>
              <option :value="50">50/baris</option>
              <option :value="100">100/baris</option>
            </select>
          </div>
          <div class="overflow-x-auto rounded-2xl border bg-white">
            <table class="min-w-[1400px] w-full text-sm">
              <thead class="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th class="p-3">Pegawai</th>
                  <th>Gaji pokok</th>
                  <th>Tunjangan</th>
                  <th>Variabel</th>
                  <th>Potongan</th>
                  <th>BPJS pegawai</th>
                  <th>PPh 21</th>
                  <th>THP</th>
                  <th>BPJS perusahaan</th>
                  <th>Biaya perusahaan</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="e in pagedEntries"
                  :key="e.id"
                  class="border-t"
                  :class="issueEmployeeIds.has(Number(e.employee_id)) ? 'bg-amber-50/40' : ''"
                >
                  <td class="p-3">
                    <button class="text-left font-semibold text-blue-700" @click="slip = e">
                      {{ e.name }}
                    </button>
                    <p class="text-xs text-slate-400">
                      {{ e.employee_number }} · {{ e.department }}
                    </p>
                  </td>
                  <td>{{ money(e.basic_salary) }}</td>
                  <td>{{ money(Number(e.fixed_allowance) + Number(e.variable_allowance)) }}</td>
                  <td>
                    {{
                      money(Number(e.overtime) + Number(e.bonus) + Number(e.thr) + Number(e.rapel))
                    }}
                  </td>
                  <td class="text-red-600">{{ money(e.operational_deductions) }}</td>
                  <td>{{ money(e.employee_bpjs) }}</td>
                  <td>{{ money(e.pph21) }}</td>
                  <td class="font-bold">{{ money(e.take_home_pay) }}</td>
                  <td>{{ money(e.employer_bpjs) }}</td>
                  <td>{{ money(e.company_cost) }}</td>
                  <td>
                    <button
                      v-if="run.status === 'draft'"
                      class="rounded border px-3 py-1"
                      @click="openEntry(e)"
                    >
                      Ubah
                    </button>
                    <button class="ml-2 rounded border px-3 py-1" @click="slip = e">Slip</button>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="border-t bg-slate-50 font-bold">
                  <td class="p-3">TOTAL</td>
                  <td colspan="4">Bruto {{ money(run.total_gross) }}</td>
                  <td>BPJS {{ money(run.total_employee_bpjs) }}</td>
                  <td>{{ money(run.total_pph21) }}</td>
                  <td>{{ money(run.total_take_home_pay) }}</td>
                  <td>{{ money(run.total_employer_bpjs) }}</td>
                  <td>{{ money(run.total_company_cost) }}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            <div class="flex items-center justify-between border-t p-3 text-sm">
              <span>
                Menampilkan {{ pagedEntries.length }} dari {{ filteredEntries.length }} pegawai
              </span>
              <div class="flex items-center gap-2">
                <button
                  class="rounded border px-3 py-1 disabled:opacity-40"
                  :disabled="processPage <= 1"
                  @click="processPage--"
                >
                  Sebelumnya
                </button>
                <span>{{ processPage }} / {{ processPages }}</span>
                <button
                  class="rounded border px-3 py-1 disabled:opacity-40"
                  :disabled="processPage >= processPages"
                  @click="processPage++"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          </div>
        </template>
      </section>

      <section v-if="tab === 'employees'" class="rounded-2xl border bg-white">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div>
            <h2 class="font-semibold">Master Pegawai</h2>
            <p class="text-sm text-slate-500">Identitas, pajak, rekening, BPJS, dan gaji tetap.</p>
          </div>
          <AppButton @click="employeeModal = true">
            <Plus class="h-4 w-4" />
            Tambah Pegawai
          </AppButton>
        </div>
        <div class="flex flex-wrap gap-3 border-b p-4">
          <label class="relative min-w-56 flex-1">
            <Search class="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              v-model="employeeSearch"
              class="field pl-9"
              placeholder="Cari nama atau NIP"
              @input="employeePage = 1"
            />
          </label>
          <select v-model="employeeDepartment" class="field w-auto" @change="employeePage = 1">
            <option value="">Semua departemen</option>
            <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[900px] text-sm">
            <thead class="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th class="p-3">Pegawai</th>
                <th>Jabatan</th>
                <th>PTKP / TER</th>
                <th>Gaji pokok</th>
                <th>Tunjangan tetap</th>
                <th>Rekening</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in pagedEmployees" :key="e.id" class="border-t">
                <td class="p-3 font-medium">
                  {{ e.name }}
                  <p class="text-xs text-slate-400">{{ e.employee_number }}</p>
                </td>
                <td>
                  {{ e.position }}
                  <p class="text-xs text-slate-400">{{ e.department }}</p>
                </td>
                <td>
                  {{ e.ptkp_status }} / {{ terForPtkp(e.ptkp_status) }}
                  <p
                    v-if="e.ter_category !== terForPtkp(e.ptkp_status)"
                    class="text-xs text-amber-700"
                  >
                    Master tersimpan: {{ e.ter_category }}
                  </p>
                </td>
                <td>{{ money(e.basic_salary) }}</td>
                <td>{{ money(e.fixed_allowance) }}</td>
                <td>{{ e.bank_name }} · {{ e.bank_account_number }}</td>
                <td>
                  <span
                    class="rounded-full px-2 py-1 text-xs"
                    :class="e.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100'"
                  >
                    {{ e.is_active ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="flex items-center justify-between border-t p-3 text-sm">
            <span>{{ filteredEmployees.length }} pegawai ditemukan</span>
            <div class="flex items-center gap-2">
              <button
                class="rounded border px-3 py-1 disabled:opacity-40"
                :disabled="employeePage <= 1"
                @click="employeePage--"
              >
                Sebelumnya
              </button>
              <span>{{ employeePage }} / {{ employeePages }}</span>
              <button
                class="rounded border px-3 py-1 disabled:opacity-40"
                :disabled="employeePage >= employeePages"
                @click="employeePage++"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </div>
      </section>

      <section v-if="tab === 'validation'" class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="rounded-2xl border bg-white p-5">
            <p class="text-sm text-slate-500">Masalah wajib</p>
            <p class="mt-2 text-3xl font-bold text-red-700">{{ validation.blocking }}</p>
          </div>
          <div class="rounded-2xl border bg-white p-5">
            <p class="text-sm text-slate-500">Peringatan</p>
            <p class="mt-2 text-3xl font-bold text-amber-700">{{ validation.warnings }}</p>
          </div>
          <div class="rounded-2xl border bg-white p-5">
            <p class="text-sm text-slate-500">Status persetujuan</p>
            <p
              class="mt-2 font-bold"
              :class="validation.blocking ? 'text-red-700' : 'text-emerald-700'"
            >
              {{ validation.blocking ? 'Belum siap disetujui' : 'Siap diperiksa' }}
            </p>
          </div>
        </div>
        <div class="overflow-hidden rounded-2xl border bg-white">
          <div class="border-b p-4">
            <h2 class="font-semibold">Daftar yang perlu diperiksa</h2>
            <p class="text-sm text-slate-500">
              Masalah wajib harus diselesaikan sebelum persetujuan. Peringatan tetap memerlukan
              penelaahan.
            </p>
          </div>
          <div v-if="!validation.issues.length" class="p-10 text-center text-emerald-700">
            <CheckCircle2 class="mx-auto mb-2 h-8 w-8" />
            Tidak ada masalah yang terdeteksi.
          </div>
          <div v-else class="divide-y">
            <div
              v-for="issue in validation.issues"
              :key="`${issue.code}-${issue.employee_id}`"
              class="flex gap-3 p-4"
            >
              <AlertTriangle
                class="mt-0.5 h-5 w-5 shrink-0"
                :class="issue.severity === 'blocking' ? 'text-red-600' : 'text-amber-600'"
              />
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <b>{{ issue.name }}</b>
                  <span
                    class="rounded-full px-2 py-0.5 text-xs"
                    :class="
                      issue.severity === 'blocking'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-amber-50 text-amber-700'
                    "
                  >
                    {{ issue.severity === 'blocking' ? 'Wajib' : 'Peringatan' }}
                  </span>
                </div>
                <p class="mt-1 text-sm text-slate-600">{{ issue.message }}</p>
                <p v-if="issue.employee_number" class="mt-1 text-xs text-slate-400">
                  {{ issue.employee_number }} · {{ issue.code }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-if="tab === 'reconciliation'" class="space-y-4">
        <div class="rounded-2xl border bg-blue-50 p-5">
          <h2 class="font-semibold text-blue-900">Pusat Rekonsiliasi Payroll</h2>
          <p class="mt-1 text-sm text-blue-700">
            Pastikan hasil payroll sama dengan buku besar, transfer bank, tagihan BPJS, dan bukti
            potong/SPT.
          </p>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <div
            v-for="(x, k) in current?.reconciliation"
            :key="k"
            class="rounded-2xl border bg-white p-5"
          >
            <div class="flex items-center justify-between">
              <p class="font-semibold capitalize">
                {{
                  k === 'ledger'
                    ? 'Payroll vs Buku Besar'
                    : k === 'bank'
                      ? 'THP vs Bank'
                      : k === 'bpjs'
                        ? 'BPJS vs Tagihan'
                        : 'PPh 21 vs SPT'
                }}
              </p>
              <span
                class="rounded-full px-2 py-1 text-xs"
                :class="x.matched ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'"
              >
                {{ x.matched ? 'Tercatat' : 'Perlu diproses' }}
              </span>
            </div>
            <p class="mt-4 text-2xl font-bold">{{ money(x.amount) }}</p>
          </div>
        </div>
        <div class="rounded-xl border bg-white p-4 text-sm text-slate-600">
          PPh 21 otomatis dikirim ke menu
          <b>Perpajakan → Rekonsiliasi & Equalisasi</b>
          setelah jurnal payroll diposting.
        </div>
      </section>

      <section v-if="tab === 'settings'" class="space-y-4">
        <div class="rounded-2xl border bg-white p-5">
          <div class="mb-5 flex items-center gap-2">
            <Settings2 class="h-5 w-5 text-blue-600" />
            <div>
              <h2 class="font-semibold">Tarif dan batas BPJS</h2>
              <p class="text-sm text-slate-500">
                Tarif ditampilkan dalam persen. Berlaku mulai tanggal efektif dan tidak mengubah
                hasil payroll lama.
              </p>
            </div>
          </div>
          <div class="grid gap-4 md:grid-cols-3">
            <label class="text-sm">
              Tanggal efektif
              <input
                v-model="policy.effective_from"
                type="date"
                class="mt-1 w-full rounded-lg border p-2"
              />
            </label>
            <label
              v-for="f in [
                ['health_employee_rate', 'Kesehatan pegawai'],
                ['health_employer_rate', 'Kesehatan perusahaan'],
                ['jht_employee_rate', 'JHT pegawai'],
                ['jht_employer_rate', 'JHT perusahaan'],
                ['jp_employee_rate', 'JP pegawai'],
                ['jp_employer_rate', 'JP perusahaan'],
                ['jkk_employer_rate', 'JKK perusahaan'],
                ['jkm_employer_rate', 'JKM perusahaan'],
              ]"
              :key="f[0]"
              class="text-sm"
            >
              {{ f[1] }} (%)
              <span class="relative mt-1 block">
                <input
                  v-model.number="percentRates[f[0]]"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  class="w-full rounded-lg border p-2 pr-9"
                />
                <span class="pointer-events-none absolute right-3 top-2 text-slate-500">%</span>
              </span>
            </label>
            <label class="text-sm">
              Batas minimum upah Kesehatan
              <input
                v-model="policy.health_wage_floor"
                type="number"
                min="0"
                class="mt-1 w-full rounded-lg border p-2"
              />
              <span class="mt-1 block text-xs text-slate-400">
                Isi sesuai UMP/UMK yang digunakan perusahaan.
              </span>
            </label>
            <label class="text-sm">
              Batas maksimum upah Kesehatan
              <input
                v-model="policy.health_wage_cap"
                type="number"
                class="mt-1 w-full rounded-lg border p-2"
              />
            </label>
            <label class="text-sm">
              Batas upah JP
              <input
                v-model="policy.jp_wage_cap"
                type="number"
                class="mt-1 w-full rounded-lg border p-2"
              />
            </label>
            <label class="text-sm md:col-span-2">
              Sumber kebijakan
              <input
                v-model="policy.source_reference"
                required
                class="mt-1 w-full rounded-lg border p-2"
                placeholder="Nomor peraturan, surat BPJS, atau URL resmi"
              />
              <span class="mt-1 block text-xs text-slate-400">
                Wajib diisi agar asal tarif dapat diaudit.
              </span>
            </label>
            <label class="text-sm">
              Catatan kebijakan
              <textarea
                v-model="policy.policy_notes"
                class="mt-1 w-full rounded-lg border p-2"
                maxlength="1000"
              ></textarea>
            </label>
          </div>
        </div>
        <div class="rounded-2xl border bg-white p-5">
          <h2 class="mb-4 font-semibold">Pemetaan akun jurnal</h2>
          <div class="grid gap-4 md:grid-cols-2">
            <label
              v-for="f in [
                ['salary_expense_account_id', 'Beban gaji', 'expense'],
                ['employer_bpjs_expense_account_id', 'Beban BPJS perusahaan', 'expense'],
                ['payroll_payable_account_id', 'Utang gaji', 'liability'],
                ['bpjs_payable_account_id', 'Utang BPJS', 'liability'],
                ['pph21_payable_account_id', 'Utang PPh 21', 'liability'],
                ['employee_loan_account_id', 'Piutang pegawai', 'asset'],
                ['other_deduction_account_id', 'Utang potongan lain', 'liability'],
              ]"
              :key="f[0]"
              class="text-sm"
            >
              {{ f[1] }}
              <select v-model="policy[f[0]]" class="mt-1 w-full rounded-lg border p-2">
                <option value="">Pilih akun</option>
                <option v-for="a in accountOptions(f[2] as any)" :key="a.id" :value="a.id">
                  {{ a.code }} · {{ a.name }}
                </option>
              </select>
            </label>
          </div>
          <div class="mt-5 flex justify-end">
            <AppButton :disabled="busy" @click="savePolicy">Simpan Pengaturan</AppButton>
          </div>
        </div>
      </section>
    </template>

    <AppModal :open="runModal" title="Buat Periode Payroll" @close="runModal = false">
      <form class="space-y-4" @submit.prevent="createRun">
        <label class="block text-sm">
          Periode
          <input
            v-model="runForm.period"
            type="month"
            class="mt-1 w-full rounded-lg border p-2"
            required
          />
        </label>
        <label class="block text-sm">
          Tanggal pembayaran
          <input
            v-model="runForm.pay_date"
            type="date"
            class="mt-1 w-full rounded-lg border p-2"
            required
          />
        </label>
        <label class="block text-sm">
          Catatan
          <textarea v-model="runForm.notes" class="mt-1 w-full rounded-lg border p-2"></textarea>
        </label>
        <div class="flex justify-end gap-2">
          <AppButton variant="secondary" type="button" @click="runModal = false">Batal</AppButton>
          <AppButton type="submit">Buat Payroll</AppButton>
        </div>
      </form>
    </AppModal>
    <AppModal :open="employeeModal" title="Tambah Pegawai" size="xl" @close="employeeModal = false">
      <form class="grid gap-3 md:grid-cols-2" @submit.prevent="createEmployee">
        <label
          v-for="f in [
            ['employee_number', 'Nomor pegawai'],
            ['name', 'Nama'],
            ['nik', 'NIK 16 digit'],
            ['npwp', 'NPWP 16 digit'],
            ['email', 'Email'],
            ['department', 'Departemen'],
            ['position', 'Jabatan'],
            ['bank_name', 'Bank'],
            ['bank_account_number', 'Nomor rekening'],
            ['bpjs_health_number', 'Nomor BPJS Kesehatan'],
            ['bpjs_employment_number', 'Nomor BPJS Ketenagakerjaan'],
          ]"
          :key="f[0]"
          class="text-sm"
        >
          {{ f[1] }}
          <input
            v-model="employeeForm[f[0]]"
            class="mt-1 w-full rounded-lg border p-2"
            :required="['employee_number', 'name'].includes(f[0])"
          />
        </label>
        <label class="text-sm">
          Tanggal masuk
          <input
            v-model="employeeForm.hire_date"
            type="date"
            class="mt-1 w-full rounded-lg border p-2"
            required
          />
        </label>
        <label class="text-sm">
          Status PTKP
          <select v-model="employeeForm.ptkp_status" class="mt-1 w-full rounded-lg border p-2">
            <option
              v-for="value in ['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3']"
              :key="value"
            >
              {{ value }}
            </option>
          </select>
        </label>
        <label class="text-sm">
          Kategori TER otomatis
          <input
            :value="terForPtkp(employeeForm.ptkp_status)"
            class="mt-1 w-full rounded-lg border bg-slate-50 p-2"
            readonly
          />
          <span class="mt-1 block text-xs text-slate-400">
            Ditentukan otomatis dari status PTKP.
          </span>
        </label>
        <label class="text-sm">
          Gaji pokok
          <input
            v-model="employeeForm.basic_salary"
            type="number"
            class="mt-1 w-full rounded-lg border p-2"
          />
        </label>
        <label class="text-sm">
          Tunjangan tetap
          <input
            v-model="employeeForm.fixed_allowance"
            type="number"
            class="mt-1 w-full rounded-lg border p-2"
          />
        </label>
        <div class="flex justify-end gap-2 md:col-span-2">
          <AppButton variant="secondary" type="button" @click="employeeModal = false">
            Batal
          </AppButton>
          <AppButton type="submit">Simpan Pegawai</AppButton>
        </div>
      </form>
    </AppModal>
    <AppModal
      :open="!!editEntry"
      title="Komponen Gaji Variabel"
      size="lg"
      @close="editEntry = null"
    >
      <form class="grid gap-3 md:grid-cols-2" @submit.prevent="saveEntry">
        <label
          v-for="f in [
            ['variable_allowance', 'Tunjangan variabel'],
            ['overtime', 'Lembur / insentif'],
            ['bonus', 'Bonus'],
            ['thr', 'THR'],
            ['rapel', 'Rapel'],
            ['reimbursement', 'Reimbursement'],
            ['absence_deduction', 'Potongan absensi'],
            ['loan_deduction', 'Potongan pinjaman'],
            ['other_deduction', 'Potongan lain'],
            ['pph21_override', 'Koreksi PPh 21 (opsional)'],
          ]"
          :key="f[0]"
          class="text-sm"
        >
          {{ f[1] }}
          <input
            v-model="entryForm[f[0]]"
            type="number"
            min="0"
            class="mt-1 w-full rounded-lg border p-2"
          />
        </label>
        <label
          v-if="entryForm.pph21_override !== null && entryForm.pph21_override !== ''"
          class="text-sm md:col-span-2"
        >
          Alasan koreksi PPh 21
          <textarea
            v-model="entryForm.pph21_override_reason"
            required
            minlength="5"
            maxlength="500"
            class="mt-1 w-full rounded-lg border p-2"
            placeholder="Jelaskan dasar koreksi dan dokumen pendukung"
          ></textarea>
        </label>
        <div class="flex justify-end gap-2 md:col-span-2">
          <AppButton variant="secondary" type="button" @click="editEntry = null">Batal</AppButton>
          <AppButton type="submit">Simpan</AppButton>
        </div>
      </form>
    </AppModal>
    <AppModal :open="!!slip" title="Slip Gaji" size="lg" @close="slip = null">
      <div v-if="slip" class="space-y-4">
        <div class="border-b pb-4">
          <h3 class="text-xl font-bold">{{ slip.name }}</h3>
          <p class="text-sm text-slate-500">
            {{ slip.employee_number }} · {{ slip.position }} · {{ period }}
          </p>
        </div>
        <div class="grid gap-5 md:grid-cols-2">
          <div>
            <h4 class="mb-2 font-semibold">Penghasilan</h4>
            <p>
              Gaji pokok
              <b class="float-right">{{ money(slip.basic_salary) }}</b>
            </p>
            <p>
              Tunjangan tetap
              <b class="float-right">{{ money(slip.fixed_allowance) }}</b>
            </p>
            <p>
              Tunjangan/bonus lainnya
              <b class="float-right">
                {{
                  money(
                    Number(slip.variable_allowance) +
                      Number(slip.overtime) +
                      Number(slip.bonus) +
                      Number(slip.thr) +
                      Number(slip.rapel) +
                      Number(slip.reimbursement),
                  )
                }}
              </b>
            </p>
            <p class="mt-2 border-t pt-2 font-bold">
              Bruto
              <span class="float-right">{{ money(slip.gross_earnings) }}</span>
            </p>
          </div>
          <div>
            <h4 class="mb-2 font-semibold">Pengurang</h4>
            <p>
              Potongan operasional
              <b class="float-right">{{ money(slip.operational_deductions) }}</b>
            </p>
            <p>
              BPJS pegawai
              <b class="float-right">{{ money(slip.employee_bpjs) }}</b>
            </p>
            <p>
              PPh 21
              <b class="float-right">{{ money(slip.pph21) }}</b>
            </p>
            <p class="mt-2 border-t pt-2 font-bold text-blue-700">
              Take Home Pay
              <span class="float-right">{{ money(slip.take_home_pay) }}</span>
            </p>
          </div>
        </div>
        <div class="rounded-xl bg-slate-50 p-4 text-sm">
          <p class="font-semibold">Ditanggung perusahaan (informasi)</p>
          <p>
            BPJS Kesehatan, JHT, JP, JKK, dan JKM
            <b class="float-right">{{ money(slip.employer_bpjs) }}</b>
          </p>
          <p class="mt-2 border-t pt-2">
            Total biaya perusahaan
            <b class="float-right">{{ money(slip.company_cost) }}</b>
          </p>
        </div>
        <p class="text-xs text-slate-500">{{ slip.calculation_note }}</p>
      </div>
    </AppModal>
    <AppModal :open="payModal" title="Catat Pembayaran Payroll" @close="payModal = false">
      <form
        class="space-y-4"
        @submit.prevent="
          task(
            () =>
              payrollService.pay(run.id, {
                payment_account_id: Number(payment.payment_account_id),
                payment_date: payment.payment_date,
              }),
            'Pembayaran payroll dicatat.',
          ).then(() => (payModal = false))
        "
      >
        <label class="block text-sm">
          Akun bank
          <select
            v-model="payment.payment_account_id"
            class="mt-1 w-full rounded-lg border p-2"
            required
          >
            <option value="">Pilih rekening</option>
            <option v-for="a in assetAccounts" :key="a.id" :value="a.id">
              {{ a.code }} · {{ a.name }}
            </option>
          </select>
        </label>
        <label class="block text-sm">
          Tanggal pembayaran
          <input
            v-model="payment.payment_date"
            type="date"
            class="mt-1 w-full rounded-lg border p-2"
            required
          />
        </label>
        <p class="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
          Total transfer:
          <b>{{ money(run?.total_take_home_pay) }}</b>
        </p>
        <div class="flex justify-end gap-2">
          <AppButton variant="secondary" type="button" @click="payModal = false">Batal</AppButton>
          <AppButton type="submit">Posting Pembayaran</AppButton>
        </div>
      </form>
    </AppModal>
    <AppModal :open="reopenModal" title="Kembalikan Payroll ke Draft" @close="reopenModal = false">
      <form class="space-y-4" @submit.prevent="reopenRun">
        <p class="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Hasil perhitungan dapat diubah dan dihitung ulang. Tindakan serta alasannya akan dicatat
          pada audit log.
        </p>
        <label class="block text-sm">
          Alasan koreksi
          <textarea
            v-model="reopenReason"
            required
            minlength="10"
            maxlength="500"
            class="mt-1 min-h-24 w-full rounded-lg border p-2"
            placeholder="Jelaskan kesalahan atau data yang harus diperbaiki"
          ></textarea>
        </label>
        <div class="flex justify-end gap-2">
          <AppButton variant="secondary" type="button" @click="reopenModal = false">
            Batal
          </AppButton>
          <AppButton type="submit" :disabled="busy">Kembalikan ke Draft</AppButton>
        </div>
      </form>
    </AppModal>
  </div>
</template>

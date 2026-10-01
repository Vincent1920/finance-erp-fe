<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api from '@/services/api/client'
import { accountService } from '@/services/account.service'
import { bankAccountService } from '@/services/bank-account.service'
import AppButton from './AppButton.vue'
import AppSelect from './AppSelect.vue'
import AppModal from './AppModal.vue'
import AppNumberInput from './AppNumberInput.vue'
import { useAuthStore } from '@/stores/auth.store'
import { getApiErrorMessage } from '@/utils/error'
const props = defineProps<{
  invoiceId: number
  sales: boolean
  status: string
  currency: string
  outstanding: string | number
  partyId: number
}>()
const emit = defineEmits<{ saved: [] }>(),
  auth = useAuthStore()
const prefix = computed(() => (props.sales ? 'customer-payments' : 'supplier-payments'))
const endpoint = computed(() => `/operations/${props.sales ? 'receivable' : 'payable'}-settlements`)
const canView = computed(() => auth.hasPermission(`${prefix.value}.view`)),
  canPost = computed(
    () =>
      auth.hasPermission(`${prefix.value}.create`) && auth.hasPermission(`${prefix.value}.post`),
  )
const rows = ref<
  Array<{
    id: number
    payment_number: string
    payment_date: string
    allocated_amount: string | number
    status: string
  }>
>([])
const credits = ref<Array<{ id: number; credit_number: string; credit_date: string; remaining_amount: string | number; status: string }>>([])
const accounts = ref<{ value: number; label: string }[]>([]),
  banks = ref<Array<{ id: number; gl_account_id: number; label: string }>>([])
const open = ref(false),
  busy = ref(false),
  error = ref(''),
  amount = ref(0),
  date = ref(new Date().toISOString().slice(0, 10)),
  account = ref<number | null>(null),
  bank = ref<number | null>(null),
  reference = ref(''),
  key = ref('')
const creditOpen = ref(false), selectedCredit = ref<number | null>(null), creditAmount = ref(0)
const money = (v: string | number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: props.currency }).format(Number(v))
async function load() {
  if (!canView.value) return
  try {
    const [payments, balances] = await Promise.all([
      api.get(endpoint.value, { params: { invoice_id: props.invoiceId } }),
      api.get(`/operations/${props.sales ? 'customer' : 'supplier'}-credits`, { params: { party_id: props.partyId } }),
    ])
    rows.value = payments.data.data
    credits.value = balances.data.data
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Riwayat pelunasan gagal dimuat.')
  }
}
async function reversePayment(row: { id: number }) {
  const reason = window.prompt('Alasan pembalikan pelunasan:')?.trim()
  if (!reason) return
  busy.value = true
  try {
    await api.post(`${endpoint.value}/${row.id}/reverse`, { request_key: crypto.randomUUID(), date: date.value, reason })
    emit('saved')
    await load()
  } catch (e) { error.value = getApiErrorMessage(e, 'Pembalikan pelunasan gagal.') } finally { busy.value = false }
}
async function deletePayment(row: { id: number; payment_number: string }) {
  if (!window.confirm(`Hapus ${row.payment_number} dari daftar pelunasan? Jejak jurnal dan audit tetap disimpan.`)) return
  busy.value = true
  try {
    await api.delete(`${endpoint.value}/${row.id}`)
    await load()
  } catch (e) { error.value = getApiErrorMessage(e, 'Pelunasan gagal dihapus.') } finally { busy.value = false }
}
async function applyCredit(credit: { id: number; remaining_amount: string | number }) {
  const suggested = Math.min(Number(credit.remaining_amount), Number(props.outstanding))
  const entered = window.prompt('Jumlah saldo kredit yang digunakan:', String(suggested))
  if (!entered || Number(entered) <= 0) return
  busy.value = true
  try {
    await api.post(`/operations/${props.sales ? 'customer' : 'supplier'}-credits/apply`, { request_key: crypto.randomUUID(), date: date.value, reference: '', credit_id: credit.id, invoice_id: props.invoiceId, amount: Number(entered) })
    emit('saved')
    await load()
  } catch (e) { error.value = getApiErrorMessage(e, 'Saldo kredit gagal digunakan.') } finally { busy.value = false }
}
async function showRefund(credit: { id: number; remaining_amount: string | number }) {
  selectedCredit.value = credit.id
  creditAmount.value = Number(credit.remaining_amount)
  await show()
  open.value = false
  creditOpen.value = true
}
async function refundCredit() {
  if (!selectedCredit.value || !account.value || creditAmount.value <= 0) return
  busy.value = true
  try {
    await api.post(`/operations/${props.sales ? 'customer' : 'supplier'}-credits/refund`, { request_key: crypto.randomUUID(), date: date.value, reference: reference.value, credit_id: selectedCredit.value, cash_account_id: account.value, bank_account_id: bank.value ?? undefined, amount: creditAmount.value })
    creditOpen.value = false
    emit('saved')
    await load()
  } catch (e) { error.value = getApiErrorMessage(e, 'Refund saldo kredit gagal.') } finally { busy.value = false }
}
async function show() {
  error.value = ''
  amount.value = Number(props.outstanding)
  key.value = crypto.randomUUID()
  open.value = true
  try {
    const [a, b] = await Promise.all([
      accountService.all({ limit: 200, is_posting: true, is_active: true }),
      bankAccountService.all({ limit: 200, is_active: true }),
    ])
    accounts.value = a.data.map((r) => ({ value: r.id, label: `${r.code} — ${r.name}` }))
    banks.value = b.data
      .filter((r) => r.currency === props.currency)
      .map((r) => ({
        id: r.id,
        gl_account_id: Number(r.gl_account_id),
        label: `${r.bank_name} — ${r.account_number}`,
      }))
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Pilihan akun gagal dimuat.')
  }
}
async function save() {
  if (!account.value || amount.value <= 0) return
  busy.value = true
  error.value = ''
  try {
    await api.post(endpoint.value, {
      request_key: key.value,
      invoice_id: props.invoiceId,
      date: date.value,
      amount: amount.value,
      cash_account_id: account.value,
      bank_account_id: bank.value ?? undefined,
      reference: reference.value,
    })
    open.value = false
    emit('saved')
    await load()
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Pelunasan gagal.')
  } finally {
    busy.value = false
  }
}
onMounted(load)
</script>
<template>
  <section v-if="canView || canPost" class="panel mt-5 p-5 print:hidden">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="font-bold">Riwayat Pelunasan</h2>
      <AppButton v-if="canPost && ['posted', 'partially_paid'].includes(status)" @click="show">
        Tambah pelunasan
      </AppButton>
    </div>
    <p v-if="error && !open" class="text-red-600">{{ error }}</p>
    <table class="w-full text-left text-sm">
      <thead>
        <tr>
          <th class="p-2">Nomor</th>
          <th class="p-2">Tanggal</th>
          <th class="p-2">Status</th>
          <th class="p-2 text-right">Jumlah</th>
          <th class="p-2">Aksi</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.id" class="border-t">
          <td class="p-2">{{ r.payment_number }}</td>
          <td class="p-2">{{ String(r.payment_date).slice(0, 10) }}</td>
          <td class="p-2">{{ r.status }}</td>
          <td class="p-2 text-right">{{ money(r.allocated_amount) }}</td>
          <td class="p-2">
            <div class="flex gap-2">
              <AppButton v-if="r.status === 'posted' && auth.hasPermission(`${prefix}.reverse`)" variant="secondary" :disabled="busy" @click="reversePayment(r)">Balikkan</AppButton>
              <AppButton v-if="r.status !== 'posted' && auth.hasPermission(`${prefix}.delete`)" variant="danger" :disabled="busy" @click="deletePayment(r)">Hapus</AppButton>
            </div>
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td colspan="5" class="p-4 text-slate-500">Belum ada pelunasan.</td>
        </tr>
      </tbody>
    </table>
    <div v-if="credits.some((credit) => Number(credit.remaining_amount) > 0)" class="mt-5 border-t pt-4">
      <h3 class="mb-2 font-semibold">Saldo kredit yang tersedia</h3>
      <div v-for="credit in credits.filter((item) => Number(item.remaining_amount) > 0)" :key="credit.id" class="mb-2 flex flex-wrap items-center justify-between gap-2 rounded bg-emerald-50 p-3 text-sm">
        <span>{{ credit.credit_number }} · {{ String(credit.credit_date).slice(0, 10) }} · <b>{{ money(credit.remaining_amount) }}</b></span>
        <span class="flex gap-2">
          <AppButton v-if="Number(outstanding) > 0" :disabled="busy" @click="applyCredit(credit)">Gunakan untuk invoice</AppButton>
          <AppButton variant="secondary" :disabled="busy" @click="showRefund(credit)">Refund</AppButton>
        </span>
      </div>
    </div>
    <AppModal :open="open" title="Catat pelunasan" :close-disabled="busy" @close="open = false">
      <form id="settlement-form" class="space-y-4" @submit.prevent="save">
        <p class="rounded bg-blue-50 p-3 text-sm">
          Sisa invoice {{ money(outstanding) }}. Anda dapat mencatat beberapa pelunasan. Simpan akan
          membuat jurnal otomatis.
        </p>
        <p v-if="error" role="alert" class="text-red-600">{{ error }}</p>
        <label class="block text-sm">
          Tanggal
          <input v-model="date" class="field" type="date" required />
        </label>
        <AppSelect
          :model-value="bank"
          label="Rekening bank (opsional)"
          :options="banks.map((b) => ({ value: b.id, label: b.label }))"
          value-type="number"
          empty-label="Kas / akun lain"
          @update:model-value="
            ($event) => {
              bank = $event === null ? null : Number($event)
              account = banks.find((b) => b.id === bank)?.gl_account_id ?? null
            }
          "
        />
        <AppSelect
          :model-value="account"
          label="Akun kas/bank"
          :options="accounts"
          value-type="number"
          required
          :disabled="!!bank"
          @update:model-value="account = Number($event)"
        />
        <label class="block text-sm">
          Jumlah ({{ currency }})
          <AppNumberInput v-model="amount" :min="0.01" :max="Number(outstanding)" :decimals="2" required />
        </label>
        <label class="block text-sm">
          Referensi
          <input v-model="reference" class="field" maxlength="100" />
        </label>
      </form>
      <template #footer>
        <AppButton type="submit" form="settlement-form" :loading="busy">
          Simpan &amp; posting
        </AppButton>
      </template>
    </AppModal>
    <AppModal :open="creditOpen" title="Refund saldo kredit" :close-disabled="busy" @close="creditOpen = false">
      <form id="credit-refund-form" class="space-y-4" @submit.prevent="refundCredit">
        <p v-if="error" class="text-red-600">{{ error }}</p>
        <label class="block text-sm">Tanggal<input v-model="date" class="field" type="date" required /></label>
        <AppSelect :model-value="bank" label="Rekening bank (opsional)" :options="banks.map((b) => ({ value: b.id, label: b.label }))" value-type="number" empty-label="Kas / akun lain" @update:model-value="($event) => { bank = $event === null ? null : Number($event); account = banks.find((b) => b.id === bank)?.gl_account_id ?? null }" />
        <AppSelect :model-value="account" label="Akun kas/bank" :options="accounts" value-type="number" required :disabled="!!bank" @update:model-value="account = Number($event)" />
        <label class="block text-sm">Jumlah<AppNumberInput v-model="creditAmount" :min="0.01" :decimals="2" required /></label>
        <label class="block text-sm">Referensi<input v-model="reference" class="field" maxlength="100" /></label>
      </form>
      <template #footer><AppButton type="submit" form="credit-refund-form" :loading="busy">Refund &amp; posting</AppButton></template>
    </AppModal>
  </section>
</template>

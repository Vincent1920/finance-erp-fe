<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import { accountService } from '@/services/account.service'
import { journalService } from '@/services/journal.service'
import type { AccountRecord } from '@/types/master'
import { getApiErrorMessage } from '@/utils/error'

const route = useRoute(),
  router = useRouter()
const id = computed(() => Number(route.params.id) || null)
const accounts = ref<AccountRecord[]>([]),
  saving = ref(false),
  error = ref('')
const form = reactive({
  journal_date: new Date().toISOString().slice(0, 10),
  reference: '',
  description: '',
  currency: 'IDR',
  exchange_rate: '1',
  lines: [
    { accountId: 0, description: '', debit: '0', credit: '0' },
    { accountId: 0, description: '', debit: '0', credit: '0' },
  ],
})
const debit = computed(() => form.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0))
const credit = computed(() => form.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0))
const balanced = computed(() => debit.value > 0 && Math.abs(debit.value - credit.value) < 0.005)
const addLine = () => form.lines.push({ accountId: 0, description: '', debit: '0', credit: '0' })
const removeLine = (index: number) => {
  if (form.lines.length > 2) form.lines.splice(index, 1)
}
const load = async () => {
  accounts.value = (
    await accountService.list({
      limit: 500,
      is_active: true,
      is_posting: true,
      allow_manual_journal: true,
    })
  ).data
  if (!id.value) return
  const journal = await journalService.get(id.value)
  Object.assign(form, {
    journal_date: String(journal.journal_date).slice(0, 10),
    reference: journal.reference || '',
    description: journal.description,
    currency: journal.currency,
    exchange_rate: String(journal.exchange_rate),
    lines:
      journal.lines?.map((line) => ({
        accountId: line.account_id,
        description: line.description || '',
        debit: String(line.debit),
        credit: String(line.credit),
      })) || form.lines,
  })
}
const save = async () => {
  if (!balanced.value) {
    error.value = 'Total debit dan kredit harus sama dan lebih dari nol.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const payload = { ...form, reference: form.reference || null }
    const result = id.value
      ? await journalService.update(id.value, payload)
      : await journalService.create(payload)
    await router.push(`/accounting/journals/${id.value || result.id}`)
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Jurnal gagal disimpan.')
  } finally {
    saving.value = false
  }
}
onMounted(
  () =>
    void load().catch((cause) => {
      error.value = getApiErrorMessage(cause, 'Data form gagal dimuat.')
    }),
)
</script>

<template>
  <div>
    <AppBreadcrumb />
    <h1 class="mb-5 text-2xl font-bold">{{ id ? 'Edit' : 'Buat' }} Jurnal Umum</h1>
    <form class="space-y-5" @submit.prevent="save">
      <section class="panel grid gap-4 p-5 md:grid-cols-4">
        <label class="text-sm">
          Tanggal
          <input v-model="form.journal_date" type="date" class="field mt-1" required />
        </label>
        <label class="text-sm">
          Referensi
          <input v-model="form.reference" class="field mt-1" />
        </label>
        <label class="text-sm">
          Mata Uang
          <input v-model="form.currency" class="field mt-1" maxlength="3" required />
        </label>
        <label class="text-sm">
          Kurs
          <input
            v-model="form.exchange_rate"
            type="number"
            min="0.00000001"
            step="0.00000001"
            class="field mt-1"
            required
          />
        </label>
        <label class="text-sm md:col-span-4">
          Deskripsi
          <textarea v-model="form.description" class="field mt-1" rows="2" required />
        </label>
      </section>
      <section class="panel overflow-hidden">
        <div class="flex items-center justify-between border-b p-4">
          <h2 class="font-semibold">Baris Jurnal</h2>
          <AppButton variant="secondary" @click="addLine">Tambah Baris</AppButton>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-slate-50 text-left">
                <th class="p-3">Akun</th>
                <th class="p-3">Keterangan</th>
                <th class="p-3">Debit</th>
                <th class="p-3">Kredit</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, index) in form.lines" :key="index" class="border-t">
                <td class="p-2">
                  <select v-model.number="line.accountId" class="field min-w-64" required>
                    <option :value="0" disabled>Pilih akun</option>
                    <option v-for="account in accounts" :key="account.id" :value="account.id">
                      {{ account.code }} — {{ account.name }}
                    </option>
                  </select>
                </td>
                <td class="p-2"><input v-model="line.description" class="field" /></td>
                <td class="p-2">
                  <input
                    v-model="line.debit"
                    class="field text-right"
                    type="number"
                    min="0"
                    step="0.01"
                  />
                </td>
                <td class="p-2">
                  <input
                    v-model="line.credit"
                    class="field text-right"
                    type="number"
                    min="0"
                    step="0.01"
                  />
                </td>
                <td class="p-2">
                  <button type="button" class="text-red-600" @click="removeLine(index)">
                    Hapus
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="border-t font-semibold">
                <td colspan="2" class="p-3 text-right">Total</td>
                <td class="p-3 text-right">{{ debit.toLocaleString('id-ID') }}</td>
                <td class="p-3 text-right">{{ credit.toLocaleString('id-ID') }}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
      <p v-if="error" class="rounded bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
      <div class="flex justify-end gap-3">
        <AppButton variant="secondary" @click="router.back()">Batal</AppButton>
        <AppButton type="submit" :loading="saving" :disabled="!balanced">Simpan Jurnal</AppButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import { journalService } from '@/services/journal.service'
import type { Journal } from '@/types/accounting'
import { getApiErrorMessage } from '@/utils/error'

const id = Number(useRoute().params.id),
  router = useRouter()
const journal = ref<Journal | null>(null),
  loading = ref(false),
  error = ref('')
const money = (value: string | number) => new Intl.NumberFormat('id-ID').format(Number(value))
const load = async () => {
  try {
    journal.value = await journalService.get(id)
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Jurnal gagal dimuat.')
  }
}
const act = async (action: 'submit' | 'approve' | 'reject' | 'post' | 'reverse') => {
  loading.value = true
  error.value = ''
  try {
    if (action === 'reject') {
      const comments = window.prompt('Alasan penolakan')
      if (!comments) return
      await journalService.reject(id, comments)
    } else if (action === 'reverse') {
      const reason = window.prompt('Alasan reversal')
      if (!reason) return
      await journalService.reverse(id, new Date().toISOString().slice(0, 10), reason)
    } else await journalService[action](id)
    await load()
  } catch (cause) {
    error.value = getApiErrorMessage(cause, `Aksi ${action} gagal.`)
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<template>
  <div>
    <AppBreadcrumb />
    <p v-if="error" class="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
    <template v-if="journal">
      <header class="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold">{{ journal.journal_number }}</h1>
          <p class="text-sm text-slate-500">
            {{ String(journal.journal_date).slice(0, 10) }} · {{ journal.description }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <AppButton
            v-if="journal.status === 'draft' && !journal.source_type"
            variant="secondary"
            @click="router.push(`/accounting/journals/${id}/edit`)"
          >
            Edit
          </AppButton>
          <AppButton
            v-if="['draft', 'rejected'].includes(journal.status) && !journal.source_type"
            :loading="loading"
            @click="act('submit')"
          >
            Ajukan
          </AppButton>
          <AppButton
            v-if="journal.status === 'pending_approval'"
            variant="secondary"
            @click="act('reject')"
          >
            Tolak
          </AppButton>
          <AppButton v-if="journal.status === 'pending_approval'" @click="act('approve')">
            Setujui
          </AppButton>
          <AppButton v-if="journal.status === 'approved'" @click="act('post')">Post</AppButton>
          <AppButton
            v-if="journal.status === 'posted' && !journal.source_type"
            variant="danger"
            @click="act('reverse')"
          >
            Reverse
          </AppButton>
        </div>
      </header>
      <section class="panel p-5">
        <div class="mb-5 grid gap-4 md:grid-cols-4">
          <div>
            <small>Status</small>
            <div>
              <AppBadge tone="blue">{{ journal.status }}</AppBadge>
            </div>
          </div>
          <div>
            <small>Referensi</small>
            <p>{{ journal.reference || '-' }}</p>
          </div>
          <div>
            <small>Sumber</small>
            <p>{{ journal.source_type || 'Manual' }}</p>
          </div>
          <div>
            <small>Mata uang</small>
            <p>{{ journal.currency }} · {{ journal.exchange_rate }}</p>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b bg-slate-50 text-left">
                <th class="p-3">Akun</th>
                <th class="p-3">Keterangan</th>
                <th class="p-3 text-right">Debit</th>
                <th class="p-3 text-right">Kredit</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in journal.lines" :key="line.id" class="border-b">
                <td class="p-3">{{ line.account_code }} — {{ line.account_name }}</td>
                <td class="p-3">{{ line.description || '-' }}</td>
                <td class="p-3 text-right">{{ money(line.debit) }}</td>
                <td class="p-3 text-right">{{ money(line.credit) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="font-semibold">
                <td colspan="2" class="p-3 text-right">Total</td>
                <td class="p-3 text-right">{{ money(journal.total_debit) }}</td>
                <td class="p-3 text-right">{{ money(journal.total_credit) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

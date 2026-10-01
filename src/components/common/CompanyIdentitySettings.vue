<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import AppButton from './AppButton.vue'
import { settingsService, type CompanyProfile } from '@/services/settings.service'
import { useNotificationStore } from '@/stores/notification.store'
import { getApiErrorMessage } from '@/utils/error'

const emptyProfile: Omit<CompanyProfile, 'id'> = {
  name: '', legal_name: '', tax_number: '', address: '', phone: '', email: '', logo: '',
  base_currency: 'IDR', fiscal_year_start: 1,
}
const form = reactive({ ...emptyProfile }), busy = ref(false), error = ref('')
const notify = useNotificationStore()

async function load() {
  error.value = ''
  try { Object.assign(form, emptyProfile, await settingsService.company()) }
  catch (e) { error.value = getApiErrorMessage(e, 'Identitas perusahaan gagal dimuat.') }
}
async function chooseLogo(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    error.value = 'Logo harus berupa PNG, JPG, atau WebP.'; return
  }
  if (file.size > 500_000) { error.value = 'Ukuran logo maksimal 500 KB.'; return }
  form.logo = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file)
  })
}
async function save() {
  if (!/^\d{16}$/.test(String(form.tax_number ?? ''))) {
    error.value = 'NPWP wajib tepat 16 digit angka.'; return
  }
  busy.value = true; error.value = ''
  try {
    Object.assign(form, await settingsService.updateCompany({ ...form }))
    notify.push('Identitas perusahaan tersimpan dan akan digunakan pada dokumen cetak.')
  } catch (e) { error.value = getApiErrorMessage(e, 'Identitas perusahaan gagal disimpan.') }
  finally { busy.value = false }
}
onMounted(load)
</script>

<template>
  <section class="panel mb-5 p-5">
    <div class="mb-5">
      <h2 class="text-lg font-bold">Identitas Perusahaan</h2>
      <p class="mt-1 text-sm text-slate-500">Menjadi sumber identitas resmi untuk invoice, order pembelian, dan dokumen cetak lain.</p>
    </div>
    <form class="grid gap-4 lg:grid-cols-[1fr_1fr_240px]" @submit.prevent="save">
      <p v-if="error" class="rounded-lg bg-red-50 p-3 text-sm text-red-700 lg:col-span-3">{{ error }}</p>
      <label>Nama singkat<input v-model="form.name" class="field" minlength="2" maxlength="150" required /></label>
      <label>Nama badan hukum<input v-model="form.legal_name" class="field" maxlength="191" placeholder="Contoh: PT Finora Indonesia" /></label>
      <div class="row-span-3 rounded-xl border border-dashed p-4 text-center">
        <img v-if="form.logo" :src="form.logo" alt="Logo perusahaan" class="mx-auto mb-3 max-h-24 max-w-full object-contain" />
        <div v-else class="mx-auto mb-3 grid h-20 w-20 place-items-center rounded-xl bg-slate-100 text-xs text-slate-400">Logo</div>
        <label class="inline-flex cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50">
          Pilih logo<input type="file" accept="image/png,image/jpeg,image/webp" class="sr-only" @change="chooseLogo" />
        </label>
        <button v-if="form.logo" type="button" class="ml-2 text-sm text-red-600" @click="form.logo = ''">Hapus</button>
        <p class="mt-2 text-xs text-slate-400">PNG/JPG/WebP, maksimal 500 KB.</p>
      </div>
      <label>NPWP<input v-model="form.tax_number" class="field" inputmode="numeric" maxlength="16" pattern="\d{16}" required placeholder="16 digit tanpa tanda baca" /></label>
      <label>Email<input v-model="form.email" type="email" class="field" maxlength="191" /></label>
      <label>Nomor telepon<input v-model="form.phone" class="field" maxlength="50" /></label>
      <label>Mata uang dasar<input v-model="form.base_currency" class="field uppercase" minlength="3" maxlength="3" required /></label>
      <label class="lg:col-span-2">Alamat<textarea v-model="form.address" class="field min-h-24" maxlength="5000" /></label>
      <label>Awal tahun fiskal<select v-model.number="form.fiscal_year_start" class="field"><option v-for="month in 12" :key="month" :value="month">Bulan {{ month }}</option></select></label>
      <div class="lg:col-span-3"><AppButton type="submit" :loading="busy">Simpan identitas perusahaan</AppButton></div>
    </form>
  </section>
</template>

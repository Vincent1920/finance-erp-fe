<script setup lang="ts">
import { ShieldX } from 'lucide-vue-next'
import AppButton from '@/components/common/AppButton.vue'
</script>

<template>
  <section class="mx-auto grid min-h-[60vh] max-w-xl place-items-center text-center">
    <div>
      <span class="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-red-600">
        <ShieldX class="h-8 w-8" />
      </span>
      <h1 class="mt-5 text-2xl font-bold">Akses tidak tersedia</h1>
      <p class="mt-2 text-sm leading-6 text-slate-500">
        Akun Anda tidak memiliki izin untuk membuka halaman ini. Hubungi administrator bila akses
        tersebut memang diperlukan.
      </p>
      <RouterLink to="/dashboard" class="mt-5 inline-block">
        <AppButton>Kembali ke dashboard</AppButton>
      </RouterLink>
    </div>
  </section>
</template>

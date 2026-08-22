<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Landmark } from 'lucide-vue-next'
import AppInput from '@/components/common/AppInput.vue'
import AppButton from '@/components/common/AppButton.vue'
import { useAuthStore } from '@/stores/auth.store'
const router = useRouter()
const authStore = useAuthStore()

const email = ref('admin@financeerp.local')
const password = ref('password')

const handleLogin = async () => {
  try {
    await authStore.login(email.value, password.value)
    await router.push('/dashboard')
  } catch {
    // Auth store normalizes and exposes the API error for the form.
  }
}
</script>
<template>
  <main class="grid min-h-screen place-items-center bg-slate-100 p-4">
    <form class="panel w-full max-w-md p-7" @submit.prevent="handleLogin">
      <div class="mb-7 flex items-center gap-3">
        <span class="rounded-xl bg-blue-600 p-3 text-white"><Landmark class="h-6 w-6" /></span>
        <div>
          <h1 class="text-xl font-bold">Finora ERP</h1>
          <p class="text-sm text-slate-500">Masuk ke ruang kerja keuangan</p>
        </div>
      </div>
      <div class="space-y-4">
        <AppInput v-model="email" label="Email" type="email" required />
        <AppInput v-model="password" label="Kata sandi" type="password" required />
        <p v-if="authStore.errorMessage" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {{ authStore.errorMessage }}
        </p>
        <label class="flex gap-2 text-sm">
          <input type="checkbox" checked />
          Ingat saya
        </label>
        <AppButton class="w-full" :loading="authStore.isLoading">Masuk</AppButton>
      </div>
      <p class="mt-5 text-center text-xs text-slate-400">admin@financeerp.local · password</p>
    </form>
  </main>
</template>

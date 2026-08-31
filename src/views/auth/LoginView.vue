<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Landmark } from 'lucide-vue-next'

import AppInput from '@/components/common/AppInput.vue'
import AppButton from '@/components/common/AppButton.vue'

import { useAuthStore } from '@/stores/auth.store'
import { useNotificationStore } from '@/stores/notification.store'

const router = useRouter()
const route = useRoute()

const authStore = useAuthStore()
const notifications = useNotificationStore()

const email = ref('')
const password = ref('')
const rememberMe = ref(true)

const emailError = ref('')
const passwordError = ref('')

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const showLoginError = (message: string) => {
  notifications.push(
    message || 'Login gagal. Silakan coba lagi.',
    'error',
    {
      title: 'Login Gagal',
      duration: 8000,
    },
  )
}

const validateLogin = () => {
  emailError.value = ''
  passwordError.value = ''

  authStore.clearError()

  const normalizedEmail = email.value.trim()

  if (!normalizedEmail) {
    emailError.value = 'Email wajib diisi.'
    showLoginError(emailError.value)
    return false
  }

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    emailError.value = 'Format email tidak valid.'
    showLoginError(emailError.value)
    return false
  }

  if (!password.value) {
    passwordError.value = 'Password wajib diisi.'
    showLoginError(passwordError.value)
    return false
  }

  if (password.value.length < 8) {
    passwordError.value = 'Password minimal 8 karakter.'
    showLoginError(passwordError.value)
    return false
  }

  return true
}

const getRedirectTarget = () => {
  const redirect =
    typeof route.query.redirect === 'string'
      ? route.query.redirect
      : '/dashboard'

  // Jangan kirim user kembali ke /forbidden atau /login
  // setelah login berhasil.
  if (
    !redirect.startsWith('/') ||
    redirect.startsWith('//') ||
    redirect.startsWith('/forbidden') ||
    redirect.startsWith('/login')
  ) {
    return '/dashboard'
  }

  return redirect
}

const handleLogin = async () => {
  if (!validateLogin()) {
    return
  }

  try {
    await authStore.login(
      email.value.trim(),
      password.value,
      rememberMe.value,
    )

    await router.replace(getRedirectTarget())
  } catch {
    showLoginError(
      authStore.errorMessage ||
        'Login gagal. Periksa email dan password.',
    )
  }
}
</script>

<template>
  <main
    class="grid min-h-screen place-items-center bg-slate-100 p-4"
  >
    <form
      class="panel w-full max-w-md p-7"
      novalidate
      @submit.prevent="handleLogin"
    >
      <div class="mb-7 flex items-center gap-3">
        <span
          class="rounded-xl bg-blue-600 p-3 text-white"
        >
          <Landmark class="h-6 w-6" />
        </span>

        <div>
          <h1 class="text-xl font-bold">
            Finora ERP
          </h1>

          <p class="text-sm text-slate-500">
            Masuk ke ruang kerja keuangan
          </p>
        </div>
      </div>

      <div class="space-y-4">
        <AppInput
          v-model="email"
          label="Email"
          type="email"
          autocomplete="email"
          :error="emailError"
          :disabled="authStore.isLoading"
          required
        />

        <AppInput
          v-model="password"
          label="Kata sandi"
          type="password"
          autocomplete="current-password"
          :error="passwordError"
          :disabled="authStore.isLoading"
          required
        />

        <p
          v-if="authStore.errorMessage"
          class="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {{ authStore.errorMessage }}
        </p>

        <label
          class="flex cursor-pointer items-center gap-2 text-sm text-slate-700"
        >
          <input
            v-model="rememberMe"
            type="checkbox"
            class="h-4 w-4"
            :disabled="authStore.isLoading"
          />

          <span>Ingat saya</span>
        </label>

        <AppButton
          type="submit"
          class="w-full"
          :loading="authStore.isLoading"
          :disabled="authStore.isLoading"
        >
          {{
            authStore.isLoading
              ? 'Memproses...'
              : 'Masuk'
          }}
        </AppButton>
      </div>
    </form>
  </main>
</template>

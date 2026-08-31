<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Bell, ChevronDown, LogOut, Menu, Search, Settings } from 'lucide-vue-next'
import AppConfirmDialog from '@/components/common/AppConfirmDialog.vue'
import { periodService } from '@/services/period.service'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationStore } from '@/stores/notification.store'

const emit = defineEmits<{ menu: []; search: [] }>()
const router = useRouter()
const auth = useAuthStore()
const notifications = useNotificationStore()
const isUserMenuOpen = ref(false)
const showLogoutConfirmation = ref(false)
const isLoggingOut = ref(false)
const activePeriod = ref('Belum diatur')

const initials = computed(() => {
  const source = auth.user?.name || auth.user?.email || 'User'
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
})
const roleLabel = computed(() => {
  const role = auth.user?.roles?.[0]
  if (!role) return 'Pengguna'
  return role.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
})

const loadActivePeriod = async () => {
  if (!auth.hasPermission('accounting-periods.view')) return
  try {
    const response = await periodService.list({ page: 1, limit: 24, status: 'open' })
    const today = new Date().toISOString().slice(0, 10)
    const period = response.data.find(
      (candidate) => candidate.start_date <= today && candidate.end_date >= today,
    )
    if (!period) return
    activePeriod.value = new Intl.DateTimeFormat('id-ID', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(period.year, period.month - 1, 1))
  } catch {
    activePeriod.value = 'Tidak tersedia'
  }
}

const navigateToSettings = async () => {
  isUserMenuOpen.value = false
  await router.push('/system/settings')
}
const navigateToApprovals = () => router.push('/approvals')
const handleLogout = async () => {
  isLoggingOut.value = true
  try {
    await auth.logout()
    notifications.push('Anda telah keluar dari Finance ERP.', 'info')
    await router.replace('/login')
  } finally {
    isLoggingOut.value = false
    showLogoutConfirmation.value = false
  }
}

onMounted(loadActivePeriod)
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6"
  >
    <button
      type="button"
      class="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
      aria-label="Buka menu"
      @click="emit('menu')"
    >
      <Menu class="h-5 w-5" />
    </button>

    <button
      type="button"
      class="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-400 md:max-w-sm"
      @click="emit('search')"
    >
      <Search class="h-4 w-4" />
      <span class="truncate">Cari transaksi, akun, kontak...</span>
      <kbd class="ml-auto hidden rounded border bg-white px-1.5 text-xs sm:block">Ctrl K</kbd>
    </button>

    <div class="ml-auto hidden border-l pl-4 text-right md:block">
      <p class="text-xs text-slate-400">Periode aktif</p>
      <p class="text-sm font-semibold">{{ activePeriod }}</p>
    </div>

    <button
      v-if="auth.hasPermission('approvals.view')"
      type="button"
      class="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
      aria-label="Buka persetujuan transaksi"
      @click="navigateToApprovals"
    >
      <Bell class="h-5 w-5" />
    </button>

    <div class="relative">
      <button
        type="button"
        class="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-50"
        aria-haspopup="menu"
        :aria-expanded="isUserMenuOpen"
        @click="isUserMenuOpen = !isUserMenuOpen"
      >
        <span
          class="grid h-8 w-8 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-700"
        >
          {{ initials }}
        </span>
        <span class="hidden text-left xl:block">
          <b class="block max-w-40 truncate text-sm">{{ auth.user?.name ?? auth.user?.email }}</b>
          <small class="block text-slate-400">{{ roleLabel }}</small>
        </span>
        <ChevronDown class="hidden h-4 w-4 text-slate-400 sm:block" />
      </button>

      <div v-if="isUserMenuOpen" class="panel absolute right-0 top-12 w-52 p-1.5" role="menu">
        <button
          v-if="auth.hasPermission('settings.view')"
          type="button"
          class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-50"
          @click="navigateToSettings"
        >
          <Settings class="h-4 w-4" />
          Pengaturan
        </button>
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          @click="isUserMenuOpen = false; showLogoutConfirmation = true"
        >
          <LogOut class="h-4 w-4" />
          Keluar
        </button>
      </div>
    </div>
  </header>

  <AppConfirmDialog
    :open="showLogoutConfirmation"
    title="Keluar dari aplikasi"
    message="Sesi saat ini akan diakhiri. Data yang belum disimpan pada formulir akan hilang."
    confirm-label="Keluar"
    :busy="isLoggingOut"
    @cancel="showLogoutConfirmation = false"
    @confirm="handleLogout"
  />
</template>

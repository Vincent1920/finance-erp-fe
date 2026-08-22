<script setup lang="ts">
import { ref } from 'vue'
import type { Component } from 'vue'

import { Bell, ChevronDown, LogOut, Menu, Search, Settings, UserRound } from 'lucide-vue-next'

import { CURRENT_PERIOD } from '@/utils/constants'

const emit = defineEmits<{
  menu: []
  search: []
}>()

interface UserMenuItem {
  label: string
  icon: Component
}

const userMenuItems: UserMenuItem[] = [
  { label: 'Profil', icon: UserRound },
  { label: 'Pengaturan', icon: Settings },
  { label: 'Keluar', icon: LogOut },
]

const isUserMenuOpen = ref(false)

const handleOpenMobileMenu = () => emit('menu')
const handleOpenSearch = () => emit('search')

const handleToggleUserMenu = () => {
  isUserMenuOpen.value = !isUserMenuOpen.value
}
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6"
  >
    <button class="rounded-lg p-2 hover:bg-slate-100 lg:hidden" @click="handleOpenMobileMenu">
      <Menu class="h-5 w-5" />
    </button>

    <button
      class="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-400 md:max-w-sm"
      @click="handleOpenSearch"
    >
      <Search class="h-4 w-4" />
      <span class="truncate">Cari transaksi, akun, kontak...</span>
      <kbd class="ml-auto hidden rounded border bg-white px-1.5 text-xs sm:block">Ctrl K</kbd>
    </button>

    <div class="ml-auto hidden border-l pl-4 text-right md:block">
      <p class="text-xs text-slate-400">Periode aktif</p>
      <p class="text-sm font-semibold">{{ CURRENT_PERIOD }}</p>
    </div>

    <button class="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100">
      <Bell class="h-5 w-5" />
      <span class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
    </button>

    <div class="relative">
      <button
        class="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-50"
        @click="handleToggleUserMenu"
      >
        <span
          class="grid h-8 w-8 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-700"
        >
          AN
        </span>
        <span class="hidden text-left xl:block">
          <b class="block text-sm">Aulia Nur</b>
          <small class="block text-slate-400">Finance Manager</small>
        </span>
        <ChevronDown class="hidden h-4 w-4 text-slate-400 sm:block" />
      </button>

      <div v-if="isUserMenuOpen" class="panel absolute right-0 top-12 w-48 p-1.5">
        <button
          v-for="menuItem in userMenuItems"
          :key="menuItem.label"
          class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-50"
        >
          <component :is="menuItem.icon" class="h-4 w-4" />
          {{ menuItem.label }}
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
const isSidebarCollapsed = ref(false)
const isMobileSidebarOpen = ref(false)

const handleOpenSearch = () => {
  window.dispatchEvent(new CustomEvent('open-global-search'))
}

const handleSearchShortcut = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    handleOpenSearch()
  }
}

onMounted(() => addEventListener('keydown', handleSearchShortcut))
onUnmounted(() => removeEventListener('keydown', handleSearchShortcut))
</script>
<template>
  <div class="min-h-screen">
    <div
      class="fixed inset-y-0 left-0 z-40 hidden transition-all lg:block"
      :class="isSidebarCollapsed ? 'w-20' : 'w-64'"
    >
      <AppSidebar
        :collapsed="isSidebarCollapsed"
        @toggle="isSidebarCollapsed = !isSidebarCollapsed"
      />
    </div>
    <div
      v-if="isMobileSidebarOpen"
      class="fixed inset-0 z-50 bg-slate-950/40 lg:hidden"
      @click.self="isMobileSidebarOpen = false"
    >
      <div class="h-full w-72">
        <AppSidebar
          :collapsed="false"
          @toggle="isMobileSidebarOpen = false"
          @navigate="isMobileSidebarOpen = false"
        />
      </div>
    </div>
    <div class="transition-all" :class="isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'">
      <AppHeader @menu="isMobileSidebarOpen = true" @search="handleOpenSearch" />
      <main class="p-4 md:p-6 lg:p-8"><RouterView /></main>
      <footer class="border-t px-6 py-4 text-center text-xs text-slate-400">
        © 2026 Finora ERP · Data dummy untuk demonstrasi
      </footer>
    </div>
  </div>
</template>

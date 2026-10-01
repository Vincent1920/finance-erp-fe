<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ChevronDown, Clock3, Landmark, PanelLeftClose, PanelLeftOpen, Search, Star } from 'lucide-vue-next'
import { menu, type MenuItem } from '@/data/sidebar'
import { useAuthStore } from '@/stores/auth.store'

const props = defineProps<{ collapsed: boolean }>()
const emit = defineEmits<{ toggle: []; navigate: [] }>()
const route = useRoute(), auth = useAuthStore(), query = ref('')
const FAVORITES_KEY = 'finora:navigation:favorites', RECENT_KEY = 'finora:navigation:recent', OPEN_KEY = 'finora:navigation:open-groups'
const favoritePaths = ref<string[]>([]), recentPaths = ref<string[]>([]), openedGroups = ref<string[]>([])

const canAccess = (item: MenuItem) => auth.hasPermission(item.permission) && (!item.permissions?.length || item.permissions.some((permission) => auth.hasPermission(permission)))
const visibleMenu = computed(() => menu.map((item) => ({ ...item, children: item.children?.filter(canAccess) })).filter((item) => canAccess(item) && (!item.children || item.children.length)))
const flatLinks = computed(() => visibleMenu.value.flatMap((item) => item.to ? [item] : (item.children ?? [])))
const favoriteItems = computed(() => favoritePaths.value.map((path) => flatLinks.value.find((item) => item.to === path)).filter(Boolean) as MenuItem[])
const recentItems = computed(() => recentPaths.value.map((path) => flatLinks.value.find((item) => item.to === path)).filter(Boolean).slice(0, 4) as MenuItem[])
const sectionOrder = ['Utama', 'Transaksi', 'Keuangan', 'Analisis', 'Administrasi']
const sectionFor = (label: string) => {
  if (['Dashboard', 'Pencarian'].includes(label)) return 'Utama'
  if (['Penjualan', 'Pembelian', 'Persediaan', 'PAYROLL'].includes(label)) return 'Transaksi'
  if (['Akuntansi', 'Perbankan', 'Aset', 'Anggaran', 'Penutupan'].includes(label)) return 'Keuangan'
  if (['Perpajakan', 'Laporan'].includes(label)) return 'Analisis'
  return 'Administrasi'
}
const filteredMenu = computed(() => {
  const term = query.value.trim().toLowerCase()
  if (!term) return visibleMenu.value
  return visibleMenu.value.map((item) => {
    const ownMatch = item.label.toLowerCase().includes(term)
    const children = item.children?.filter((child) => child.label.toLowerCase().includes(term))
    return { ...item, children: ownMatch ? item.children : children }
  }).filter((item) => item.to ? item.label.toLowerCase().includes(term) : Boolean(item.children?.length))
})
const sections = computed(() => sectionOrder.map((label) => ({ label, items: filteredMenu.value.filter((item) => sectionFor(item.label) === label) })).filter((section) => section.items.length))
const isActive = (path?: string) => Boolean(path && (route.path === path || (path !== '/dashboard' && route.path.startsWith(`${path}/`))))
const isOpen = (label: string) => query.value.length > 0 || openedGroups.value.includes(label)
const save = (key: string, value: string[]) => localStorage.setItem(key, JSON.stringify(value))
function toggleGroup(label: string) {
  openedGroups.value = isOpen(label) && !query.value ? openedGroups.value.filter((item) => item !== label) : [...new Set([...openedGroups.value, label])]
  save(OPEN_KEY, openedGroups.value)
}
function toggleFavorite(path?: string) {
  if (!path) return
  favoritePaths.value = favoritePaths.value.includes(path) ? favoritePaths.value.filter((item) => item !== path) : [...favoritePaths.value, path]
  save(FAVORITES_KEY, favoritePaths.value)
}
function navigate(path?: string) {
  if (path) {
    recentPaths.value = [path, ...recentPaths.value.filter((item) => item !== path)].slice(0, 8)
    save(RECENT_KEY, recentPaths.value)
  }
  emit('navigate')
}
onMounted(() => {
  const read = (key: string) => { try { return JSON.parse(localStorage.getItem(key) ?? '[]') as string[] } catch { return [] } }
  favoritePaths.value = read(FAVORITES_KEY); recentPaths.value = read(RECENT_KEY); openedGroups.value = read(OPEN_KEY)
  const activeGroup = visibleMenu.value.find((item) => item.children?.some((child) => isActive(child.to)))?.label
  if (activeGroup && !openedGroups.value.includes(activeGroup)) openedGroups.value.push(activeGroup)
})
watch(() => route.path, (path) => { if (flatLinks.value.some((item) => item.to === path)) navigate(path) })
</script>

<template>
  <aside class="flex h-full flex-col border-r border-slate-200 bg-white">
    <div class="flex h-16 items-center gap-3 border-b px-4">
      <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-600 text-white"><Landmark class="h-5 w-5" /></span>
      <div v-if="!collapsed"><p class="font-bold tracking-tight">Finora</p><p class="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Finance ERP</p></div>
      <button class="ml-auto hidden rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:block" :aria-label="collapsed ? 'Perluas menu' : 'Ciutkan menu'" @click="emit('toggle')"><component :is="collapsed ? PanelLeftOpen : PanelLeftClose" class="h-4 w-4" /></button>
    </div>
    <div v-if="!collapsed" class="border-b p-3"><label class="relative block"><Search class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input v-model="query" type="search" class="field pl-9" placeholder="Cari menu…" aria-label="Cari menu" /></label></div>
    <nav class="flex-1 space-y-4 overflow-y-auto p-3" aria-label="Navigasi utama">
      <section v-if="!collapsed && favoriteItems.length">
        <p class="mb-1 flex items-center gap-2 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400"><Star class="h-3 w-3" /> Favorit</p>
        <RouterLink v-for="item in favoriteItems" :key="`fav-${item.to}`" :to="item.to!" class="block rounded-md px-3 py-2 text-sm" :class="isActive(item.to) ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-500 hover:bg-slate-50'" @click="navigate(item.to)">{{ item.label }}</RouterLink>
      </section>
      <section v-if="!collapsed && recentItems.length && !query">
        <p class="mb-1 flex items-center gap-2 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400"><Clock3 class="h-3 w-3" /> Terakhir digunakan</p>
        <RouterLink v-for="item in recentItems" :key="`recent-${item.to}`" :to="item.to!" class="block truncate rounded-md px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50" @click="navigate(item.to)">{{ item.label }}</RouterLink>
      </section>
      <section v-for="section in sections" :key="section.label">
        <p v-if="!collapsed" class="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">{{ section.label }}</p>
        <div class="space-y-1">
          <template v-for="item in section.items" :key="item.label">
            <div v-if="item.to" class="group flex items-center">
              <RouterLink :to="item.to" class="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium" :class="isActive(item.to) ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'" :title="collapsed ? item.label : undefined" @click="navigate(item.to)"><component :is="item.icon" class="h-4 w-4 shrink-0" /><span v-if="!collapsed">{{ item.label }}</span></RouterLink>
              <button v-if="!collapsed" class="rounded p-1 text-slate-300 hover:text-amber-500" :class="favoritePaths.includes(item.to) && 'text-amber-500'" :aria-label="`${favoritePaths.includes(item.to) ? 'Hapus dari' : 'Tambahkan ke'} favorit`" @click="toggleFavorite(item.to)"><Star class="h-3.5 w-3.5" :fill="favoritePaths.includes(item.to) ? 'currentColor' : 'none'" /></button>
            </div>
            <div v-else>
              <button class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50" :title="collapsed ? item.label : undefined" @click="toggleGroup(item.label)"><component :is="item.icon" class="h-4 w-4 shrink-0" /><span v-if="!collapsed" class="truncate">{{ item.label }}</span><ChevronDown v-if="!collapsed" class="ml-auto h-3.5 w-3.5 transition" :class="isOpen(item.label) && 'rotate-180'" /></button>
              <div v-if="!collapsed && isOpen(item.label)" class="ml-4 space-y-0.5 border-l border-slate-200 py-1 pl-2">
                <div v-for="child in item.children" :key="child.to" class="group flex items-center">
                  <RouterLink :to="child.to ?? '/dashboard'" class="min-w-0 flex-1 truncate rounded-md px-3 py-2 text-sm" :class="isActive(child.to) ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-500 hover:bg-slate-50'" @click="navigate(child.to)">{{ child.label }}</RouterLink>
                  <button class="rounded p-1 text-slate-300 opacity-40 hover:text-amber-500 group-hover:opacity-100" :class="favoritePaths.includes(child.to!) && 'text-amber-500 opacity-100'" :aria-label="`${favoritePaths.includes(child.to!) ? 'Hapus dari' : 'Tambahkan ke'} favorit`" @click="toggleFavorite(child.to)"><Star class="h-3.5 w-3.5" :fill="favoritePaths.includes(child.to!) ? 'currentColor' : 'none'" /></button>
                </div>
              </div>
            </div>
          </template>
        </div>
      </section>
      <p v-if="query && !sections.length" class="px-3 py-8 text-center text-sm text-slate-400">Menu tidak ditemukan.</p>
    </nav>
    <div v-if="!collapsed" class="border-t p-4 text-xs text-slate-400">{{ auth.user?.name ?? 'Finance ERP' }}<br />v0.1.0</div>
  </aside>
</template>

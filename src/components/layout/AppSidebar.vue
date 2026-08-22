<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'

import { ChevronDown, Landmark, PanelLeftClose, PanelLeftOpen } from 'lucide-vue-next'

import { menu } from '@/data/sidebar'

const props = defineProps<{
  collapsed: boolean
}>()

const emit = defineEmits<{
  toggle: []
  navigate: []
}>()

const route = useRoute()

const getInitiallyOpenedGroups = (): string[] => {
  return menu
    .filter((menuItem) => {
      return menuItem.children?.some((childItem) => {
        return childItem.to ? route.path.startsWith(childItem.to) : false
      })
    })
    .map((menuItem) => menuItem.label)
}

const openedGroups = ref<string[]>(getInitiallyOpenedGroups())

const isActiveRoute = (path?: string) => Boolean(path && route.path === path)
const isGroupOpened = (label: string) => openedGroups.value.includes(label)

const getMenuItemClass = (path?: string) => {
  return isActiveRoute(path) ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
}

const getChildItemClass = (path?: string) => {
  return isActiveRoute(path)
    ? 'bg-blue-50 font-medium text-blue-700'
    : 'text-slate-500 hover:bg-slate-50'
}

const handleToggleGroup = (label: string) => {
  if (isGroupOpened(label)) {
    openedGroups.value = openedGroups.value.filter((groupLabel) => groupLabel !== label)
    return
  }

  openedGroups.value = [...openedGroups.value, label]
}

const handleToggleSidebar = () => emit('toggle')
const handleNavigation = () => emit('navigate')
</script>

<template>
  <aside class="flex h-full flex-col border-r border-slate-200 bg-white">
    <div class="flex h-16 items-center gap-3 border-b px-4">
      <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-600 text-white">
        <Landmark class="h-5 w-5" />
      </span>

      <div v-if="!props.collapsed">
        <p class="font-bold tracking-tight">Finora</p>
        <p class="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Finance ERP
        </p>
      </div>

      <button
        class="ml-auto hidden rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:block"
        @click="handleToggleSidebar"
      >
        <component :is="props.collapsed ? PanelLeftOpen : PanelLeftClose" class="h-4 w-4" />
      </button>
    </div>

    <nav class="flex-1 space-y-1 overflow-y-auto p-3">
      <template v-for="menuItem in menu" :key="menuItem.label">
        <RouterLink
          v-if="menuItem.to"
          :to="menuItem.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium"
          :class="getMenuItemClass(menuItem.to)"
          @click="handleNavigation"
        >
          <component :is="menuItem.icon" class="h-4 w-4 shrink-0" />
          <span v-if="!props.collapsed">{{ menuItem.label }}</span>
        </RouterLink>

        <div v-else>
          <button
            class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold uppercase tracking-wide text-slate-500 hover:bg-slate-50"
            @click="handleToggleGroup(menuItem.label)"
          >
            <component :is="menuItem.icon" class="h-4 w-4 shrink-0" />
            <span v-if="!props.collapsed" class="truncate">{{ menuItem.label }}</span>
            <ChevronDown
              v-if="!props.collapsed"
              class="ml-auto h-3.5 w-3.5 transition"
              :class="{ 'rotate-180': isGroupOpened(menuItem.label) }"
            />
          </button>

          <div
            v-if="!props.collapsed && isGroupOpened(menuItem.label)"
            class="ml-4 space-y-0.5 border-l border-slate-200 py-1 pl-3"
          >
            <RouterLink
              v-for="childItem in menuItem.children"
              :key="childItem.to"
              :to="childItem.to ?? '/dashboard'"
              class="block rounded-md px-3 py-2 text-sm"
              :class="getChildItemClass(childItem.to)"
              @click="handleNavigation"
            >
              {{ childItem.label }}
            </RouterLink>
          </div>
        </div>
      </template>
    </nav>

    <div v-if="!props.collapsed" class="border-t p-4 text-xs text-slate-400">
      PT Finora Indonesia
      <br />
      v0.1.0
    </div>
  </aside>
</template>

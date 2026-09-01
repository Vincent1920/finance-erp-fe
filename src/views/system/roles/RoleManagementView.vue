<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppEmptyState from '@/components/common/AppEmptyState.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import { permissionService, roleService } from '@/services/role.service'
import type { PermissionRecord, RoleRecord } from '@/types/system'
import { getApiErrorMessage } from '@/utils/error'

const roles = ref<RoleRecord[]>([]),
  permissions = ref<PermissionRecord[]>([]),
  error = ref(''),
  loading = ref(false),
  open = ref(false),
  editingId = ref<number | null>(null)
const form = reactive({
  name: '',
  slug: '',
  description: '',
  is_active: true,
  permission_ids: [] as number[],
})
const modules = computed(() => {
  const grouped = permissions.value.reduce<Record<string, PermissionRecord[]>>(
    (result, permission) => {
      ;(result[permission.module] ??= []).push(permission)
      return result
    },
    {},
  )
  return Object.entries(grouped)
})
const load = async () => {
  try {
    const [roleRows, permissionRows] = await Promise.all([
      roleService.list({ page: 1, limit: 200 }),
      permissionService.list(),
    ])
    roles.value = roleRows.data
    permissions.value = permissionRows
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Data peran gagal dimuat.')
  }
}
const create = () => {
  editingId.value = null
  Object.assign(form, { name: '', slug: '', description: '', is_active: true, permission_ids: [] })
  open.value = true
}
const edit = async (id: number) => {
  try {
    const role = await roleService.get(id)
    editingId.value = id
    Object.assign(form, {
      name: role.name,
      slug: role.slug,
      description: role.description || '',
      is_active: role.is_active !== false,
      permission_ids: (role.permissions || [])
        .filter((permission) => typeof permission !== 'string')
        .map((permission) => permission.id),
    })
    open.value = true
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Detail peran gagal dimuat.')
  }
}
const save = async () => {
  loading.value = true
  error.value = ''
  try {
    if (editingId.value) {
      await roleService.update(editingId.value, {
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        is_active: form.is_active,
      })
      await roleService.assignPermissions(editingId.value, form.permission_ids)
    } else await roleService.create({ ...form })
    open.value = false
    await load()
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Peran gagal disimpan.')
  } finally {
    loading.value = false
  }
}
const permissionCount = (role: RoleRecord) => role.permissions?.length || 0
onMounted(load)
</script>

<template>
  <div>
    <AppBreadcrumb />
    <header class="mb-5 flex items-end justify-between">
      <div>
        <h1 class="text-2xl font-bold">Peran & Hak Akses</h1>
        <p class="text-sm text-slate-500">
          Kelola kumpulan permission berdasarkan tanggung jawab pengguna.
        </p>
      </div>
      <AppButton @click="create">Tambah Peran</AppButton>
    </header>
    <p v-if="error" class="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
    <section class="panel overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b bg-slate-50 text-left">
            <th class="p-3">Nama</th>
            <th class="p-3">Slug</th>
            <th class="p-3">Permission</th>
            <th class="p-3">Status</th>
            <th class="p-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="role in roles" :key="role.id" class="border-b">
            <td class="p-3 font-medium">
              {{ role.name }}
              <small v-if="role.is_system">(sistem)</small>
            </td>
            <td class="p-3">{{ role.slug }}</td>
            <td class="p-3">{{ permissionCount(role) }}</td>
            <td class="p-3">
              <AppBadge :tone="role.is_active === false ? 'slate' : 'green'">
                {{ role.is_active === false ? 'inactive' : 'active' }}
              </AppBadge>
            </td>
            <td class="p-3 text-right">
              <button class="text-blue-700" @click="edit(role.id)">Edit</button>
            </td>
          </tr>
        </tbody>
      </table>
      <AppEmptyState
        v-if="!roles.length"
        title="Belum ada peran"
        description="Buat peran dan pilih permission yang diperlukan."
      />
    </section>
    <AppModal
      :open="open"
      :title="editingId ? 'Edit Peran' : 'Tambah Peran'"
      size="lg"
      @close="open = false"
    >
      <form class="space-y-4" @submit.prevent="save">
        <div class="grid gap-3 md:grid-cols-2">
          <label class="text-sm">
            Nama
            <input v-model="form.name" class="field mt-1" required />
          </label>
          <label class="text-sm">
            Slug
            <input
              v-model="form.slug"
              class="field mt-1"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              required
            />
          </label>
        </div>
        <label class="block text-sm">
          Deskripsi
          <textarea v-model="form.description" class="field mt-1" rows="2" />
        </label>
        <label class="flex gap-2 text-sm">
          <input v-model="form.is_active" type="checkbox" />
          Peran aktif
        </label>
        <fieldset>
          <legend class="mb-2 font-medium">Permissions ({{ form.permission_ids.length }})</legend>
          <div class="max-h-72 space-y-4 overflow-y-auto rounded border p-3">
            <section v-for="[module, items] in modules" :key="module">
              <h3 class="mb-2 text-sm font-semibold capitalize">{{ module }}</h3>
              <div class="grid gap-2 md:grid-cols-2">
                <label v-for="permission in items" :key="permission.id" class="flex gap-2 text-sm">
                  <input v-model="form.permission_ids" type="checkbox" :value="permission.id" />
                  <span>
                    {{ permission.name }}
                    <small class="text-slate-400">{{ permission.action }}</small>
                  </span>
                </label>
              </div>
            </section>
          </div>
        </fieldset>
        <div class="flex justify-end gap-2">
          <AppButton variant="secondary" @click="open = false">Batal</AppButton>
          <AppButton type="submit" :loading="loading">Simpan</AppButton>
        </div>
      </form>
    </AppModal>
  </div>
</template>

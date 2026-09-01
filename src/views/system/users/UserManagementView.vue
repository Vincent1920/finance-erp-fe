<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppEmptyState from '@/components/common/AppEmptyState.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import { roleService } from '@/services/role.service'
import { userService } from '@/services/user.service'
import type { RoleRecord, SystemUser } from '@/types/system'
import type { UserStatus } from '@/types/auth'
import { getApiErrorMessage } from '@/utils/error'

const rows = ref<SystemUser[]>([]),
  roles = ref<RoleRecord[]>([]),
  page = ref(1),
  total = ref(0)
const loading = ref(false),
  error = ref(''),
  open = ref(false),
  editingId = ref<number | null>(null)
const form = reactive({
  name: '',
  email: '',
  password: '',
  status: 'active' as UserStatus,
  role_ids: [] as number[],
})
const roleNames = (user: SystemUser) =>
  user.roles.map((role) => (typeof role === 'string' ? role : role.name)).join(', ') || '-'
const load = async () => {
  try {
    const [users, roleRows] = await Promise.all([
      userService.list({ page: page.value, limit: 20 }),
      roleService.list({ page: 1, limit: 200 }),
    ])
    rows.value = users.data
    total.value = users.meta.total
    roles.value = roleRows.data
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Data pengguna gagal dimuat.')
  }
}
const create = () => {
  editingId.value = null
  Object.assign(form, { name: '', email: '', password: '', status: 'active', role_ids: [] })
  open.value = true
}
const edit = async (id: number) => {
  try {
    const user = await userService.get(id)
    editingId.value = id
    Object.assign(form, {
      name: user.name,
      email: user.email,
      password: '',
      status: user.status,
      role_ids: user.roles.filter((role) => typeof role !== 'string').map((role) => role.id),
    })
    open.value = true
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Detail pengguna gagal dimuat.')
  }
}
const save = async () => {
  loading.value = true
  error.value = ''
  try {
    if (editingId.value) {
      await userService.update(editingId.value, { name: form.name, email: form.email })
      await userService.assignRoles(editingId.value, form.role_ids)
      if (form.password) await userService.resetPassword(editingId.value, form.password)
      await userService.setStatus(editingId.value, form.status)
    } else await userService.create({ ...form })
    open.value = false
    await load()
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Pengguna gagal disimpan.')
  } finally {
    loading.value = false
  }
}
const toggle = async (user: SystemUser) => {
  try {
    await userService.setStatus(user.id, user.status === 'active' ? 'inactive' : 'active')
    await load()
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Status pengguna gagal diubah.')
  }
}
const changePage = (value: number) => {
  page.value = value
  void load()
}
onMounted(load)
</script>

<template>
  <div>
    <AppBreadcrumb />
    <header class="mb-5 flex items-end justify-between">
      <div>
        <h1 class="text-2xl font-bold">Pengguna</h1>
        <p class="text-sm text-slate-500">Kelola akun, status, password, dan keanggotaan peran.</p>
      </div>
      <AppButton @click="create">Tambah Pengguna</AppButton>
    </header>
    <p v-if="error" class="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
    <section class="panel overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b bg-slate-50 text-left">
              <th class="p-3">Nama</th>
              <th class="p-3">Email</th>
              <th class="p-3">Peran</th>
              <th class="p-3">Login terakhir</th>
              <th class="p-3">Status</th>
              <th class="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in rows" :key="user.id" class="border-b">
              <td class="p-3 font-medium">{{ user.name }}</td>
              <td class="p-3">{{ user.email }}</td>
              <td class="p-3">{{ roleNames(user) }}</td>
              <td class="p-3">{{ user.last_login_at || '-' }}</td>
              <td class="p-3">
                <AppBadge
                  :tone="
                    user.status === 'active' ? 'green' : user.status === 'locked' ? 'red' : 'slate'
                  "
                >
                  {{ user.status }}
                </AppBadge>
              </td>
              <td class="space-x-3 p-3 text-right">
                <button class="text-blue-700" @click="edit(user.id)">Edit</button>
                <button class="text-slate-700" @click="toggle(user)">
                  {{ user.status === 'active' ? 'Nonaktifkan' : 'Aktifkan' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppEmptyState
        v-if="!rows.length"
        title="Belum ada pengguna"
        description="Tambahkan pengguna untuk memberi akses ERP."
      />
      <div class="border-t p-4">
        <AppPagination :page="page" :total="total" :per-page="20" @change="changePage" />
      </div>
    </section>
    <AppModal
      :open="open"
      :title="editingId ? 'Edit Pengguna' : 'Tambah Pengguna'"
      @close="open = false"
    >
      <form class="space-y-4" @submit.prevent="save">
        <label class="block text-sm">
          Nama
          <input v-model="form.name" class="field mt-1" required minlength="2" />
        </label>
        <label class="block text-sm">
          Email
          <input v-model="form.email" type="email" class="field mt-1" required />
        </label>
        <label class="block text-sm">
          {{ editingId ? 'Password baru (opsional)' : 'Password' }}
          <input
            v-model="form.password"
            type="password"
            class="field mt-1"
            :required="!editingId"
            minlength="8"
          />
        </label>
        <label class="block text-sm">
          Status
          <select v-model="form.status" class="field mt-1">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="locked">Locked</option>
          </select>
        </label>
        <fieldset>
          <legend class="mb-2 text-sm font-medium">Peran</legend>
          <div class="grid max-h-48 gap-2 overflow-y-auto md:grid-cols-2">
            <label v-for="role in roles" :key="role.id" class="flex gap-2 text-sm">
              <input v-model="form.role_ids" type="checkbox" :value="role.id" />
              {{ role.name }}
            </label>
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

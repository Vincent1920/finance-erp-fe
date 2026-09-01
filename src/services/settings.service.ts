import api from './api/client'
import { API_ENDPOINTS } from './api/endpoints'
import type { ApiResponse } from '@/types/api'
import type { SettingsMap } from '@/types/system'

interface SettingRow {
  id?: number
  setting_key: string
  setting_value: unknown
  value_type: 'string' | 'number' | 'boolean' | 'json' | 'account_id'
  category: string
  is_secret: number | boolean
}

const normalizeSettings = (data: SettingsMap | SettingRow[]): SettingsMap => {
  if (!Array.isArray(data)) return data
  return Object.fromEntries(data.map((row) => [row.setting_key, row.setting_value])) as SettingsMap
}

export const settingsService = {
  list: async () => (await api.get<ApiResponse<SettingRow[]>>(API_ENDPOINTS.settings)).data.data,
  getAll: async () => {
    const response = await api.get<ApiResponse<SettingsMap | SettingRow[]>>(API_ENDPOINTS.settings)
    return normalizeSettings(response.data.data)
  },
  updateAll: async (
    settings: Array<{
      key: string
      value: unknown
      value_type: SettingRow['value_type']
      category: string
      is_secret: boolean
    }>,
  ) =>
    (
      await api.put<ApiResponse<SettingsMap | SettingRow[]>>(API_ENDPOINTS.settings, {
        settings,
      })
    ).data.data,
  get: async (key: string) =>
    (await api.get<ApiResponse<unknown>>(`${API_ENDPOINTS.settings}/${key}`)).data.data,
  update: async (key: string, value: unknown) =>
    (
      await api.put<ApiResponse<unknown>>(`${API_ENDPOINTS.settings}/${key}`, {
        value,
      })
    ).data.data,
}

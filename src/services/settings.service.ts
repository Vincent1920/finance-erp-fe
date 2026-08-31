import api from './api/client'
import { API_ENDPOINTS } from './api/endpoints'
import type { ApiResponse } from '@/types/api'
import type { SettingsMap } from '@/types/system'

interface SettingRow {
  setting_key: string
  setting_value: unknown
}

const normalizeSettings = (data: SettingsMap | SettingRow[]): SettingsMap => {
  if (!Array.isArray(data)) return data
  return Object.fromEntries(data.map((row) => [row.setting_key, row.setting_value])) as SettingsMap
}

export const settingsService = {
  getAll: async () => {
    const response = await api.get<ApiResponse<SettingsMap | SettingRow[]>>(API_ENDPOINTS.settings)
    return normalizeSettings(response.data.data)
  },
  updateAll: async (settings: SettingsMap) =>
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

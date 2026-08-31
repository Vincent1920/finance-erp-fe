import type { EntityRecord } from './master'
import type { UserStatus } from './auth'

export interface SystemUser extends EntityRecord {
  name: string
  email: string
  status: UserStatus
  roles: Array<{ id: number; name: string; slug: string }> | string[]
  last_login_at?: string | null
  locked_at?: string | null
}

export interface RoleRecord extends EntityRecord {
  name: string
  slug: string
  description?: string | null
  is_system?: boolean
  is_active?: boolean
  permissions?: PermissionRecord[] | string[]
}

export interface PermissionRecord extends EntityRecord {
  module: string
  action: string
  name: string
  slug: string
}

export interface AuditLogRecord extends EntityRecord {
  user_id?: number | null
  user_name?: string | null
  module: string
  action: string
  record_type?: string | null
  record_id?: number | null
  old_value?: unknown
  new_value?: unknown
  ip?: string | null
  request_id?: string | null
  created_at: string
}

export interface ErrorLogRecord extends EntityRecord {
  request_id?: string | null
  level: string
  category?: string | null
  message: string
  error_code?: string | null
  context?: unknown
  path?: string | null
  method?: string | null
  created_at: string
  resolved_at?: string | null
}

export interface BackupRecord extends EntityRecord {
  backup_number: string
  type: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  file_name?: string | null
  file_size?: number | null
  requested_at?: string
  completed_at?: string | null
  error_message?: string | null
}

export type SettingsMap = Record<string, string | number | boolean | null | Record<string, unknown>>

import type { Component } from 'vue'
import type { EntityService } from '@/services/entity.service'
import type { EntityRecord } from './master'

export type WorkspaceFormValue =
  | string
  | number
  | boolean
  | null

export type WorkspaceForm = Record<
  string,
  WorkspaceFormValue
>

export type WorkspaceValidationErrors =
  Partial<Record<string, string>>

export interface WorkspaceOption {
  label: string
  value: string | number
}

export interface WorkspaceField {
  key: string
  label: string
  type?:
    | 'text'
    | 'email'
    | 'number'
    | 'date'
    | 'textarea'
    | 'select'
    | 'checkbox'
  required?: boolean
  nullable?: boolean
  placeholder?: string
  help?: string
  min?: number
  max?: number
  step?: number
  minLength?: number
  maxLength?: number
  options?:
    | WorkspaceOption[]
    | (() => Promise<WorkspaceOption[]>)
  valueType?: 'string' | 'number'
  defaultValue?: unknown
  readOnlyOnEdit?: boolean
  span?: 1 | 2
}

export interface WorkspaceColumn {
  key: string
  label: string
  sortable?: boolean
  align?: 'left' | 'right'
  type?:
    | 'text'
    | 'boolean'
    | 'date'
    | 'datetime'
    | 'currency'
    | 'number'
    | 'status'
  format?: (
    value: unknown,
    row: EntityRecord,
  ) => string
}

export interface WorkspaceFilter {
  key: string
  label: string
  options: WorkspaceOption[]
}

export interface MasterWorkspaceConfig {
  title: string
  description: string
  singular: string
  icon?: Component
  permissionPrefix: string
  service: EntityService<EntityRecord>
  fields: WorkspaceField[]
  columns: WorkspaceColumn[]
  filters?: WorkspaceFilter[]
  defaultSort?: string
  canDelete?: boolean
  deleteLabel?: string
  exportFileName?: string

  validate?: (
    form: WorkspaceForm,
  ) => WorkspaceValidationErrors
}
export interface User {
  id: number
  name: string
  email: string
  companyId?: number
  roles: string[]
  permissions: string[]
  avatar?: string
}

export type UserStatus = 'active' | 'inactive' | 'locked'

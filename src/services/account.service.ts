import { API_ENDPOINTS } from './api/endpoints'
import { createEntityService } from './entity.service'
import type { AccountRecord } from '@/types/master'

export const accountService = createEntityService<AccountRecord>(API_ENDPOINTS.accounts)

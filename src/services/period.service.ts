import { API_ENDPOINTS } from './api/endpoints'
import { createEntityService } from './entity.service'
import type { AccountingPeriodRecord } from '@/types/master'

export const periodService = createEntityService<AccountingPeriodRecord>(
  API_ENDPOINTS.accountingPeriods,
)

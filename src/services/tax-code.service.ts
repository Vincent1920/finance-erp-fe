import { API_ENDPOINTS } from './api/endpoints'
import { createEntityService } from './entity.service'
import type { TaxCodeRecord } from '@/types/master'

export const taxCodeService = createEntityService<TaxCodeRecord>(API_ENDPOINTS.taxCodes)

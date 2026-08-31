import { API_ENDPOINTS } from './api/endpoints'
import { createEntityService } from './entity.service'
import type { CustomerRecord } from '@/types/master'

export const customerService = createEntityService<CustomerRecord>(API_ENDPOINTS.customers)

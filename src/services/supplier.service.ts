import { API_ENDPOINTS } from './api/endpoints'
import { createEntityService } from './entity.service'
import type { SupplierRecord } from '@/types/master'

export const supplierService = createEntityService<SupplierRecord>(API_ENDPOINTS.suppliers)

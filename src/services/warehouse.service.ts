import { API_ENDPOINTS } from './api/endpoints'
import { createEntityService } from './entity.service'
import type { WarehouseRecord } from '@/types/master'

export const warehouseService = createEntityService<WarehouseRecord>(API_ENDPOINTS.warehouses)

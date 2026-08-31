import { API_ENDPOINTS } from './api/endpoints'
import { createEntityService } from './entity.service'
import type { CostCenterRecord } from '@/types/master'

export const costCenterService = createEntityService<CostCenterRecord>(API_ENDPOINTS.costCenters)

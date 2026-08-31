import { API_ENDPOINTS } from './api/endpoints'
import { createEntityService } from './entity.service'
import type { UnitRecord } from '@/types/master'

export const unitService = createEntityService<UnitRecord>(API_ENDPOINTS.units)

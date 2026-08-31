import { API_ENDPOINTS } from './api/endpoints'
import { createEntityService } from './entity.service'
import type { ItemRecord } from '@/types/master'

export const itemService = createEntityService<ItemRecord>(API_ENDPOINTS.items)

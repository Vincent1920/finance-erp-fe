import { API_ENDPOINTS } from './api/endpoints'
import { createEntityService } from './entity.service'
import type { ProjectRecord } from '@/types/master'

export const projectService = createEntityService<ProjectRecord>(API_ENDPOINTS.projects)

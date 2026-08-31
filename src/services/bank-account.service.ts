import { API_ENDPOINTS } from './api/endpoints'
import { createEntityService } from './entity.service'
import type { BankAccountRecord } from '@/types/master'

export const bankAccountService = createEntityService<BankAccountRecord>(API_ENDPOINTS.bankAccounts)

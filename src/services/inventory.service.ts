import api from './api/client'
import { API_ENDPOINTS } from './api/endpoints'
import type { ListQuery, PaginatedResponse } from '@/types/api'

export interface StockOverviewRow {
  id: number
  item_id: number
  sku: string
  item_name: string
  item_type: string
  minimum_stock: string | number
  unit_code: string
  unit_symbol: string
  warehouse_id: number
  warehouse_code: string
  warehouse_name: string
  quantity: string | number
  average_cost: string | number
  inventory_value: string | number
  stock_status: 'available' | 'low_stock' | 'out_of_stock'
}

export interface StockQuery extends ListQuery {
  warehouse_id?: number
  item_id?: number
  status?: StockOverviewRow['stock_status']
}

export const inventoryService = {
  overview: async (params: StockQuery) =>
    (
      await api.get<PaginatedResponse<StockOverviewRow>>(API_ENDPOINTS.inventoryStock, {
        params,
      })
    ).data,
}

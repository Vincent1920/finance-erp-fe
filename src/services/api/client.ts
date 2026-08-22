import axios from 'axios'
import { registerInterceptors } from './interceptors'
const baseURL = import.meta.env.VITE_API_URL
if (!baseURL) throw new Error('VITE_API_URL belum dikonfigurasi')
export const apiClient = axios.create({
  baseURL,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  timeout: 15_000,
})
registerInterceptors(apiClient)
export default apiClient

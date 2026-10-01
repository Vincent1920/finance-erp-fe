import api from '@/services/api/client'
export const payrollService={
  async overview(period:string){return (await api.get('/payroll',{params:{period}})).data.data},
  async createEmployee(payload:any){return (await api.post('/payroll/employees',payload)).data.data},
  async updateEmployee(id:number,payload:any){return (await api.put(`/payroll/employees/${id}`,payload)).data.data},
  async createRun(payload:any){return (await api.post('/payroll/runs',payload)).data.data},
  async updateEntry(runId:number,entryId:number,payload:any){return (await api.put(`/payroll/runs/${runId}/entries/${entryId}`,payload)).data.data},
  async action(id:number,action:'calculate'|'approve'|'post'|'lock',payload:any={}){return (await api.post(`/payroll/runs/${id}/${action}`,payload)).data.data},
  async reopen(id:number,reason:string){return (await api.post(`/payroll/runs/${id}/reopen`,{reason})).data.data},
  async pay(id:number,payload:any){return (await api.post(`/payroll/runs/${id}/pay`,payload)).data.data},
  async savePolicy(payload:any){return (await api.put('/payroll/policy',payload)).data.data},
}

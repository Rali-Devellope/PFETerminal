import api from './axios'

export const getStatsGlobales = () => api.get('/stats/')
export const getDashboardCoordinateur = (anneeId) =>
  api.get('/stats/dashboard/coordinateur/', { params: anneeId ? { annee_id: anneeId } : {} })
export const getStatsFilieres = () => api.get('/stats/filieres/')
export const getStatsFiliere = (filiere) => api.get(`/stats/filiere/${filiere}/`)
export const getStatsEncadrant = (id) => api.get(`/stats/encadrant/${id}/`)
export const getClassement = (params) => api.get('/stats/classement/', { params })
export const exportCSV = () => api.get('/stats/export_csv/', { responseType: 'blob' })
export const exportExcel = () => api.get('/stats/export_excel/', { responseType: 'blob' })
export const exportPDF = () => api.get('/stats/export_pdf/', { responseType: 'blob' })

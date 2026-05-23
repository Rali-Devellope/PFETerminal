import api from './axios'

export const getMonPFE = () => api.get('/pfe/mon-pfe/')
export const getPFEs = (params) => api.get('/pfe/', { params })
export const getPFE = (id) => api.get(`/pfe/${id}/`)
export const getLivrables = (pfeId) => api.get(`/pfe/${pfeId}/livrables/`)
export const deposerLivrable = (pfeId, formData) =>
  api.post(`/pfe/${pfeId}/livrables/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const validerLivrable = (pfeId, livrableId) =>
  api.post(`/pfe/${pfeId}/livrables/${livrableId}/valider/`)
export const refuserLivrable = (pfeId, livrableId, data) =>
  api.post(`/pfe/${pfeId}/livrables/${livrableId}/refuser/`, data)

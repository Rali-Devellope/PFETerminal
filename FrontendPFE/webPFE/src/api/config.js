import api from './axios'

export const getFilieres      = (params = {}) => api.get('/config/filieres/', { params })
export const createFiliere    = (data)         => api.post('/config/filieres/', data)
export const updateFiliere    = (id, data)     => api.patch(`/config/filieres/${id}/`, data)
export const deleteFiliere    = (id)           => api.delete(`/config/filieres/${id}/`)

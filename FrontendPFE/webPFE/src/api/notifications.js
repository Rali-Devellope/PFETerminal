import api from './axios'

export const getNotifications = (params) => api.get('/notifications/', { params })
export const marquerLu = (id) => api.post(`/notifications/${id}/marquer-lu/`)
export const marquerTousLus = () => api.post('/notifications/marquer-tous-lus/')
export const getNonLues = () => api.get('/notifications/?lu=false')

import api from './axios'

export const getSujets = (params) => api.get('/sujets/', { params })
export const getSujet = (id) => api.get(`/sujets/${id}/`)
export const createSujet = (data) => api.post('/sujets/', data)
export const validerSujet = (id, data) => api.post(`/sujets/${id}/valider/`, data)
export const refuserSujet = (id, data) => api.post(`/sujets/${id}/refuser/`, data)

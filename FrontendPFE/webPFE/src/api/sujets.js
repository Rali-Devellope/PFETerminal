import api from './axios'

export const getSujets = (params) => api.get('/sujets/', { params })
export const getSujet = (id) => api.get(`/sujets/${id}/`)
export const createSujet = (data) => api.post('/sujets/', data)
export const validerSujet = (id, data) => api.post(`/sujets/${id}/valider/`, data)
export const refuserSujet = (id, data) => api.post(`/sujets/${id}/refuser/`, data)
export const choisirSujet = (id) => api.post(`/sujets/${id}/choisir/`)
export const affecterEncadrant = (id, data) => api.post(`/sujets/${id}/affecter/`, data)

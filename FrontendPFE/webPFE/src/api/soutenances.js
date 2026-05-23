import api from './axios'

export const getSoutenances = (params) => api.get('/soutenances/', { params })
export const getSoutenance = (id) => api.get(`/soutenances/${id}/`)
export const getMaSoutenance = () => api.get('/soutenances/ma-soutenance/')
export const planifierSoutenance = (data) => api.post('/soutenances/', data)
export const affecterJury = (id, data) => api.post(`/soutenances/${id}/affecter-jury/`, data)
export const soumettreNote = (id, data) => api.post(`/soutenances/${id}/soumettre-note/`, data)
export const calculerNoteFinale = (id) => api.post(`/soutenances/${id}/calculer-note-finale/`)

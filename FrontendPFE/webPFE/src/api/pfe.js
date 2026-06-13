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

export const getAllLivrables = (params) => api.get('/livrables/', { params })
export const validerLivrableById = (id, data = {}) => api.post(`/livrables/${id}/valider/`, data)
export const refuserLivrableById = (id, data) => api.post(`/livrables/${id}/refuser/`, data)
export const archiverPFE = (id) => api.post(`/pfe/${id}/archiver/`)
export const mettreAJourResume = (id, data) => api.patch(`/pfe/${id}/resume/`, data)

export const getAnneeActive = () => api.get('/annees/active/')
export const setDateLimiteSoutenance = (anneeId, date) =>
  api.patch(`/annees/${anneeId}/date-limite-soutenance/`, { date_limite_soutenance: date })

export const getDeadlines = (anneeId) => api.get(`/annees/${anneeId}/deadlines/`)
export const definirDeadline = (data) => api.post('/annees/definir-deadline/', data)
export const supprimerDeadline = (data) => api.post('/annees/supprimer-deadline/', data)
export const notifierDeadlines = (anneeId) => api.post(`/annees/${anneeId}/notifier-deadlines/`)
export const getStatsLivrables = (anneeId) => api.get(`/annees/${anneeId}/stats-livrables/`)

export const getAnnees = () => api.get('/annees/')
export const creerAnnee = (data) => api.post('/annees/creer/', data)
export const ouvrirAnnee = (id) => api.post(`/annees/${id}/ouvrir/`)
export const fermerAnnee = () => api.post('/annees/fermer/')

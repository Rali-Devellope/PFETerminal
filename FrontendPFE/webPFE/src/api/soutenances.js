import api from './axios'

export const getSoutenances = (params) => api.get('/soutenances/', { params })
export const getSoutenance = (id) => api.get(`/soutenances/${id}/`)
export const getMaSoutenance = () => api.get('/soutenances/ma-soutenance/')

export const planifierSoutenance  = (data)    => api.post('/soutenances/planifier/', data)
export const affecterJury         = (id, data) => api.post(`/soutenances/${id}/affecter_jury/`, data)
export const soumettreNote        = (id, data) => api.post(`/soutenances/${id}/noter/`, data)
export const calculerNoteFinale   = (id)       => api.post(`/soutenances/${id}/calculer_finale/`)
export const autoriserSoutenance  = (id)       => api.post(`/soutenances/${id}/autoriser/`)
export const reporterSoutenance   = (id)       => api.post(`/soutenances/${id}/reporter/`)
export const cloturerSession      = (data)     => api.post('/soutenances/cloturer-session/', data)

export const telechargerPV          = (id) => api.get(`/soutenances/${id}/pv_pdf/`,         { responseType: 'blob' })
export const telechargerReleve      = (id) => api.get(`/soutenances/${id}/releve_pdf/`,     { responseType: 'blob' })
export const telechargerAttestation = (id) => api.get(`/soutenances/${id}/attestation_pdf/`, { responseType: 'blob' })
export const telechargerConvocation = (id) => api.get(`/soutenances/${id}/convocation_pdf/`, { responseType: 'blob' })
export const telechargerPlanning    = ()   => api.get('/soutenances/planning_pdf/',          { responseType: 'blob' })

export const getFilieres       = ()        => api.get('/soutenances/filieres/')
export const getSessionPreview = (filiere) => api.get('/soutenances/session-preview/', { params: { filiere } })
export const planifierSession  = (data)    => api.post('/soutenances/planifier-session/', data)

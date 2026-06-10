import api from './axios'

export const getConversations = () => api.get('/messages/conversations/')
export const getMessagesAvec = (userId) => api.get(`/messages/avec/${userId}/`)
export const envoyerMessage = (data) => api.post('/messages/', data)
export const getNonLusCount = () => api.get('/messages/non-lus/')

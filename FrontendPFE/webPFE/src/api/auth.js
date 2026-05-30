import api from './axios'

export const login = (email, password) =>
  api.post('/auth/login/', { email, password })

export const logout = (refresh) =>
  api.post('/auth/logout/', { refresh })

export const changePassword = (data) =>
  api.put('/auth/me/password/', data)

export const getProfile = () =>
  api.get('/auth/me/')

export const getUsers = () => api.get('/auth/users/list/')
export const createUser = (data) => api.post('/auth/users/', data)

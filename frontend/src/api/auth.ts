import { apiFetch, setStoredToken } from './client'
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../types/api'

const REGISTRATION_API_KEY = import.meta.env.VITE_REGISTRATION_API_KEY ?? ''

export function getMe(): Promise<User> {
  return apiFetch<User>('/auth/me')
}

export function login(data: LoginRequest): Promise<User> {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  }).then((response) => {
    setStoredToken(response.token)
    return response.user
  })
}

export function register(data: RegisterRequest): Promise<User> {
  const headers: Record<string, string> = {}
  if (REGISTRATION_API_KEY) {
    headers['X-API-Key'] = REGISTRATION_API_KEY
  }

  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  }).then((response) => {
    setStoredToken(response.token)
    return response.user
  })
}

export function logout(): Promise<void> {
  return apiFetch<void>('/auth/logout', { method: 'POST' }).finally(() => {
    setStoredToken(null)
  })
}

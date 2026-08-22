import { apiFetch, getStoredApiKey } from './client'
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../types/api'

export function getMe(): Promise<User> {
  return apiFetch<User>('/auth/me')
}

export function login(data: LoginRequest): Promise<User> {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  }).then((r) => r.user)
}

export function register(data: RegisterRequest): Promise<User> {
  const apiKey = getStoredApiKey()
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    headers: apiKey ? { 'X-API-Key': apiKey } : undefined,
    body: JSON.stringify(data),
  }).then((r) => r.user)
}

export function logout(): Promise<void> {
  return apiFetch<void>('/auth/logout', { method: 'POST' })
}

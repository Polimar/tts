import { apiFetch } from './client'
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../types/api'

export function getMe(): Promise<User> {
  return apiFetch<AuthResponse>('/auth/me').then((r) => r.user)
}

export function login(data: LoginRequest): Promise<User> {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  }).then((r) => r.user)
}

export function register(data: RegisterRequest): Promise<User> {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }).then((r) => r.user)
}

export function logout(): Promise<void> {
  return apiFetch<void>('/auth/logout', { method: 'POST' })
}

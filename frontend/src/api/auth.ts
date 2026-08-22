import { apiFetch } from './client'
import type { LoginRequest, RegisterRequest, User } from '../types/api'

export function getMe(): Promise<User> {
  return apiFetch<User>('/auth/me')
}

export function login(data: LoginRequest): Promise<User> {
  return apiFetch<User>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function register(data: RegisterRequest): Promise<User> {
  return apiFetch<User>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function logout(): Promise<void> {
  return apiFetch<void>('/auth/logout', { method: 'POST' })
}

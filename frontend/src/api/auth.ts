import { apiFetch } from './client'
import { setToken } from './token'
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../types/api'

export function getMe(): Promise<User> {
  return apiFetch<User>('/auth/me')
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  setToken(response.token)
  return response
}

export async function register(
  data: RegisterRequest,
  apiKey: string,
): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    headers: { 'X-API-Key': apiKey },
    body: JSON.stringify(data),
  })
  setToken(response.token)
  return response
}

export async function logout(): Promise<void> {
  try {
    await apiFetch<void>('/auth/logout', { method: 'POST' })
  } finally {
    setToken(null)
  }
}

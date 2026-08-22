import type { ApiError } from '../types/api'
import { getToken } from './token'

export class HttpError extends Error {
  readonly status: number

  constructor(status: number, body: ApiError) {
    super(body.detail)
    this.name = 'HttpError'
    this.status = status
  }
}

function detailFromBody(body: unknown): string {
  if (!body || typeof body !== 'object') {
    return 'Si è verificato un errore imprevisto.'
  }
  const record = body as Record<string, unknown>
  if (typeof record.detail === 'string') return record.detail
  if (Array.isArray(record.detail)) {
    return record.detail
      .map((item) => {
        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg: unknown }).msg)
        }
        return String(item)
      })
      .join('; ')
  }
  return 'Si è verificato un errore imprevisto.'
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const body = await response.json()
    return { detail: detailFromBody(body) }
  } catch {
    return {
      detail: `Richiesta fallita (${response.status}).`,
    }
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(path, {
    ...init,
    headers,
  })

  if (!response.ok) {
    throw new HttpError(response.status, await parseError(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export function jobWavUrl(jobId: string): string {
  return `/jobs/${jobId}/download/wav`
}

export async function fetchAuthenticatedBlob(path: string): Promise<Blob> {
  const token = getToken()
  const response = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    throw new HttpError(response.status, await parseError(response))
  }
  return response.blob()
}

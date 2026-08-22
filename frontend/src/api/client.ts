import type { ApiError } from '../types/api'

const TOKEN_KEY = 'tts_token'

export class HttpError extends Error {
  readonly status: number

  constructor(status: number, body: ApiError) {
    super(body.detail)
    this.name = 'HttpError'
    this.status = status
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
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

function authHeaders(): Record<string, string> {
  const token = getStoredToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...authHeaders(),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw new HttpError(response.status, await parseError(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export async function apiFetchBlob(path: string, init?: RequestInit): Promise<Blob> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...authHeaders(),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw new HttpError(response.status, await parseError(response))
  }

  return response.blob()
}

export function jobDownloadPath(jobId: string, format: 'wav' | 'mp3'): string {
  return `/jobs/${jobId}/download/${format}`
}

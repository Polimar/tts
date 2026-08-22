import type { ApiError } from '../types/api'

const API_PREFIX = '/api/v1'

export class HttpError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, body: ApiError) {
    super(body.detail)
    this.name = 'HttpError'
    this.status = status
    this.code = body.code
  }
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as Partial<ApiError>
    return {
      code: body.code ?? 'errore_sconosciuto',
      detail: body.detail ?? 'Si è verificato un errore imprevisto.',
    }
  } catch {
    return {
      code: 'errore_rete',
      detail: `Richiesta fallita (${response.status}).`,
    }
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_PREFIX}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
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

export function audioUrl(jobId: string): string {
  return `${API_PREFIX}/jobs/${jobId}/audio`
}

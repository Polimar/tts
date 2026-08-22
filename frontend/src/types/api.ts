export interface ApiError {
  detail: string
}

export interface User {
  id: string
  username: string
  created_at: string
}

export interface AuthResponse {
  token: string
  expires_at: string
  user: User
}

export interface Voice {
  id: string
  name: string
  ref_text: string
  language: string
  created_at: string
}

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface Job {
  id: string
  voice_id: string
  status: JobStatus
  language: string
  text: string
  chunk_count: number
  error?: string | null
  wav_available: boolean
  mp3_available: boolean
  device_used?: string | null
  created_at: string
  started_at?: string | null
  completed_at?: string | null
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
}

export interface CreateJobRequest {
  voice_id: string
  text: string
  language?: string
}

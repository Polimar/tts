export interface ApiError {
  code: string
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
  ref_text?: string
  language?: string
  created_at: string
}

export interface VoiceListResponse {
  items: Voice[]
  total: number
}

export type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled' | 'completed'

export type SourceType = 'text' | 'chapter'

export interface Job {
  id: string
  voice_id: string
  status: JobStatus
  source_type: SourceType
  title?: string | null
  progress: number
  queue_position?: number | null
  error_code?: string | null
  error_detail?: string | null
  created_at: string
  started_at?: string | null
  finished_at?: string | null
}

export interface JobDetail extends Job {
  audio_ready?: boolean
}

export interface JobListResponse {
  items: Job[]
  total: number
  limit: number
  offset: number
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
  source_type?: SourceType
  title?: string
}

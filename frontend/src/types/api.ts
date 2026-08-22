export interface ApiError {
  code: string
  detail: string
}

export interface User {
  id: string
  email: string
  created_at: string
}

export interface AuthResponse {
  user: User
}

export interface Voice {
  id: string
  name: string
  duration_sec?: number | null
  created_at: string
}

export interface VoiceListResponse {
  items: Voice[]
  total: number
}

export type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled'

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

export interface JobCancelled {
  id: string
  status: 'cancelled'
  queue_position: null
  finished_at: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
}

export interface CreateJobRequest {
  voice_id: string
  source_type: SourceType
  text?: string
  chapter_id?: string
  title?: string
}

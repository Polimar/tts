export interface ApiError {
  code: string
  detail: string
}

export interface User {
  id: string
  email: string
}

export type VoiceStatus = 'ready' | 'processing' | 'error'

export interface Voice {
  id: string
  name: string
  status: VoiceStatus
  created_at: string
  sample_duration_sec?: number | null
}

export type JobStatus = 'queued' | 'running' | 'done' | 'failed'

export type JobType = 'text' | 'book'

export interface Job {
  id: string
  status: JobStatus
  text: string
  voice_id: string
  voice_name?: string | null
  job_type: JobType
  created_at: string
  progress?: number | null
  error?: string | null
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
  text: string
  voice_id: string
  job_type?: JobType
}

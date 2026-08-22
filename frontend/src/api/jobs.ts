import { apiFetch } from './client'
import type {
  CreateJobRequest,
  Job,
  JobDetail,
  JobListResponse,
  JobStatus,
} from '../types/api'

interface BackendJob {
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

function mapStatus(status: JobStatus): JobStatus {
  return status === 'completed' ? 'done' : status
}

function mapJob(row: BackendJob): JobDetail {
  const status = mapStatus(row.status)
  const progress =
    status === 'done' ? 1 : status === 'running' ? 0.5 : status === 'failed' ? 0 : 0
  return {
    id: row.id,
    voice_id: row.voice_id,
    status,
    source_type: 'text',
    title: null,
    progress,
    queue_position: status === 'queued' ? 1 : null,
    error_code: row.error ? 'synthesis_failed' : null,
    error_detail: row.error ?? null,
    created_at: row.created_at,
    started_at: row.started_at ?? null,
    finished_at: row.completed_at ?? null,
    audio_ready: row.wav_available,
  }
}

export interface ListJobsParams {
  status?: JobStatus
  limit?: number
  offset?: number
}

export function listJobs(params: ListJobsParams = {}): Promise<JobListResponse> {
  return apiFetch<BackendJob[]>('/jobs').then((rows) => {
    let items = rows.map(mapJob)
    if (params.status) {
      items = items.filter((j) => j.status === params.status)
    }
    const offset = params.offset ?? 0
    const limit = params.limit ?? items.length
    const slice = items.slice(offset, offset + limit)
    return {
      items: slice,
      total: items.length,
      limit,
      offset,
    }
  })
}

export function getJob(id: string): Promise<JobDetail> {
  return apiFetch<BackendJob>(`/jobs/${id}`).then(mapJob)
}

export function createJob(data: CreateJobRequest): Promise<Job> {
  return apiFetch<BackendJob>('/jobs', {
    method: 'POST',
    body: JSON.stringify({
      voice_id: data.voice_id,
      text: data.text,
      language: data.language ?? 'Italian',
    }),
  }).then(mapJob)
}

export async function cancelJob(_id: string): Promise<void> {
  throw new Error('Annullamento job non supportato in questa versione.')
}

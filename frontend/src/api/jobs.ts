import { apiFetch } from './client'
import type { CreateJobRequest, Job, JobDetail, JobStatus } from '../types/api'

export function listJobs(): Promise<Job[]> {
  return apiFetch<Job[]>('/jobs')
}

export function getJob(id: string): Promise<JobDetail> {
  return apiFetch<JobDetail>(`/jobs/${id}`)
}

export function createJob(data: CreateJobRequest): Promise<Job> {
  return apiFetch<Job>('/jobs', {
    method: 'POST',
    body: JSON.stringify({
      voice_id: data.voice_id,
      text: data.text,
      ...(data.language ? { language: data.language } : {}),
    }),
  })
}

export function isTerminalJobStatus(status: JobStatus): boolean {
  switch (status) {
    case 'completed':
    case 'failed':
      return true
    case 'queued':
    case 'running':
      return false
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

export function isActiveJobStatus(status: JobStatus): boolean {
  return status === 'queued' || status === 'running'
}

export function canPlayJobAudio(job: Job): boolean {
  return job.status === 'completed'
}

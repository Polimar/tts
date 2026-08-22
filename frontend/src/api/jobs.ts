import { apiFetch } from './client'
import type { CreateJobRequest, Job, JobDetail } from '../types/api'

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
      language: data.language ?? 'Italian',
    }),
  })
}

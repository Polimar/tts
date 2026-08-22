import { apiFetch } from './client'
import type { CreateJobRequest, Job } from '../types/api'

export function listJobs(): Promise<Job[]> {
  return apiFetch<Job[]>('/jobs')
}

export function getJob(id: string): Promise<Job> {
  return apiFetch<Job>(`/jobs/${id}`)
}

export function createJob(data: CreateJobRequest): Promise<Job> {
  return apiFetch<Job>('/jobs', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

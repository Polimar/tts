import { apiFetch } from './client'
import type {
  CreateJobRequest,
  Job,
  JobCancelled,
  JobDetail,
  JobListResponse,
  JobStatus,
} from '../types/api'

export interface ListJobsParams {
  status?: JobStatus
  limit?: number
  offset?: number
}

export function listJobs(params: ListJobsParams = {}): Promise<JobListResponse> {
  const search = new URLSearchParams()
  if (params.status) search.set('status', params.status)
  if (params.limit != null) search.set('limit', String(params.limit))
  if (params.offset != null) search.set('offset', String(params.offset))
  const qs = search.toString()
  return apiFetch<JobListResponse>(`/jobs${qs ? `?${qs}` : ''}`)
}

export function getJob(id: string): Promise<JobDetail> {
  return apiFetch<JobDetail>(`/jobs/${id}`)
}

export function createJob(data: CreateJobRequest): Promise<Job> {
  return apiFetch<Job>('/jobs', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function cancelJob(id: string): Promise<JobCancelled> {
  return apiFetch<JobCancelled>(`/jobs/${id}/cancel`, { method: 'POST' })
}

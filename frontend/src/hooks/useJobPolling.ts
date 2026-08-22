import { useCallback, useEffect, useRef, useState } from 'react'
import { getJob } from '../api/jobs'
import type { JobDetail, JobStatus } from '../types/api'

export type { JobDetail as Job }

const TERMINAL: JobStatus[] = ['done', 'failed', 'cancelled']
const DEFAULT_INTERVAL_MS = 3000

export interface UseJobPollingOptions {
  enabled?: boolean
  intervalMs?: number
  onUpdate?: (job: JobDetail) => void
}

/**
 * Hook di polling per la coda job.
 * Extension point per Game Dev Web: sostituire con SSE/WebSocket quando disponibile.
 */
export function useJobPolling(
  jobId: string | null,
  options: UseJobPollingOptions = {},
) {
  const { enabled = true, intervalMs = DEFAULT_INTERVAL_MS, onUpdate } = options
  const [job, setJob] = useState<JobDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  const fetchJob = useCallback(async () => {
    if (!jobId) return null
    setLoading(true)
    setError(null)
    try {
      const data = await getJob(jobId)
      setJob(data)
      onUpdateRef.current?.(data)
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore nel caricamento del job.'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    if (!jobId || !enabled) {
      setJob(null)
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setInterval> | undefined

    const poll = async () => {
      const data = await getJob(jobId)
      if (cancelled) return
      setJob(data)
      onUpdateRef.current?.(data)
      if (TERMINAL.includes(data.status)) {
        if (timer) clearInterval(timer)
      }
    }

    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getJob(jobId)
        if (cancelled) return
        setJob(data)
        onUpdateRef.current?.(data)
        if (!TERMINAL.includes(data.status)) {
          timer = setInterval(() => void poll(), intervalMs)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Errore nel caricamento del job.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [jobId, enabled, intervalMs])

  return { job, loading, error, refetch: fetchJob }
}

/**
 * Polling per lista job attivi (queued + running).
 * Extension point GDW: centralizzare qui l'aggiornamento della coda.
 */
export function useActiveJobsPolling(
  jobs: { status: JobStatus }[],
  onRefresh: () => void,
  intervalMs = DEFAULT_INTERVAL_MS,
) {
  const hasActive = jobs.some((j) => j.status === 'queued' || j.status === 'running')

  useEffect(() => {
    if (!hasActive) return
    const timer = setInterval(onRefresh, intervalMs)
    return () => clearInterval(timer)
  }, [hasActive, onRefresh, intervalMs])
}

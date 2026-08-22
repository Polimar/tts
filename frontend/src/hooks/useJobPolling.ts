import { useCallback, useEffect, useRef, useState } from 'react'
import { getJob } from '../api/jobs'
import type { JobDetail, JobStatus } from '../types/api'

export type { JobDetail as Job }

const TERMINAL: JobStatus[] = ['completed', 'failed']
const MIN_POLL_MS = 1500
const MAX_POLL_MS = 3000
const DEFAULT_INTERVAL_MS = MAX_POLL_MS

export interface UseJobPollingOptions {
  enabled?: boolean
  intervalMs?: number
  onUpdate?: (job: JobDetail) => void
}

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
    let timer: ReturnType<typeof setTimeout> | undefined
    let delay = MIN_POLL_MS

    const schedule = () => {
      timer = setTimeout(() => void poll(), delay)
      delay = Math.min(Math.round(delay * 1.15), intervalMs)
    }

    const poll = async () => {
      try {
        const data = await getJob(jobId)
        if (cancelled) return
        setJob(data)
        onUpdateRef.current?.(data)
        if (!TERMINAL.includes(data.status)) {
          schedule()
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Errore nel caricamento del job.')
          schedule()
        }
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
          delay = MIN_POLL_MS
          schedule()
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
      if (timer) clearTimeout(timer)
    }
  }, [jobId, enabled, intervalMs])

  return { job, loading, error, refetch: fetchJob }
}

export function useActiveJobsPolling(
  jobs: { status: JobStatus }[],
  onRefresh: () => void,
) {
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh
  const hasActive = jobs.some((j) => j.status === 'queued' || j.status === 'running')

  useEffect(() => {
    if (!hasActive) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let delay = MIN_POLL_MS

    const tick = () => {
      onRefreshRef.current()
      if (cancelled) return
      timer = setTimeout(tick, delay)
      delay = Math.min(Math.round(delay * 1.15), MAX_POLL_MS)
    }

    timer = setTimeout(tick, delay)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [hasActive])
}

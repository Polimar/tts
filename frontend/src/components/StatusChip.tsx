import type { JobStatus } from '../types/api'

const JOB_LABELS: Record<JobStatus, string> = {
  queued: 'In coda',
  running: 'In elaborazione',
  completed: 'Completato',
  failed: 'Errore',
}

interface StatusChipProps {
  status: JobStatus
}

export function StatusChip({ status }: StatusChipProps) {
  return <span className={`chip chip--${status}`}>{JOB_LABELS[status]}</span>
}

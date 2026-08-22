import type { JobStatus } from '../types/api'

const JOB_LABELS: Record<JobStatus, string> = {
  queued: 'In coda',
  running: 'In elaborazione',
  done: 'Completato',
  failed: 'Errore',
  cancelled: 'Annullato',
}

interface StatusChipProps {
  status: JobStatus
}

export function StatusChip({ status }: StatusChipProps) {
  return <span className={`chip chip--${status}`}>{JOB_LABELS[status]}</span>
}

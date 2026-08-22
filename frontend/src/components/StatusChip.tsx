import type { JobStatus, VoiceStatus } from '../types/api'

const JOB_LABELS: Record<JobStatus, string> = {
  queued: 'In coda',
  running: 'In elaborazione',
  done: 'Completato',
  failed: 'Errore',
}

const VOICE_LABELS: Record<VoiceStatus, string> = {
  ready: 'Pronta',
  processing: 'In elaborazione',
  error: 'Errore',
}

interface StatusChipProps {
  status: JobStatus | VoiceStatus
  kind?: 'job' | 'voice'
}

export function StatusChip({ status, kind = 'job' }: StatusChipProps) {
  const label = kind === 'voice'
    ? VOICE_LABELS[status as VoiceStatus] ?? status
    : JOB_LABELS[status as JobStatus] ?? status

  return <span className={`chip chip--${status}`}>{label}</span>
}

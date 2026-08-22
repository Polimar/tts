import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { cancelJob } from '../api/jobs'
import { audioUrl } from '../api/client'
import { listVoices } from '../api/voices'
import { AudioPlayer } from '../components/AudioPlayer'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { StatusChip } from '../components/StatusChip'
import { useToast } from '../components/ToastProvider'
import { useJobPolling } from '../hooks/useJobPolling'
import type { SourceType } from '../types/api'
import { formatDateTime, formatProgressPercent } from '../utils/format'

const SOURCE_LABELS: Record<SourceType, string> = {
  text: 'Testo',
  chapter: 'Capitolo',
}

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const { job, loading, error, refetch } = useJobPolling(jobId ?? null)
  const { showToast } = useToast()
  const [showCancel, setShowCancel] = useState(false)
  const [voiceName, setVoiceName] = useState<string | null>(null)

  useEffect(() => {
    if (!job) return
    void listVoices().then(({ items }) => {
      const v = items.find((x) => x.id === job.voice_id)
      if (v) setVoiceName(v.name)
    })
  }, [job?.voice_id])

  const handleCancel = async () => {
    if (!job) return
    try {
      await cancelJob(job.id)
      showToast('Job annullato.', 'success')
      setShowCancel(false)
      await refetch()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Annullamento fallito.', 'error')
    }
  }

  if (loading && !job) {
    return (
      <div className="page">
        <div className="skeleton-block skeleton-block--tall" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <div className="alert alert--error" role="alert">
          {error}
        </div>
        <Link to="/coda" className="btn btn--secondary">
          Torna alla coda
        </Link>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="page">
        <div className="empty-state">
          <h2>Job non trovato</h2>
          <Link to="/coda" className="btn btn--secondary">
            Torna alla coda
          </Link>
        </div>
      </div>
    )
  }

  const canPlay = job.status === 'done' && job.audio_ready === true
  const audioSrc = canPlay ? audioUrl(job.id) : ''
  const pct = formatProgressPercent(job.progress)

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="breadcrumb">
            <Link to="/coda">Coda</Link> / Dettaglio job
          </p>
          <h1 className="page-header__title">
            {job.title ?? `Job ${job.id.slice(0, 8)}`}
          </h1>
        </div>
        <div className="page-header__actions">
          <StatusChip status={job.status} />
          {job.status === 'queued' && (
            <button type="button" className="btn btn--danger btn--sm" onClick={() => setShowCancel(true)}>
              Annulla
            </button>
          )}
        </div>
      </header>

      <dl className="detail-meta">
        <div>
          <dt>Tipo</dt>
          <dd>{SOURCE_LABELS[job.source_type] ?? job.source_type}</dd>
        </div>
        <div>
          <dt>Voce</dt>
          <dd>{voiceName ?? job.voice_id}</dd>
        </div>
        <div>
          <dt>Creato</dt>
          <dd>{formatDateTime(job.created_at)}</dd>
        </div>
        {job.started_at && (
          <div>
            <dt>Avviato</dt>
            <dd>{formatDateTime(job.started_at)}</dd>
          </div>
        )}
        {job.finished_at && (
          <div>
            <dt>Terminato</dt>
            <dd>{formatDateTime(job.finished_at)}</dd>
          </div>
        )}
        {job.status === 'queued' && job.queue_position != null && (
          <div>
            <dt>Posizione coda</dt>
            <dd>{job.queue_position}</dd>
          </div>
        )}
        {job.status === 'running' && (
          <div>
            <dt>Progresso</dt>
            <dd>
              <div className="progress-bar progress-bar--inline">
                <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
                <span className="progress-bar__label">{pct}%</span>
              </div>
            </dd>
          </div>
        )}
      </dl>

      {job.status === 'failed' && (
        <div className="alert alert--error" role="alert">
          {job.error_detail ?? 'Il job è terminato con un errore.'}
        </div>
      )}

      {job.status === 'queued' && (
        <div className="alert alert--info" role="status">
          Il job è in coda
          {job.queue_position != null ? ` (posizione ${job.queue_position})` : ''}.
          Verrà elaborato a breve.
        </div>
      )}

      {job.status === 'running' && (
        <div className="alert alert--info" role="status">
          Sintesi in corso ({pct}%)… La pagina si aggiorna automaticamente.
        </div>
      )}

      {job.status === 'cancelled' && (
        <div className="alert alert--info" role="status">
          Job annullato.
        </div>
      )}

      {canPlay && (
        <section className="detail-player">
          <h2>Riproduzione</h2>
          <AudioPlayer src={audioSrc} />
          <div className="detail-player__download">
            <a href={audioSrc} download={`${job.title ?? job.id}.wav`} className="btn btn--secondary">
              Scarica WAV
            </a>
          </div>
        </section>
      )}

      {job.status === 'done' && !job.audio_ready && (
        <div className="alert alert--error" role="alert">
          L'audio non è ancora disponibile.
        </div>
      )}

      <ConfirmDialog
        open={showCancel}
        title="Annulla job"
        message="Sei sicuro di voler annullare questo job in coda?"
        confirmLabel="Annulla job"
        destructive
        onConfirm={() => void handleCancel()}
        onCancel={() => setShowCancel(false)}
      />
    </div>
  )
}

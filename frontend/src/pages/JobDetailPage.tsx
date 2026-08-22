import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listVoices } from '../api/voices'
import { AudioPlayer } from '../components/AudioPlayer'
import { WaveformSlot } from '../components/audio/WaveformSlot'
import { StatusChip } from '../components/StatusChip'
import { useToast } from '../components/ToastProvider'
import { downloadJobAudio, useAuthenticatedAudio } from '../hooks/useAuthenticatedAudio'
import { useJobPolling } from '../hooks/useJobPolling'
import { formatDateTime } from '../utils/format'

function jobTitle(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length <= 60) return trimmed
  return `${trimmed.slice(0, 60)}…`
}

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const { job, loading, error } = useJobPolling(jobId ?? null)
  const { showToast } = useToast()
  const [voiceName, setVoiceName] = useState<string | null>(null)
  const canPlay = job?.status === 'completed' && job.wav_available
  const { url: audioSrc, loading: audioLoading } = useAuthenticatedAudio(
    canPlay ? job.id : null,
    'wav',
  )

  useEffect(() => {
    if (!job) return
    void listVoices().then((items) => {
      const v = items.find((x) => x.id === job.voice_id)
      if (v) setVoiceName(v.name)
    })
  }, [job?.voice_id])

  const handleDownload = async (format: 'wav' | 'mp3') => {
    if (!job) return
    try {
      const ext = format
      const filename = `${job.id.slice(0, 8)}.${ext}`
      await downloadJobAudio(job.id, format, filename)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Download fallito.', 'error')
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

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="breadcrumb">
            <Link to="/coda">Coda</Link> / Dettaglio job
          </p>
          <h1 className="page-header__title">{jobTitle(job.text)}</h1>
        </div>
        <div className="page-header__actions">
          <StatusChip status={job.status} />
        </div>
      </header>

      <dl className="detail-meta">
        <div>
          <dt>Voce</dt>
          <dd>{voiceName ?? job.voice_id}</dd>
        </div>
        <div>
          <dt>Lingua</dt>
          <dd>{job.language}</dd>
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
        {job.completed_at && (
          <div>
            <dt>Completato</dt>
            <dd>{formatDateTime(job.completed_at)}</dd>
          </div>
        )}
        {job.chunk_count > 0 && (
          <div>
            <dt>Chunk</dt>
            <dd>{job.chunk_count}</dd>
          </div>
        )}
        {job.device_used && (
          <div>
            <dt>Device</dt>
            <dd>{job.device_used}</dd>
          </div>
        )}
      </dl>

      <section className="detail-text">
        <h2>Testo</h2>
        <p className="detail-text__body">{job.text}</p>
      </section>

      {job.status === 'failed' && (
        <div className="alert alert--error" role="alert">
          {job.error ?? 'Il job è terminato con un errore.'}
        </div>
      )}

      {job.status === 'queued' && (
        <div className="alert alert--info" role="status">
          Il job è in coda e verrà elaborato a breve.
        </div>
      )}

      {job.status === 'running' && (
        <div className="alert alert--info" role="status">
          Sintesi in corso… La pagina si aggiorna automaticamente.
        </div>
      )}

      {canPlay && (
        <section className="detail-player">
          <h2>Riproduzione</h2>
          {audioLoading || !audioSrc ? (
            <p className="text-muted">Caricamento audio…</p>
          ) : (
            <AudioPlayer
              src={audioSrc}
              waveformSlot={(ctx) => (
                <WaveformSlot jobId={job.id} {...ctx} />
              )}
            />
          )}
          <div className="detail-player__download">
            {job.wav_available && (
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => void handleDownload('wav')}
              >
                Scarica WAV
              </button>
            )}
            {job.mp3_available && (
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => void handleDownload('mp3')}
              >
                Scarica MP3
              </button>
            )}
          </div>
        </section>
      )}

      {job.status === 'completed' && !job.wav_available && (
        <div className="alert alert--error" role="alert">
          L'audio non è ancora disponibile.
        </div>
      )}
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchAuthenticatedBlob, jobWavUrl } from '../api/client'
import { listVoices } from '../api/voices'
import { AudioPlayer } from '../components/AudioPlayer'
import { StatusChip } from '../components/StatusChip'
import { useJobPolling } from '../hooks/useJobPolling'
import { formatDateTime } from '../utils/format'

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const { job, loading, error } = useJobPolling(jobId ?? null)
  const [voiceName, setVoiceName] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!job) return
    void listVoices().then((voices) => {
      const v = voices.find((x) => x.id === job.voice_id)
      if (v) setVoiceName(v.name)
    })
  }, [job?.voice_id])

  const fetchWav = useCallback(
    () => fetchAuthenticatedBlob(jobWavUrl(job!.id)),
    [job?.id],
  )

  const handleDownload = async () => {
    if (!job) return
    setDownloading(true)
    try {
      const blob = await fetchAuthenticatedBlob(jobWavUrl(job.id))
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `job-${job.id}.wav`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    } finally {
      setDownloading(false)
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

  const canPlay = job.status === 'completed' && job.wav_available

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="breadcrumb">
            <Link to="/coda">Coda</Link> / Dettaglio job
          </p>
          <h1 className="page-header__title">Job {job.id.slice(0, 8)}</h1>
        </div>
        <StatusChip status={job.status} />
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
          <dt>Chunk</dt>
          <dd>{job.chunk_count}</dd>
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
        {job.device_used && (
          <div>
            <dt>Device</dt>
            <dd>{job.device_used}</dd>
          </div>
        )}
      </dl>

      {job.status === 'failed' && (
        <div className="alert alert--error" role="alert">
          {job.error ?? 'Il job è terminato con un errore.'}
        </div>
      )}

      {job.status === 'queued' && (
        <div className="alert alert--info" role="status">
          Il job è in coda. Verrà elaborato a breve (un job alla volta).
        </div>
      )}

      {job.status === 'running' && (
        <div className="alert alert--info" role="status">
          Sintesi in corso… La pagina si aggiorna automaticamente.
        </div>
      )}

      <section className="detail-text">
        <h2>Testo</h2>
        <pre className="detail-text__content">{job.text}</pre>
      </section>

      {canPlay && (
        <section className="detail-player">
          <h2>Riproduzione</h2>
          <AudioPlayer fetchAudio={fetchWav} />
          <div className="detail-player__download">
            <button
              type="button"
              className="btn btn--secondary"
              disabled={downloading}
              onClick={() => void handleDownload()}
            >
              {downloading ? 'Download…' : 'Scarica WAV'}
            </button>
            {job.mp3_available && (
              <button
                type="button"
                className="btn btn--secondary"
                disabled={downloading}
                onClick={() => void fetchAuthenticatedBlob(`/jobs/${job.id}/download/mp3`).then((blob) => {
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `job-${job.id}.mp3`
                  a.click()
                  URL.revokeObjectURL(url)
                })}
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

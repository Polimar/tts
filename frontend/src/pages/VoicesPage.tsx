import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { createVoice, deleteVoice, listVoices } from '../api/voices'
import { HttpError } from '../api/client'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useToast } from '../components/ToastProvider'
import type { Voice } from '../types/api'
import { formatDate, formatDuration } from '../utils/format'

const ACCEPTED_AUDIO = 'audio/wav,audio/mpeg,audio/mp4,audio/x-m4a,.wav,.mp3,.mp4,.m4a'

export function VoicesPage() {
  const { showToast } = useToast()
  const [voices, setVoices] = useState<Voice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Voice | null>(null)

  const loadVoices = useCallback(async () => {
    setError(null)
    try {
      const { items } = await listVoices()
      setVoices(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile caricare le voci.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadVoices()
  }, [loadVoices])

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault()
    if (!file || !name.trim()) return
    setUploading(true)
    try {
      await createVoice(name.trim(), file)
      showToast('Voce creata con successo.', 'success')
      setShowUpload(false)
      setName('')
      setFile(null)
      await loadVoices()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Caricamento fallito.', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteVoice(deleteTarget.id)
      showToast('Voce eliminata.', 'success')
      setDeleteTarget(null)
      await loadVoices()
    } catch (err) {
      if (err instanceof HttpError && err.code === 'voice_in_use') {
        showToast(err.message, 'error')
      } else {
        showToast(err instanceof Error ? err.message : 'Eliminazione fallita.', 'error')
      }
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-header__title">Libreria voci</h1>
          <p className="page-header__desc">Gestisci le tue voci clonate private.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setShowUpload(true)}>
          Nuova voce
        </button>
      </header>

      {loading && (
        <div className="skeleton-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      )}

      {error && (
        <div className="alert alert--error" role="alert">
          {error}
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => void loadVoices()}>
            Riprova
          </button>
        </div>
      )}

      {!loading && !error && voices.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__illustration" aria-hidden />
          <h2>Nessuna voce ancora</h2>
          <p>Carica un campione audio per creare la tua prima voce clonata.</p>
          <button type="button" className="btn btn--primary" onClick={() => setShowUpload(true)}>
            Nuova voce
          </button>
        </div>
      )}

      {!loading && voices.length > 0 && (
        <div className="voice-grid">
          {voices.map((voice) => (
            <article key={voice.id} className="voice-card">
              <div className="voice-card__header">
                <h3 className="voice-card__name">{voice.name}</h3>
              </div>
              <dl className="voice-card__meta">
                <div>
                  <dt>Durata campione</dt>
                  <dd>{formatDuration(voice.duration_sec)}</dd>
                </div>
                <div>
                  <dt>Creata</dt>
                  <dd>{formatDate(voice.created_at)}</dd>
                </div>
              </dl>
              <div className="voice-card__actions">
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  onClick={() => setDeleteTarget(voice)}
                >
                  Elimina
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {showUpload && (
        <div className="dialog-overlay" role="presentation" onClick={() => setShowUpload(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h2 className="dialog__title">Nuova voce</h2>
            <form onSubmit={(e) => void handleUpload(e)}>
              <label className="field">
                <span className="field__label">Nome voce</span>
                <input
                  className="field__input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                  placeholder="Es. Narratore"
                />
              </label>
              <label className="field">
                <span className="field__label">Campione audio (reference_audio)</span>
                <input
                  type="file"
                  accept={ACCEPTED_AUDIO}
                  className="field__input"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  required
                />
                <span className="field__hint">
                  WAV, MP3, MP4 o M4A. Max 20 MB. Durata consigliata: 3–60 secondi.
                </span>
              </label>
              <div className="dialog__actions">
                <button type="button" className="btn btn--secondary" onClick={() => setShowUpload(false)}>
                  Annulla
                </button>
                <button type="submit" className="btn btn--primary" disabled={uploading || !file}>
                  {uploading ? 'Caricamento…' : 'Carica voce'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Elimina voce"
        message={`Sei sicuro di voler eliminare «${deleteTarget?.name}»? L'operazione non è reversibile.`}
        confirmLabel="Elimina"
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

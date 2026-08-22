import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createJob } from '../api/jobs'
import { listVoices } from '../api/voices'
import { HttpError } from '../api/client'
import { useToast } from '../components/ToastProvider'
import type { Voice } from '../types/api'

type EditorMode = 'text' | 'book'

export function NewJobPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [voices, setVoices] = useState<Voice[]>([])
  const [loading, setLoading] = useState(true)
  const [voiceId, setVoiceId] = useState('')
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<EditorMode>('text')
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [queueFullError, setQueueFullError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const { items } = await listVoices()
        setVoices(items)
        if (items.length > 0) setVoiceId(items[0].id)
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Errore nel caricamento voci.', 'error')
      } finally {
        setLoading(false)
      }
    })()
  }, [showToast])

  const charCount = text.length

  const handleFileDrop = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : ''
      setText(content)
      setMode('book')
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''))
    }
    reader.readAsText(file)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!voiceId || !text.trim()) return
    setSubmitting(true)
    setQueueFullError(null)
    try {
      const job = await createJob({
        voice_id: voiceId,
        source_type: 'text',
        text: text.trim(),
        title: title.trim() || undefined,
      })
      showToast('Job creato con successo.', 'success')
      navigate(`/coda/${job.id}`)
    } catch (err) {
      if (err instanceof HttpError && err.code === 'queue_full') {
        setQueueFullError(err.message)
      }
      showToast(err instanceof Error ? err.message : 'Creazione job fallita.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-header__title">Nuovo job</h1>
          <p className="page-header__desc">Genera audio da testo o libro con una voce clonata.</p>
        </div>
      </header>

      {queueFullError && (
        <div className="alert alert--error" role="alert">
          {queueFullError}
        </div>
      )}

      {loading ? (
        <div className="skeleton-block" />
      ) : voices.length === 0 ? (
        <div className="empty-state">
          <h2>Nessuna voce disponibile</h2>
          <p>Carica almeno una voce prima di generare audio.</p>
          <Link to="/voci" className="btn btn--primary">
            Vai a Voci
          </Link>
        </div>
      ) : (
        <form className="job-editor" onSubmit={(e) => void handleSubmit(e)} data-gdw-book-editor>
          <div className="job-editor__row">
            <label className="field field--grow">
              <span className="field__label">Voce</span>
              <select
                className="field__input"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                required
              >
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="mode-toggle" role="group" aria-label="Modalità editor">
              <button
                type="button"
                className={`mode-toggle__btn${mode === 'text' ? ' mode-toggle__btn--active' : ''}`}
                onClick={() => setMode('text')}
              >
                Testo
              </button>
              <button
                type="button"
                className={`mode-toggle__btn${mode === 'book' ? ' mode-toggle__btn--active' : ''}`}
                onClick={() => setMode('book')}
              >
                Libro
              </button>
            </div>
          </div>

          <label className="field">
            <span className="field__label">Titolo (opzionale)</span>
            <input
              className="field__input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Es. Capitolo 1"
            />
          </label>

          {mode === 'book' && (
            <div
              className="drop-zone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const dropped = e.dataTransfer.files[0]
                if (dropped) handleFileDrop(dropped)
              }}
            >
              <p>Trascina un file di testo (.txt) oppure incolla il contenuto sotto.</p>
              <label className="btn btn--secondary btn--sm">
                Scegli file
                <input
                  type="file"
                  accept=".txt,text/plain"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFileDrop(f)
                  }}
                />
              </label>
            </div>
          )}

          <label className="field">
            <span className="field__label">
              {mode === 'book' ? 'Testo del libro' : 'Testo da sintetizzare'}
            </span>
            <textarea
              className="field__textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              maxLength={50000}
              rows={mode === 'book' ? 20 : 8}
              placeholder={
                mode === 'book'
                  ? 'Incolla o carica il testo completo del libro…'
                  : 'Scrivi il testo da convertire in audio…'
              }
            />
            <span className="field__hint">
              {charCount.toLocaleString('it-IT')} / 50.000 caratteri
            </span>
          </label>

          <div className="job-editor__actions">
            <button
              type="submit"
              className="btn btn--primary"
              disabled={submitting || !text.trim() || !voiceId}
            >
              {submitting ? 'Invio in corso…' : 'Genera'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

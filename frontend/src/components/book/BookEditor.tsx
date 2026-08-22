import { useCallback, useEffect, useMemo, useState } from 'react'
import { HttpError } from '../../api/client'
import { createJob } from '../../api/jobs'
import type { Voice } from '../../types/api'

const DRAFT_STORAGE_KEY = 'tts-book-editor-draft'

export interface BookChapter {
  id: string
  title: string
  text: string
}

interface BookDraft {
  bookTitle: string
  chapters: BookChapter[]
}

export interface BookEditorProps {
  voices: Voice[]
  voiceId: string
  onVoiceIdChange: (id: string) => void
  onJobCreated: (jobId: string) => void
  onQueueFull: (message: string) => void
  onError?: (message: string) => void
}

function createChapter(title = '', text = ''): BookChapter {
  return { id: crypto.randomUUID(), title, text }
}

function emptyDraft(): BookDraft {
  return { bookTitle: '', chapters: [createChapter('Capitolo 1', '')] }
}

function loadDraft(): BookDraft {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!raw) return emptyDraft()
    const parsed = JSON.parse(raw) as Partial<BookDraft>
    return {
      bookTitle: parsed.bookTitle ?? '',
      chapters:
        Array.isArray(parsed.chapters) && parsed.chapters.length > 0
          ? parsed.chapters.map((c) => ({
              id: c.id ?? crypto.randomUUID(),
              title: c.title ?? '',
              text: c.text ?? '',
            }))
          : [createChapter()],
    }
  } catch {
    return emptyDraft()
  }
}

function saveDraft(draft: BookDraft): void {
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
}

function buildJobText(chapters: BookChapter[]): string {
  return chapters
    .filter((c) => c.text.trim())
    .map((c) => {
      const t = c.title.trim()
      const body = c.text.trim()
      return t ? `${t}\n\n${body}` : body
    })
    .join('\n\n---\n\n')
}

/**
 * Editor libro multi-capitolo con bozza in localStorage.
 * Montato in NewJobPage quando mode === 'book' (attributo data-gdw-book-editor).
 */
export function BookEditor({
  voices,
  voiceId,
  onVoiceIdChange,
  onJobCreated,
  onQueueFull,
  onError,
}: BookEditorProps) {
  const [draft, setDraft] = useState<BookDraft>(loadDraft)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    saveDraft(draft)
  }, [draft])

  const totalChars = useMemo(
    () => draft.chapters.reduce((sum, c) => sum + c.text.length, 0),
    [draft.chapters],
  )

  const updateChapter = useCallback((id: string, patch: Partial<BookChapter>) => {
    setDraft((d) => ({
      ...d,
      chapters: d.chapters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }))
    setError(null)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!voiceId) {
      const msg = 'Seleziona una voce prima di generare.'
      setError(msg)
      onError?.(msg)
      return
    }

    const text = buildJobText(draft.chapters)
    if (!text.trim()) {
      const msg = 'Inserisci il testo di almeno un capitolo.'
      setError(msg)
      onError?.(msg)
      return
    }

    setSubmitting(true)
    try {
      const job = await createJob({
        voice_id: voiceId,
        text,
      })
      onJobCreated(job.id)
    } catch (err: unknown) {
      if (err instanceof HttpError && err.code === 'queue_full') {
        onQueueFull(err.message)
        setError(err.message)
      } else {
        const msg = err instanceof Error ? err.message : 'Impossibile creare il job.'
        setError(msg)
        onError?.(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileDrop = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : ''
      setDraft((d) => ({
        ...d,
        bookTitle: d.bookTitle || file.name.replace(/\.[^.]+$/, ''),
        chapters: [{ id: crypto.randomUUID(), title: 'Capitolo 1', text: content }],
      }))
    }
    reader.readAsText(file)
  }

  return (
    <form
      className="book-editor"
      onSubmit={(e) => void handleSubmit(e)}
      data-gdw-book-editor
    >
      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      <label className="field">
        <span className="field__label">Titolo libro (opzionale)</span>
        <input
          className="field__input"
          value={draft.bookTitle}
          onChange={(e) => setDraft((d) => ({ ...d, bookTitle: e.target.value }))}
          maxLength={200}
          placeholder="Es. Le avventure di…"
        />
      </label>

      <div
        className="drop-zone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const f = e.dataTransfer.files[0]
          if (f) handleFileDrop(f)
        }}
      >
        <p>Trascina un file .txt o compila i capitoli sotto.</p>
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

      {draft.chapters.map((chapter, index) => (
        <section key={chapter.id} className="book-editor__chapter">
          <div className="book-editor__chapter-head">
            <strong>Capitolo {index + 1}</strong>
            {draft.chapters.length > 1 && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    chapters: d.chapters.filter((c) => c.id !== chapter.id),
                  }))
                }
              >
                Rimuovi
              </button>
            )}
          </div>
          <label className="field">
            <span className="field__label">Titolo capitolo</span>
            <input
              className="field__input"
              value={chapter.title}
              onChange={(e) => updateChapter(chapter.id, { title: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field__label">Testo</span>
            <textarea
              className="field__textarea"
              value={chapter.text}
              onChange={(e) => updateChapter(chapter.id, { text: e.target.value })}
              rows={10}
              maxLength={50000}
            />
          </label>
        </section>
      ))}

      <div className="book-editor__toolbar">
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() =>
            setDraft((d) => ({
              ...d,
              chapters: [
                ...d.chapters,
                createChapter(`Capitolo ${d.chapters.length + 1}`, ''),
              ],
            }))
          }
        >
          Aggiungi capitolo
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => {
            const fresh = emptyDraft()
            setDraft(fresh)
            saveDraft(fresh)
          }}
        >
          Cancella bozza
        </button>
      </div>

      <span className="field__hint">
        {totalChars.toLocaleString('it-IT')} / 50.000 caratteri totali
      </span>

      <div className="job-editor__actions">
        <label className="field field--grow">
          <span className="field__label">Voce</span>
          <select
            className="field__input"
            value={voiceId}
            onChange={(e) => onVoiceIdChange(e.target.value)}
            required
          >
            {voices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Invio in corso…' : 'Genera'}
        </button>
      </div>
    </form>
  )
}

import { useEffect, useRef, useState } from 'react'

interface AudioPlayerProps {
  /** URL remoto — verrà scaricato con Bearer token e riprodotto come blob */
  fetchAudio: () => Promise<Blob>
  /** Extension point GDW: container per waveform canvas/WebGL */
  waveformSlot?: React.ReactNode
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Player audio con barra di progresso.
 * Scarica l'audio autenticato via fetch e lo riproduce come blob URL.
 * Extension point GDW: passare `waveformSlot` per sostituire la barra semplice.
 */
export function AudioPlayer({ fetchAudio, waveformSlot }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const blobUrlRef = useRef<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const blob = await fetchAudio()
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        blobUrlRef.current = url
        const audio = audioRef.current
        if (audio) audio.src = url
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Impossibile caricare l\'audio.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [fetchAudio])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onLoaded = () => setDuration(audio.duration)
    const onEnded = () => setPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.playbackRate = playbackRate
  }, [playbackRate])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      void audio.play()
      setPlaying(true)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return
    const value = Number(e.target.value)
    audio.currentTime = value
    setCurrentTime(value)
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  if (loading) {
    return <p className="text-muted">Caricamento audio…</p>
  }

  if (error) {
    return <p className="field__error" role="alert">{error}</p>
  }

  return (
    <div className="audio-player" data-gdw-waveform-container>
      <audio ref={audioRef} preload="metadata" />

      {waveformSlot ?? (
        <div className="audio-player__progress">
          <div
            className="audio-player__progress-fill"
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            className="audio-player__seek"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Posizione riproduzione"
          />
        </div>
      )}

      <div className="audio-player__controls">
        <button type="button" className="btn btn--icon" onClick={togglePlay} aria-label={playing ? 'Pausa' : 'Play'}>
          {playing ? '⏸' : '▶'}
        </button>
        <span className="audio-player__time">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <label className="audio-player__speed">
          Velocità
          <select
            value={playbackRate}
            onChange={(e) => setPlaybackRate(Number(e.target.value))}
          >
            <option value={0.75}>0.75×</option>
            <option value={1}>1×</option>
            <option value={1.25}>1.25×</option>
            <option value={1.5}>1.5×</option>
            <option value={2}>2×</option>
          </select>
        </label>
      </div>
    </div>
  )
}

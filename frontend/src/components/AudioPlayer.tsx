import { useCallback, useEffect, useRef, useState } from 'react'

export interface AudioWaveformContext {
  currentTime: number
  duration: number
  onSeek: (seconds: number) => void
  src: string
}

interface AudioPlayerProps {
  src: string
  /** Extension point GDW: sostituisce la barra progresso (ReactNode o render con contesto seek). */
  waveformSlot?: React.ReactNode | ((ctx: AudioWaveformContext) => React.ReactNode)
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Player audio con barra di progresso.
 * Extension point GDW: passare `waveformSlot` per sostituire la barra semplice.
 */
export function AudioPlayer({ src, waveformSlot }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)

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
  }, [src])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.playbackRate = playbackRate
  }, [playbackRate])

  const onSeek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = seconds
    setCurrentTime(seconds)
  }, [])

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
    onSeek(Number(e.target.value))
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const waveformContext: AudioWaveformContext = {
    currentTime,
    duration,
    onSeek,
    src,
  }

  const slotContent =
    typeof waveformSlot === 'function' ? waveformSlot(waveformContext) : waveformSlot

  return (
    <div className="audio-player" data-gdw-waveform-container>
      <audio ref={audioRef} src={src} preload="metadata" />

      {slotContent ?? (
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

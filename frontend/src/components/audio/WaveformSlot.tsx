import { useCallback, useEffect, useRef } from 'react'
import type { AudioWaveformContext } from '../AudioPlayer'
import { useAudioPeaks } from '../../hooks/useAudioPeaks'

export interface WaveformSlotProps extends AudioWaveformContext {
  jobId: string
}

/**
 * Forma d'onda seekable per `AudioPlayer.waveformSlot`.
 * Carica picchi via fetch autenticato su GET /jobs/{id}/audio.
 */
export function WaveformSlot({
  jobId,
  currentTime,
  duration,
  onSeek,
}: WaveformSlotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { peaks, loading, error } = useAudioPeaks(jobId)
  const progressRatio = duration > 0 ? currentTime / duration : 0

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, height)

    if (peaks.length === 0) {
      ctx.fillStyle = 'var(--color-border)'
      ctx.fillRect(0, height / 2 - 1, width, 2)
      return
    }

    const maxPeak = Math.max(...peaks, 0.001)
    const barWidth = width / peaks.length
    const playedWidth = width * progressRatio

    peaks.forEach((peak, index) => {
      const barHeight = Math.max(2, (peak / maxPeak) * (height - 8))
      const x = index * barWidth
      const y = (height - barHeight) / 2
      ctx.fillStyle = x + barWidth <= playedWidth ? 'var(--color-primary)' : 'var(--color-text-muted)'
      ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight)
    })

    if (progressRatio > 0 && progressRatio < 1) {
      ctx.strokeStyle = 'var(--color-primary-hover)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(playedWidth, 0)
      ctx.lineTo(playedWidth, height)
      ctx.stroke()
    }
  }, [peaks, progressRatio])

  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => {
    const onResize = () => draw()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [draw])

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || duration <= 0) return
    const rect = canvas.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    onSeek(ratio * duration)
  }

  if (error) {
    return (
      <div className="waveform-slot waveform-slot--error" role="alert">
        {error}
      </div>
    )
  }

  return (
    <div className="waveform-slot">
      {loading && (
        <span className="waveform-slot__loading" aria-live="polite">
          Caricamento forma d&apos;onda…
        </span>
      )}
      <canvas
        ref={canvasRef}
        className="waveform-slot__canvas"
        onClick={handleClick}
        role="slider"
        aria-label="Forma d'onda audio"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        tabIndex={0}
        onKeyDown={(event) => {
          if (duration <= 0) return
          const step = duration * 0.05
          if (event.key === 'ArrowRight') onSeek(Math.min(duration, currentTime + step))
          else if (event.key === 'ArrowLeft') onSeek(Math.max(0, currentTime - step))
        }}
      />
    </div>
  )
}

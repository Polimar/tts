import { useEffect, useState } from 'react'
import { apiFetchBlob, HttpError, jobDownloadPath } from '../api/client'

async function decodePeaks(
  arrayBuffer: ArrayBuffer,
  bucketCount: number,
): Promise<number[]> {
  const audioContext = new AudioContext()
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0))
    const channel = audioBuffer.getChannelData(0)
    const buckets = Math.max(64, bucketCount)
    const blockSize = Math.max(1, Math.floor(channel.length / buckets))
    const peaks: number[] = []

    for (let i = 0; i < buckets; i += 1) {
      const start = i * blockSize
      let max = 0
      for (let j = 0; j < blockSize; j += 1) {
        const sample = Math.abs(channel[start + j] ?? 0)
        if (sample > max) max = sample
      }
      peaks.push(max)
    }

    return peaks
  } finally {
    await audioContext.close()
  }
}

export function useAudioPeaks(jobId: string | undefined) {
  const [peaks, setPeaks] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId) {
      setPeaks([])
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const blob = await apiFetchBlob(jobDownloadPath(jobId, 'wav'), {
          headers: { Accept: 'audio/wav,*/*' },
        })
        if (cancelled) return
        const peaksData = await decodePeaks(await blob.arrayBuffer(), 200)
        if (!cancelled) setPeaks(peaksData)
      } catch (err) {
        if (cancelled) return
        if (err instanceof HttpError) {
          setError(err.message)
        } else {
          setError('Impossibile caricare la forma d\'onda.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [jobId])

  return { peaks, loading, error }
}

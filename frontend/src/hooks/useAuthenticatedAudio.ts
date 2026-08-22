import { useEffect, useState } from 'react'
import { apiFetchBlob, jobDownloadPath } from '../api/client'

export function useAuthenticatedAudio(jobId: string | null, format: 'wav' | 'mp3' = 'wav') {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId) {
      setUrl(null)
      return
    }

    let objectUrl: string | null = null
    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const blob = await apiFetchBlob(jobDownloadPath(jobId, format))
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
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
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [jobId, format])

  return { url, loading, error }
}

export async function downloadJobAudio(jobId: string, format: 'wav' | 'mp3', filename: string) {
  const blob = await apiFetchBlob(jobDownloadPath(jobId, format))
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

import { apiFetch } from './client'
import type { Voice, VoiceListResponse } from '../types/api'

interface BackendVoice {
  id: string
  name: string
  ref_text: string
  language: string
  created_at: string
}

export function listVoices(): Promise<VoiceListResponse> {
  return apiFetch<BackendVoice[]>('/voices').then((rows) => ({
    items: rows,
    total: rows.length,
  }))
}

export function getVoice(id: string): Promise<Voice> {
  return apiFetch<Voice>(`/voices/${id}`)
}

export function createVoice(name: string, refText: string, audioFile: File): Promise<Voice> {
  const form = new FormData()
  form.append('name', name)
  form.append('ref_text', refText)
  form.append('language', 'Italian')
  form.append('audio', audioFile)
  return apiFetch<Voice>('/voices', {
    method: 'POST',
    body: form,
  })
}

export function deleteVoice(id: string): Promise<void> {
  return apiFetch<void>(`/voices/${id}`, { method: 'DELETE' })
}

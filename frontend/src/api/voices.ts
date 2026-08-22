import { apiFetch } from './client'
import type { Voice } from '../types/api'

export function listVoices(): Promise<Voice[]> {
  return apiFetch<Voice[]>('/voices')
}

export function getVoice(id: string): Promise<Voice> {
  return apiFetch<Voice>(`/voices/${id}`)
}

export function createVoice(
  name: string,
  refText: string,
  audioFile: File,
  language = 'Italian',
): Promise<Voice> {
  const form = new FormData()
  form.append('name', name)
  form.append('ref_text', refText)
  form.append('language', language)
  form.append('audio', audioFile)
  return apiFetch<Voice>('/voices', {
    method: 'POST',
    body: form,
  })
}

export function deleteVoice(id: string): Promise<void> {
  return apiFetch<void>(`/voices/${id}`, { method: 'DELETE' })
}

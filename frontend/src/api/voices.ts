import { apiFetch } from './client'
import type { Voice } from '../types/api'

export function listVoices(): Promise<Voice[]> {
  return apiFetch<Voice[]>('/voices')
}

export function createVoice(name: string, audioFile: File): Promise<Voice> {
  const form = new FormData()
  form.append('name', name)
  form.append('audio', audioFile)
  return apiFetch<Voice>('/voices', {
    method: 'POST',
    body: form,
  })
}

export function deleteVoice(id: string): Promise<void> {
  return apiFetch<void>(`/voices/${id}`, { method: 'DELETE' })
}

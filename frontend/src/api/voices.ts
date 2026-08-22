import { apiFetch } from './client'
import type { Voice, VoiceListResponse } from '../types/api'

export function listVoices(): Promise<VoiceListResponse> {
  return apiFetch<VoiceListResponse>('/voices')
}

export function getVoice(id: string): Promise<Voice> {
  return apiFetch<Voice>(`/voices/${id}`)
}

export function createVoice(name: string, audioFile: File): Promise<Voice> {
  const form = new FormData()
  form.append('name', name)
  form.append('reference_audio', audioFile)
  return apiFetch<Voice>('/voices', {
    method: 'POST',
    body: form,
  })
}

export function deleteVoice(id: string): Promise<void> {
  return apiFetch<void>(`/voices/${id}`, { method: 'DELETE' })
}

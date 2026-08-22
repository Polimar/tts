/** Export pubblici Game Dev Web — integrazione nella UI Frontend */
export { WaveformSlot } from './components/audio/WaveformSlot'
export { BookEditor } from './components/book/BookEditor'
export { useAudioPeaks } from './hooks/useAudioPeaks'
export {
  useJobPolling,
  useActiveJobsPolling,
} from './hooks/useJobPolling'
export type { AudioWaveformContext } from './components/AudioPlayer'
export {
  isTerminalJobStatus,
  isActiveJobStatus,
  canPlayJobAudio,
} from './api/jobs'
export { jobDownloadPath } from './api/client'

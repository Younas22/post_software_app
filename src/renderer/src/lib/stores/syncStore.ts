import { create } from 'zustand'
import type { OnlineStatus, SyncProgressEvent, SyncStatusSummary } from '@shared/types'

interface SyncState {
  online: OnlineStatus
  progress: SyncProgressEvent | null
  status: SyncStatusSummary | null
  setOnline(status: OnlineStatus): void
  setProgress(event: SyncProgressEvent | null): void
  setStatus(status: SyncStatusSummary): void
}

export const useSyncStore = create<SyncState>((set) => ({
  online: 'connecting',
  progress: null,
  status: null,
  setOnline: (online) => set({ online }),
  setProgress: (progress) => set({ progress }),
  setStatus: (status) => set({ status, online: status.online })
}))

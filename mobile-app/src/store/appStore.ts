import { create } from 'zustand';
import type { PendingLectura } from '../types';

interface AppState {
  isOnline: boolean;
  pendingQueue: PendingLectura[];
  setOnline: (v: boolean) => void;
  enqueue: (item: PendingLectura) => void;
  dequeue: (id: string) => void;
  clearQueue: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: true,
  pendingQueue: [],
  setOnline: (isOnline) => set({ isOnline }),
  enqueue: (item) => set((s) => ({ pendingQueue: [...s.pendingQueue, item] })),
  dequeue: (id) => set((s) => ({ pendingQueue: s.pendingQueue.filter((p) => p.id !== id) })),
  clearQueue: () => set({ pendingQueue: [] }),
}));

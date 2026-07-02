import { create } from 'zustand'

export type NotificationKind = 'success' | 'error' | 'info' | 'warning'

export interface AppNotification {
  id: number
  kind: NotificationKind
  title: string
  subtitle?: string
}

interface NotificationState {
  notifications: AppNotification[]
  push: (n: Omit<AppNotification, 'id'>) => void
  dismiss: (id: number) => void
}

let seq = 1

export const useNotifications = create<NotificationState>((set) => ({
  notifications: [],
  push: (n) =>
    set((s) => ({ notifications: [...s.notifications, { ...n, id: seq++ }] })),
  dismiss: (id) =>
    set((s) => ({ notifications: s.notifications.filter((x) => x.id !== id) })),
}))

/**
 * Imperative helper usable anywhere (including outside React, e.g. inside
 * react-query mutation callbacks) to raise a Carbon toast.
 */
export const notify = {
  success: (title: string, subtitle?: string) =>
    useNotifications.getState().push({ kind: 'success', title, subtitle }),
  error: (title: string, subtitle?: string) =>
    useNotifications.getState().push({ kind: 'error', title, subtitle }),
  info: (title: string, subtitle?: string) =>
    useNotifications.getState().push({ kind: 'info', title, subtitle }),
  warning: (title: string, subtitle?: string) =>
    useNotifications.getState().push({ kind: 'warning', title, subtitle }),
}

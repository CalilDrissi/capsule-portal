import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CarbonTheme = 'g10' | 'g100'

/** Capsule tenancy role as returned by GET /capsule/whoami/. */
export type CapsuleRole = 'platform' | 'accountant' | 'client' | null

export interface WhoamiFirm {
  id: number
  name: string
}

interface AppState {
  token: string | null
  username: string | null
  theme: CarbonTheme
  // Tenancy context (populated from whoami after login)
  firm: WhoamiFirm | null
  role: CapsuleRole
  clientId: number | null
  mustChangePassword: boolean
  // Upload context resolved server-side by whoami (clients can't list these).
  documentTypeId: number | null
  sourceId: number | null
  categoryMetadataTypeId: number | null
  documentDateMetadataTypeId: number | null
  // The firm's configurable upload categories (from whoami)
  categories: string[]
  // The client an accountant is currently viewing (UI-only, not from whoami)
  activeClientId: number | null
  setAuth: (token: string, username: string) => void
  setWhoami: (w: {
    firm: WhoamiFirm | null
    role: CapsuleRole
    clientId: number | null
    mustChangePassword: boolean
    documentTypeId?: number | null
    sourceId?: number | null
    categoryMetadataTypeId?: number | null
    documentDateMetadataTypeId?: number | null
    categories?: string[]
  }) => void
  setMustChangePassword: (v: boolean) => void
  setActiveClientId: (id: number | null) => void
  logout: () => void
  toggleTheme: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      username: null,
      theme: 'g10',
      firm: null,
      role: null,
      clientId: null,
      mustChangePassword: false,
      documentTypeId: null,
      sourceId: null,
      categoryMetadataTypeId: null,
      documentDateMetadataTypeId: null,
      categories: [],
      activeClientId: null,
      setAuth: (token, username) => set({ token, username }),
      setWhoami: ({
        firm,
        role,
        clientId,
        mustChangePassword,
        documentTypeId = null,
        sourceId = null,
        categoryMetadataTypeId = null,
        documentDateMetadataTypeId = null,
        categories = [],
      }) =>
        set({
          firm,
          role,
          clientId,
          mustChangePassword,
          documentTypeId,
          sourceId,
          categoryMetadataTypeId,
          documentDateMetadataTypeId,
          categories,
        }),
      setMustChangePassword: (v) => set({ mustChangePassword: v }),
      setActiveClientId: (id) => set({ activeClientId: id }),
      logout: () =>
        set({
          token: null,
          username: null,
          firm: null,
          role: null,
          clientId: null,
          mustChangePassword: false,
          documentTypeId: null,
          sourceId: null,
          categoryMetadataTypeId: null,
          documentDateMetadataTypeId: null,
          categories: [],
          activeClientId: null,
        }),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === 'g10' ? 'g100' : 'g10' })),
    }),
    {
      name: 'capsule-auth',
      // persist token + theme + tenancy context so reload keeps the session
      partialize: (s) => ({
        token: s.token,
        username: s.username,
        theme: s.theme,
        firm: s.firm,
        role: s.role,
        clientId: s.clientId,
        mustChangePassword: s.mustChangePassword,
        documentTypeId: s.documentTypeId,
        sourceId: s.sourceId,
        categoryMetadataTypeId: s.categoryMetadataTypeId,
        documentDateMetadataTypeId: s.documentDateMetadataTypeId,
        categories: s.categories,
        activeClientId: s.activeClientId,
      }),
    },
  ),
)

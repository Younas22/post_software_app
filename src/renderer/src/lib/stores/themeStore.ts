import { create } from 'zustand'

export type ThemeChoice = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: ThemeChoice
  setTheme(theme: ThemeChoice): void
}

function applyToDocument(theme: ThemeChoice): void {
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'system',
  setTheme: (theme) => {
    applyToDocument(theme)
    void window.pos.settings.set('theme', theme)
    set({ theme })
  }
}))

export async function initTheme(): Promise<void> {
  const stored = (await window.pos.settings.get('theme')) as ThemeChoice | null
  const theme = stored ?? 'system'
  applyToDocument(theme)
  useThemeStore.setState({ theme })
}

import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@renderer/lib/stores/appStore'
import { useSyncStore } from '@renderer/lib/stores/syncStore'
import { remote } from '@renderer/lib/remote'
import { resolveTerms, resolveTheme } from '@renderer/lib/branding'
import type { HideableModule, OptionalModule, PlatformInfo } from '@shared/types'

/** The signed-in business's trade branding: theme, terminology ("Patients" vs "Customers") and module switches. */
export function useBranding() {
  const branding = useAppStore((s) => s.businessType)

  return useMemo(() => {
    const hidden = new Set<HideableModule>(branding?.modules.hidden ?? [])
    const enabled = new Set<OptionalModule>(branding?.modules.enabled ?? [])
    return {
      branding,
      typeName: branding?.name ?? null,
      terms: resolveTerms(branding),
      theme: resolveTheme(branding),
      hasModule: (module: OptionalModule) => enabled.has(module),
      isHidden: (module: HideableModule) => hidden.has(module)
    }
  }, [branding])
}

export function useTerms() {
  return useBranding().terms
}

/**
 * A server image (profile photo, company logo, login background) as a
 * CSP-safe data: URI, downloaded by main. Null while loading / offline / none.
 */
export function useRemoteImage(url: string | null | undefined): string | null {
  const [state, setState] = useState<{ url: string; data: string | null } | null>(null)

  useEffect(() => {
    if (!url) return
    let cancelled = false
    void window.pos.media.fetchImage(url).then((data) => {
      if (!cancelled) setState({ url, data })
    })
    return () => {
      cancelled = true
    }
  }, [url])

  return url && state?.url === url ? state.data : null
}

const PLATFORM_CACHE_KEY = 'platform_info'

let platformMemo: PlatformInfo | null = null

/**
 * The POS company's public profile & support contacts (Super Admin → System
 * Settings). Fetched when online and cached in local settings, so the login
 * screen and Support page still show contacts offline.
 */
export function usePlatformInfo(): PlatformInfo | null {
  const online = useSyncStore((s) => s.online)
  const [info, setInfo] = useState<PlatformInfo | null>(platformMemo)

  useEffect(() => {
    let cancelled = false
    if (!platformMemo) {
      void window.pos.settings.get(PLATFORM_CACHE_KEY).then((raw) => {
        if (cancelled || !raw || platformMemo) return
        try {
          platformMemo = JSON.parse(raw) as PlatformInfo
          setInfo(platformMemo)
        } catch {
          /* ignore a corrupt cache */
        }
      })
    }
    if (online === 'online') {
      remote
        .get<PlatformInfo>('/public/platform')
        .then(({ data }) => {
          platformMemo = data
          void window.pos.settings.set(PLATFORM_CACHE_KEY, JSON.stringify(data))
          if (!cancelled) setInfo(data)
        })
        .catch(() => {
          /* keep the cached copy */
        })
    }
    return () => {
      cancelled = true
    }
  }, [online])

  return info
}

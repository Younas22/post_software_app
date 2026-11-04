import { useState, type FormEvent } from 'react'
import { CheckCircle2, Eye, EyeOff, Lock, Mail, MapPin, Minus, Phone, Square, X, Zap } from 'lucide-react'
import { Alert } from '@renderer/components/ui/alert'
import { Button } from '@renderer/components/ui/button'
import { IconButton } from '@renderer/components/ui/icon-button'
import { BusinessTypeIcon } from '@renderer/components/business-type-icon'
import { useAuthStore } from '@renderer/lib/stores/authStore'
import { useSyncStore } from '@renderer/lib/stores/syncStore'
import { useThemeStore, type ThemeChoice } from '@renderer/lib/stores/themeStore'
import { useBranding, usePlatformInfo, useRemoteImage } from '@renderer/lib/use-branding'
import { telHref } from '@renderer/lib/branding'
import { cn } from '@renderer/lib/cn'
import type { PlatformInfo } from '@shared/types'

/**
 * Split-screen sign-in, the same design as the web app's branded login.
 * A desktop install belongs to one business, so the brand panel uses the
 * business type cached from the last sign-in on this device (colour,
 * headline, highlights, background photo); a fresh install shows the
 * neutral look. The POS company's name and contacts come from the Super
 * Admin's System Settings.
 */
export function LoginPage({ onSuccess }: { onSuccess: () => void | Promise<void> }): React.JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setSession = useAuthStore((s) => s.setSession)
  const online = useSyncStore((s) => s.online)
  const { branding, theme } = useBranding()
  const platform = usePlatformInfo()
  const loginImage = useRemoteImage(theme.login_image_url)

  const companyName = platform?.name || 'Universal POS'
  const productName = branding ? `${branding.name} POS` : companyName

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const session = await window.pos.auth.login(email, password)
      setSession(session.user)
      // Login only proves the user's identity — device registration, sync
      // state and authorization are evaluated next (App.tsx evaluateDevice()).
      await onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  const heroBackground = loginImage
    ? `linear-gradient(160deg, rgb(0 0 0 / 0.25), rgb(0 0 0 / 0.72)), url("${loginImage}")`
    : 'radial-gradient(120% 90% at 0% 0%, rgb(255 255 255 / 0.22), transparent 55%), radial-gradient(90% 80% at 100% 100%, rgb(0 0 0 / 0.35), transparent 60%)'

  return (
    <div className="grid h-screen w-screen grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] overflow-hidden bg-background">
      {/* Brand panel */}
      <section className="app-drag relative flex flex-col justify-between overflow-hidden bg-brand bg-cover bg-center p-12 text-white" style={{ backgroundImage: heroBackground }}>
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full border-[40px] border-white/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 size-80 rounded-full bg-white/5" />

        <div className="relative flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            {branding ? <BusinessTypeIcon name={branding.icon} className="size-6" /> : <Zap className="size-6" fill="currentColor" />}
          </div>
          <div>
            <p className="text-lg font-semibold leading-tight">{productName}</p>
            <p className="text-sm text-white/75">Point of sale &amp; business management</p>
          </div>
        </div>

        <div className="relative max-w-xl">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">{theme.login_headline}</h1>
          <p className="mt-4 text-lg text-white/85">{theme.login_tagline}</p>
          {theme.login_highlights.length > 0 && (
            <ul className="mt-8 space-y-3">
              {theme.login_highlights.slice(0, 5).map((line) => (
                <li key={line} className="flex items-center gap-3 text-base text-white/95">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
                    <CheckCircle2 className="size-4" />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="relative">
          <CompanyContact platform={platform} />
          <p className="mt-4 text-sm text-white/60">Powered by {companyName}</p>
        </div>
      </section>

      {/* Form panel */}
      <section className="flex flex-col">
        <div className="app-drag flex items-center justify-end gap-2 px-4 pt-3">
          <div className="app-no-drag flex items-center gap-2">
            <ThemeSwitch />
            <div className="flex items-center gap-0.5 border-l border-border pl-2">
              <IconButton aria-label="Minimize" onClick={() => window.pos.window.minimize()}>
                <Minus className="size-4" />
              </IconButton>
              <IconButton aria-label="Maximize" onClick={() => window.pos.window.maximize()}>
                <Square className="size-3.5" />
              </IconButton>
              <IconButton aria-label="Close" onClick={() => window.pos.window.close()}>
                <X className="size-4" />
              </IconButton>
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-10 pb-12">
          <div className="w-full max-w-[400px]">
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Welcome back</h2>
              <p className="mt-2 text-[15px] text-muted-foreground">
                Sign in to your {branding ? branding.name.toLowerCase() : 'business'} workspace.
              </p>
            </div>

            {online === 'offline' && (
              <div className="mb-4">
                <Alert variant="warning" title="No connection">
                  Signing in for the first time on this device requires an internet connection.
                </Alert>
              </div>
            )}

            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              {error && <Alert variant="error">{error}</Alert>}

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Email</span>
                <span className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    autoFocus
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@business.com"
                    className="h-12 w-full rounded-xl border border-input bg-[var(--input-background)] pl-11 pr-3 text-[15px] outline-none transition-colors placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-ring/30"
                  />
                </span>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Password</span>
                <span className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 w-full rounded-xl border border-input bg-[var(--input-background)] pl-11 pr-12 text-[15px] outline-none transition-colors placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-ring/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                  </button>
                </span>
              </label>

              <Button type="submit" size="lg" className="mt-2 w-full rounded-xl text-base font-semibold" loading={loading} disabled={online === 'offline'}>
                Sign in
              </Button>
            </form>

            <p className="mt-10 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} {companyName} · Secure sign-in</p>
          </div>
        </div>
      </section>
    </div>
  )
}

/** The POS company's office address, phone and email — whichever the Super Admin filled in. */
function CompanyContact({ platform }: { platform: PlatformInfo | null }): React.JSX.Element | null {
  if (!platform) return null
  const rows = [
    platform.office_address && { icon: MapPin, text: platform.office_address, href: `https://maps.google.com/?q=${encodeURIComponent(platform.office_address)}` },
    platform.support_phone && { icon: Phone, text: platform.support_phone, href: telHref(platform.support_phone) },
    platform.support_email && { icon: Mail, text: platform.support_email, href: `mailto:${platform.support_email}` }
  ].filter(Boolean) as Array<{ icon: typeof Mail; text: string; href: string }>
  if (rows.length === 0) return null

  return (
    <div className="app-no-drag max-w-md rounded-2xl bg-black/15 p-4 ring-1 ring-white/15">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/70">Need help? Contact {platform.name}</p>
      <ul className="space-y-1.5">
        {rows.map(({ icon: Icon, text, href }) => (
          <li key={text}>
            <a href={href} target="_blank" rel="noreferrer" className="flex items-start gap-2.5 text-sm text-white/90 hover:text-white hover:underline">
              <Icon className="mt-0.5 size-4 shrink-0 text-white/70" />
              <span className="break-words">{text}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ThemeSwitch(): React.JSX.Element {
  const { theme, setTheme } = useThemeStore()
  const options: ThemeChoice[] = ['light', 'dark', 'system']
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5">
      {options.map((t) => (
        <button
          key={t}
          onClick={() => setTheme(t)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors',
            theme === t ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

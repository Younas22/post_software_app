import { useEffect, useState, Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@renderer/components/shell/app-shell'
import { Toaster } from '@renderer/components/ui/toaster'
import { LoadingState } from '@renderer/components/ui/loading-state'
import { LoginPage } from '@renderer/pages/login'
import { DeviceSetupPage } from '@renderer/pages/device-setup'
import { SyncingScreen } from '@renderer/pages/syncing-screen'
import { DeviceBlockedScreen } from '@renderer/pages/device-blocked-screen'
import { useAuthStore } from '@renderer/lib/stores/authStore'
import { useAppStore } from '@renderer/lib/stores/appStore'
import { useSyncStore } from '@renderer/lib/stores/syncStore'
import { initTheme } from '@renderer/lib/stores/themeStore'
import { applyBusinessContext, refreshBusinessContext } from '@renderer/lib/business'
import { toast } from '@renderer/lib/stores/toastStore'
import type { DeviceStatus } from '@shared/types'

const DashboardPage = lazy(() => import('@renderer/pages/dashboard').then((m) => ({ default: m.DashboardPage })))
const PosPage = lazy(() => import('@renderer/pages/pos/pos-page').then((m) => ({ default: m.PosPage })))
const ProductsPage = lazy(() => import('@renderer/pages/products/products-page').then((m) => ({ default: m.ProductsPage })))
const InventoryPage = lazy(() => import('@renderer/pages/inventory-page').then((m) => ({ default: m.InventoryPage })))
const CustomersPage = lazy(() => import('@renderer/pages/customers-page').then((m) => ({ default: m.CustomersPage })))
const SuppliersPage = lazy(() => import('@renderer/pages/suppliers-page').then((m) => ({ default: m.SuppliersPage })))
const PurchasesPage = lazy(() => import('@renderer/pages/purchases-page').then((m) => ({ default: m.PurchasesPage })))
const ExpensesPage = lazy(() => import('@renderer/pages/expenses-page').then((m) => ({ default: m.ExpensesPage })))
const SalesHistoryPage = lazy(() => import('@renderer/pages/sales-history-page').then((m) => ({ default: m.SalesHistoryPage })))
const ReturnsPage = lazy(() => import('@renderer/pages/returns-page').then((m) => ({ default: m.ReturnsPage })))
const ReportsPage = lazy(() => import('@renderer/pages/reports-page').then((m) => ({ default: m.ReportsPage })))
const EmployeesPage = lazy(() => import('@renderer/pages/employees-page').then((m) => ({ default: m.EmployeesPage })))
const BranchesPage = lazy(() => import('@renderer/pages/branches-page').then((m) => ({ default: m.BranchesPage })))
const SubscriptionPage = lazy(() => import('@renderer/pages/subscription-page').then((m) => ({ default: m.SubscriptionPage })))
const SettingsPage = lazy(() => import('@renderer/pages/settings/settings-page').then((m) => ({ default: m.SettingsPage })))

type Phase = 'booting' | 'login' | 'device-setup' | 'device-blocked' | 'syncing' | 'ready'

export default function App(): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>('booting')
  const [blockedMessage, setBlockedMessage] = useState('')
  const { status: authStatus, user, setSession } = useAuthStore()
  const { setBranch, setFeatures, setDevice } = useAppStore()
  const setOnline = useSyncStore((s) => s.setOnline)
  const setProgress = useSyncStore((s) => s.setProgress)
  const setSyncStatus = useSyncStore((s) => s.setStatus)

  // One-time subscriptions + boot sequence.
  useEffect(() => {
    void initTheme()

    const unsubOnline = window.pos.system.onOnlineStatusChange(setOnline)
    const unsubProgress = window.pos.sync.onProgress(setProgress)
    const unsubStatus = window.pos.sync.onStatusChange(setSyncStatus)
    const unsubUpdater = window.pos.updater.onEvent((event) => {
      if (event.type === 'update-downloaded') {
        toast({ variant: 'info', title: 'Update ready', description: 'Restart to install the latest version.' })
      } else if (event.type === 'error') {
        toast({ variant: 'error', title: 'Update check failed', description: event.message })
      }
    })

    void window.pos.system.getOnlineStatus().then(setOnline)
    void bootstrap()

    return () => {
      unsubOnline()
      unsubProgress()
      unsubStatus()
      unsubUpdater()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadContext(): Promise<void> {
    const context = await window.pos.context.get()
    setBranch(context.branch)
    setFeatures(context.features)
    applyBusinessContext(context.business)

    // Pick up profile/logo changes made on the server (Settings, or by the
    // Super Admin) without waiting for a full re-sync. Offline → keeps the
    // cached copy; never blocks boot.
    void refreshBusinessContext()
  }

  async function evaluateDevice(): Promise<void> {
    let deviceStatus: DeviceStatus = await window.pos.device.getStatus()
    setDevice(deviceStatus)

    if (!deviceStatus.isRegistered) {
      setPhase('device-setup')
      return
    }

    const validation = await window.pos.device.validate()
    if (validation.unauthorized) {
      setBlockedMessage(validation.message ?? 'This device is no longer authorized.')
      setPhase('device-blocked')
      return
    }
    deviceStatus = validation
    setDevice(deviceStatus)

    await loadContext()

    const syncStatus = await window.pos.sync.getStatus()
    if (!syncStatus.lastFullSyncAt) {
      setPhase('syncing')
      try {
        await window.pos.sync.runInitial()
        // The loadContext() above ran before this device had ever synced —
        // on a first sync (or right after a re-registration, which now
        // resets the cached business/branch rows, see deviceManager.
        // register()) that read whatever was cached at the time, which can
        // be stale or empty. Reload once more now that runInitial() has
        // actually written the correct business/branch into local SQLite.
        await loadContext()
        setPhase('ready')
      } catch {
        // SyncingScreen shows the retry action itself via progress state.
      }
      return
    }

    setPhase('ready')
  }

  async function bootstrap(): Promise<void> {
    const session = await window.pos.auth.restoreSession()
    setSession(session.user)
    if (!session.isAuthenticated) {
      setPhase('login')
      return
    }
    await evaluateDevice()
  }

  // Re-evaluate whenever auth status flips signed-in <-> signed-out during runtime.
  useEffect(() => {
    if (phase === 'booting') return
    if (authStatus === 'signed-out') {
      setPhase('login')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus])

  if (phase === 'booting') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <LoadingState label="Starting Universal POS..." />
      </div>
    )
  }

  if (phase === 'login') {
    return (
      <>
        <LoginPage onSuccess={evaluateDevice} />
        <Toaster />
      </>
    )
  }

  if (phase === 'device-setup') {
    return (
      <>
        <DeviceSetupPage
          onRegistered={async (status) => {
            setDevice(status)
            setPhase('syncing')
            // deviceManager.register() just reset the cached business/branch
            // rows (see its comment), so this first loadContext() has
            // nothing meaningful to show yet — it's only here so the store
            // isn't left holding a PREVIOUS device's context while syncing
            // runs. The real load happens after runInitial() below, once
            // the newly-registered business/branch have actually landed in
            // local SQLite.
            await loadContext()
            try {
              await window.pos.sync.runInitial()
              await loadContext()
            } finally {
              setPhase('ready')
            }
          }}
        />
        <Toaster />
      </>
    )
  }

  if (phase === 'device-blocked') {
    return (
      <>
        <DeviceBlockedScreen
          message={blockedMessage}
          onSignOut={async () => {
            // The server no longer recognizes this device's credential (401)
            // — clear it along with the session, not just the session.
            // Otherwise the next login re-runs evaluateDevice() with the
            // same stale isRegistered:true device record, immediately fails
            // validate() again, and traps the user on this exact screen in
            // an unrecoverable loop. Forgetting the device here routes the
            // next login to the normal "device-setup" (register) screen.
            await window.pos.device.forget()
            await window.pos.auth.logout()
            setDevice(await window.pos.device.getStatus())
            setSession(null)
            setPhase('login')
          }}
        />
        <Toaster />
      </>
    )
  }

  if (phase === 'syncing') {
    return (
      <>
        <SyncingScreen onRetry={() => void window.pos.sync.runInitial().then(() => setPhase('ready'))} />
        <Toaster />
      </>
    )
  }

  return (
    <>
      <Suspense fallback={<LoadingState />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/pos" element={<PosPage />} />
            <Route path="/sales" element={<SalesHistoryPage />} />
            <Route path="/returns" element={<ReturnsPage />} />
            <Route path="/products/*" element={<ProductsPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/purchases" element={<PurchasesPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/branches" element={<BranchesPage />} />
            <Route path="/subscription" element={<SubscriptionPage />} />
            <Route path="/settings/*" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </Suspense>
      <Toaster />
      {import.meta.env.DEV && <DebugUser email={user?.email} />}
    </>
  )
}

function DebugUser({ email }: { email?: string }): null {
  useEffect(() => {
    if (email) console.info(`[dev] signed in as ${email}`)
  }, [email])
  return null
}

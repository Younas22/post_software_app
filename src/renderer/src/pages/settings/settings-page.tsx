import { NavLink, Route, Routes, Navigate } from 'react-router-dom'
import { cn } from '@renderer/lib/cn'
import { AccountSettings } from './account-settings'
import { BusinessSettings } from './business-settings'
import { PrinterSettings } from './printer-settings'
import { SyncSettings } from './sync-settings'
import { ConnectionSettings } from './connection-settings'
import { AboutSettings } from './about-settings'

const SECTIONS = [
  { to: '/settings/account', label: 'Account' },
  { to: '/settings/business', label: 'Business' },
  { to: '/settings/printer', label: 'Printer' },
  { to: '/settings/sync', label: 'Sync Status' },
  { to: '/settings/connection', label: 'Connection' },
  { to: '/settings/about', label: 'About & Updates' }
]

export function SettingsPage(): React.JSX.Element {
  return (
    <div className="flex h-full">
      <nav className="w-52 shrink-0 border-r border-border p-4">
        <h1 className="mb-3 px-2 text-sm font-semibold">Settings</h1>
        <div className="space-y-0.5">
          {SECTIONS.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              className={({ isActive }) =>
                cn('block rounded-md px-2.5 py-1.5 text-sm', isActive ? 'bg-brand-soft text-brand font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground')
              }
            >
              {s.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <div className="min-w-0 flex-1 overflow-y-auto">
        <Routes>
          <Route index element={<Navigate to="account" replace />} />
          <Route path="account" element={<AccountSettings />} />
          <Route path="business" element={<BusinessSettings />} />
          <Route path="printer" element={<PrinterSettings />} />
          <Route path="sync" element={<SyncSettings />} />
          <Route path="connection" element={<ConnectionSettings />} />
          <Route path="about" element={<AboutSettings />} />
        </Routes>
      </div>
    </div>
  )
}

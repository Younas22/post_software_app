import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Catches render errors thrown by whatever page is currently mounted in
 * AppShell's <Outlet/> (see reports-page.tsx's stale-response race for a
 * real example) so a bug in ONE page shows a contained "something went
 * wrong" panel instead of unmounting the entire window — sidebar, topbar,
 * and all — down to a blank white screen with no way back except a full
 * app restart. "Try again" just remounts the crashed subtree; the sidebar
 * (outside this boundary) is unaffected the whole time, so navigating
 * elsewhere always works even while this is showing.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Route render error:', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <AlertTriangle className="size-8 text-error" />
          <p className="text-sm font-medium">This page hit an unexpected error.</p>
          <p className="max-w-md text-xs text-muted-foreground">{this.state.error.message}</p>
          <Button variant="outline" onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}

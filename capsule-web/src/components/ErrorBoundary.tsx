import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button, Tile } from '@carbon/react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string | null
}

/**
 * App-wide error boundary. A render/runtime error anywhere below this point
 * would otherwise white-screen the whole SPA; instead we catch it and show a
 * recoverable Carbon panel with a Reload action.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surfacing to the console keeps the stack available for debugging.
    console.error('Unhandled UI error:', error, info)
  }

  handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="capsule-login">
        <Tile className="capsule-login-card">
          <h1 className="capsule-login-title">Une erreur est survenue</h1>
          <p className="capsule-login-subtitle" style={{ marginBottom: '1.5rem' }}>
            L'application a rencontré une erreur inattendue. Recharger la page suffit généralement à la corriger.
          </p>
          <Button onClick={this.handleReload}>Recharger</Button>
        </Tile>
      </div>
    )
  }
}

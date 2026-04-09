/**
 * SectionErrorBoundary – A lightweight ErrorBoundary for individual page sections.
 *
 * When a section crashes it shows a minimal fallback with a retry button instead
 * of taking down the entire page.
 */
import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  sectionName: string
  children: ReactNode
}

interface State {
  hasError: boolean
  errorMessage: string
}

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[SectionErrorBoundary] Section "${this.props.sectionName}" crashed:`, error, info)
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' })
  }

  render() {
    if (this.state.hasError) {
      // Only expose error details in development environments to avoid
      // leaking internal implementation details (file paths, stack frames, etc.)
      const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development'
      return (
        <div
          className="py-12 px-6 flex flex-col items-center gap-4 text-center"
          aria-live="polite"
          role="alert"
        >
          <div className="font-mono text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded px-4 py-2">
            [{this.props.sectionName}] – Failed to render
          </div>
          {isDev && this.state.errorMessage && (
            <p className="font-mono text-xs text-muted-foreground max-w-sm break-words">
              {this.state.errorMessage}
            </p>
          )}
          <button
            onClick={this.handleRetry}
            className="font-mono text-xs px-4 py-2 border border-border rounded hover:border-primary hover:text-primary transition-colors"
          >
            ↺ Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

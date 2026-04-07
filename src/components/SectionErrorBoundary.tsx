/**
 * SectionErrorBoundary – A lightweight ErrorBoundary for individual page sections.
 *
 * When a section crashes it shows a minimal fallback instead of taking down
 * the entire page.
 */
import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  sectionName: string
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[SectionErrorBoundary] Section "${this.props.sectionName}" crashed:`, error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="py-8 px-4 text-center text-muted-foreground text-sm font-mono" aria-live="polite">
          [{this.props.sectionName}] – Failed to load. Please refresh the page.
        </div>
      )
    }
    return this.props.children
  }
}

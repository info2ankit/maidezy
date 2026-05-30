import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-danger-light flex items-center justify-center mb-4">
          <span className="text-danger text-2xl font-bold">!</span>
        </div>
        <h1 className="font-heading font-bold text-gray-900 text-xl mb-2">
          Something went wrong
        </h1>
        <p className="font-body text-sm text-gray-500 max-w-xs mb-6">
          The app hit an unexpected error. Reload to continue.
        </p>
        <button
          onClick={this.handleReload}
          className="bg-primary text-white font-body font-semibold px-6 py-2.5 rounded-xl text-sm"
        >
          Reload app
        </button>
        {import.meta.env.DEV && (
          <pre className="mt-6 text-left text-[10px] text-gray-400 max-w-md overflow-auto max-h-48 bg-white p-3 rounded-lg border border-gray-100">
            {this.state.error.message}
          </pre>
        )}
      </div>
    )
  }
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import ErrorBoundary from '@/shared/components/ErrorBoundary'
import PwaUpdatePrompt from '@/shared/components/PwaUpdatePrompt'
import '@/lib/i18n'
import '@/styles/index.scss'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
      <PwaUpdatePrompt />
    </ErrorBoundary>
  </React.StrictMode>
)

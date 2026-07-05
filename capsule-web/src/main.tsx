import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { ApiError } from './api/client'
import { notify } from './store/useNotifications'
import './styles.scss'

const queryClient = new QueryClient({
  // Global feedback: every mutation error raises an error toast; mutations may
  // opt into a success toast via `meta.successMessage`.
  mutationCache: new MutationCache({
    onError: (error) => {
      const status = error instanceof ApiError ? error.status : 0
      notify.error(
        'Action failed',
        status ? `${(error as Error).message}` : (error as Error).message,
      )
    },
    onSuccess: (_data, _vars, _ctx, mutation) => {
      const msg = mutation.options.meta?.successMessage
      if (msg) notify.success(String(msg))
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // Retry transient server conditions (429 rate-limit, 5xx) a few times with
      // backoff; don't retry client errors like 401/403/404.
      retry: (failureCount, error) => {
        const status = error instanceof ApiError ? error.status : 0
        if (status === 429 || status >= 500) return failureCount < 3
        return failureCount < 1
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)

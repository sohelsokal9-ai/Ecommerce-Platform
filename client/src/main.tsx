import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {QueryClient, QueryClientProvider} from "@tanstack/react-query"
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './components/theme-provider.tsx'
import { Toaster } from './components/ui/sonner.tsx'
import { TooltipProvider } from './components/ui/tooltip.tsx'
import ErrorBoundary from './components/error-boundary.tsx'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <QueryClientProvider client={queryClient}>
     <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
    <TooltipProvider>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </TooltipProvider>
            <Toaster richColors />
      </ThemeProvider>
      </QueryClientProvider>
  </StrictMode>,
)

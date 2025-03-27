import { ScreenProvider } from './context/ScreenContext'
import { ThemeProvider } from './context/ThemeContext'
import { SettingsProvider } from './context/SettingsContext'
import { AppContent } from './components/AppContent'
import { Toaster } from './components/ui/toast'
import './App.css'
import { Suspense } from 'react'

// Simple loading component
function Loading() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading Data Deck...</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <Suspense fallback={<Loading />}>
        <SettingsProvider>
          <ScreenProvider>
            <AppContent />
            <Toaster />
          </ScreenProvider>
        </SettingsProvider>
      </Suspense>
    </ThemeProvider>
  )
}

export default App

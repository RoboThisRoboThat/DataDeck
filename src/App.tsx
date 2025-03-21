import { ScreenProvider } from './context/ScreenContext'
import { ThemeProvider } from './context/ThemeContext'
import { AppContent } from './components/AppContent'
import './App.css'

function App() {
  return (
    <ThemeProvider>
      <ScreenProvider>
        <AppContent />
      </ScreenProvider>
    </ThemeProvider>
  )
}

export default App

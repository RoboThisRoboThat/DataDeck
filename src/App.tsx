import { ScreenProvider } from './context/ScreenContext'
import { AppContent } from './components/AppContent'
import './App.css'

function App() {
  return (
    <ScreenProvider>
      <AppContent />
    </ScreenProvider>
  )
}

export default App

import { useScreen } from '../context/ScreenContext'
import { ConnectionScreen } from '../screens/ConnectionScreen'
import { TablesScreen } from '../screens/TablesScreen'

export function AppContent() {
  const { currentScreen } = useScreen()

  switch (currentScreen) {
    case 'connection':
      return <ConnectionScreen />
    case 'tables':
      return <TablesScreen />
    default:
      return <ConnectionScreen />
  }
} 
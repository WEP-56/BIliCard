import { useEffect } from 'react'
import { Canvas } from './components/canvas/Canvas'
import { useUserStore } from './store/useUserStore'

function App() {
  const cookie = useUserStore((state) => state.cookie)

  // Sync cookie to Electron session on startup and when changed
  useEffect(() => {
    if (cookie && (window as any).ipcRenderer) {
       (window as any).ipcRenderer.invoke('set-cookie', cookie)
    }
  }, [cookie])

  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent">
      <Canvas />
    </div>
  )
}

export default App

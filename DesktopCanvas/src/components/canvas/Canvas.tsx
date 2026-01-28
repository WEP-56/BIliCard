import React, { useRef, useState } from 'react'
import { useGesture } from '@use-gesture/react'
import { useSpring, animated } from '@react-spring/web'
import { useShallow } from 'zustand/react/shallow'
import { useCanvasStore } from '../../store/useCanvasStore'
import { useCardStore } from '../../store/useCardStore'
import { Card } from '../cards/Card'

import { Lock, Unlock, Plus, Search, User, Zap, Tv, LogOut, Radio, Clock, Bookmark, Star, Flame, Settings } from 'lucide-react'
import { useUserStore } from '../../store/useUserStore'
import { setIgnoreMouseEvents } from '../../utils/ipc-mouse'



export const Canvas: React.FC = () => {
  // We only need isLocked from store, no viewport logic needed anymore
  const { isLocked, toggleLock } = useCanvasStore()
  const cards = useCardStore(useShallow((state) => Object.values(state.cards)))
  const addCard = useCardStore((state) => state.addCard)
  const userInfo = useUserStore((state) => state.userInfo)
  const canvasRef = useRef<HTMLDivElement>(null)
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Dock Drag Logic
  const [dockPosition, setDockPosition] = useState({ x: 0, y: 0 })
  const dockRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  
  const [isDockLocked, setIsDockLocked] = useState(false)

  const bindDock = useGesture({
      onDragStart: () => {
          if (isDockLocked) return
          setIsDragging(true)
          setIgnoreMouseEvents(false)
      },
      onDrag: ({ movement: [mx, my] }) => {
          if (isDockLocked) return
          if (dockRef.current) {
              const newX = dockPosition.x + mx
              const newY = dockPosition.y + my
              dockRef.current.style.transform = `translate(${newX}px, ${newY}px)`
          }
      },
      onDragEnd: ({ movement: [mx, my] }) => {
          if (isDockLocked) return
          setIsDragging(false)
          setDockPosition(prev => ({ x: prev.x + mx, y: prev.y + my }))
      }
  })

  return (
    <div
      ref={canvasRef}
      className="w-full h-screen overflow-hidden relative cursor-default bg-transparent"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* No transform wrapper needed anymore, cards are absolute positioned on screen */}
      
      {/* Render Cards */}
      {cards
          .map((card) => (
          <Card key={card.id} data={card} />
      ))}

      {/* Floating Dock (Right Bottom) */}
      <div 
          ref={dockRef}
          {...bindDock()} 
          style={{ transform: `translate(${dockPosition.x}px, ${dockPosition.y}px)`, touchAction: 'none' }} 
          className="fixed bottom-6 right-6 z-[9999]"
          onMouseEnter={() => setIgnoreMouseEvents(false)}
          onMouseLeave={() => {
              if (!isDragging) setIgnoreMouseEvents(true)
          }}
      >
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur shadow-lg border border-gray-200/50 p-2 rounded-2xl transition-all hover:scale-105 cursor-grab active:cursor-grabbing">
          <button 
             onClick={() => {
                 addCard({
                     id: `feed-${Date.now()}`,
                     type: 'feed',
                     title: 'Recommended',
                     x: window.innerWidth / 2 - 180,
                     y: window.innerHeight / 2 - 300,
                     w: 360,
                     h: 600
                 })
             }}
             className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-700"
             title="Recommended Feed"
          >
             <Flame size={20} />
          </button>
          
          <button 
             onClick={() => {
                 addCard({
                     id: `search-${Date.now()}`,
                     type: 'search',
                     title: 'Search',
                     x: window.innerWidth / 2 - 200,
                     y: window.innerHeight / 2 - 250,
                     w: 400,
                     h: 500
                 })
             }}
             className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-700"
             title="Search"
          >
             <Search size={20} />
          </button>
          
          <button 
             onClick={() => {
                 addCard({
                     id: `dynamic-${Date.now()}`,
                     type: 'dynamic',
                     title: 'Following',
                     x: window.innerWidth / 2 - 190,
                     y: window.innerHeight / 2 - 300,
                     w: 380,
                     h: 600
                 })
             }}
             className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-700"
             title="Following"
          >
             <Zap size={20} />
          </button>

          <button 
             onClick={() => {
                 addCard({
                     id: `bangumi-${Date.now()}`,
                     type: 'bangumi',
                     title: 'Anime',
                     x: window.innerWidth / 2 - 180,
                     y: window.innerHeight / 2 - 250,
                     w: 360,
                     h: 500
                 })
             }}
             className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-700"
             title="Anime"
          >
             <Tv size={20} />
          </button>

          {/* Drawer Items */}
          <div className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ease-in-out ${isDrawerOpen ? 'w-[120px] opacity-100' : 'w-0 opacity-0'}`}>
            <button 
                onClick={() => {
                    addCard({
                        id: `history-${Date.now()}`,
                        type: 'history',
                        title: 'History',
                        x: window.innerWidth / 2 - 180,
                        y: window.innerHeight / 2 - 250,
                        w: 360,
                        h: 600
                    })
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-700"
                title="History"
            >
                <Clock size={20} />
            </button>

            <button 
                onClick={() => {
                    addCard({
                        id: `toview-${Date.now()}`,
                        type: 'toview',
                        title: 'To View',
                        x: window.innerWidth / 2 - 180,
                        y: window.innerHeight / 2 - 250,
                        w: 360,
                        h: 600
                    })
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-700"
                title="To View"
            >
                <Bookmark size={20} />
            </button>

            <button 
                onClick={() => {
                    addCard({
                        id: `favorites-${Date.now()}`,
                        type: 'favorites',
                        title: 'Favorites',
                        x: window.innerWidth / 2 - 180,
                        y: window.innerHeight / 2 - 250,
                        w: 360,
                        h: 600
                    })
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-700"
                title="Favorites"
            >
                <Star size={20} />
            </button>
          </div>

          <button 
             onClick={() => setIsDrawerOpen(!isDrawerOpen)}
             className={`p-2 hover:bg-gray-100 rounded-xl transition-all duration-300 text-gray-700 ${isDrawerOpen ? 'rotate-45' : 'rotate-0'}`}
             title="More"
          >
             <Plus size={20} />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-1"></div>

          <button 
             onClick={() => {
                 addCard({
                     id: `login`,
                     type: 'login',
                     title: userInfo ? 'User Profile' : 'Login',
                     x: window.innerWidth / 2 - 150,
                     y: window.innerHeight / 2 - 200,
                     w: 300,
                     h: 400
                 })
             }}
             className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-700 relative"
             title="Login / Profile"
          >
             {userInfo ? (
                <div className="w-5 h-5 rounded-full overflow-hidden border border-gray-300">
                    <img src={userInfo.face} className="w-full h-full object-cover" />
                </div>
             ) : (
                <User size={20} />
             )}
          </button>
          
          <button 
             onClick={() => setIsDockLocked(!isDockLocked)}
            className={`p-2 rounded-xl transition-colors text-gray-700 ${isDockLocked ? 'bg-red-100 text-red-500' : 'hover:bg-gray-100'}`}
            title={isDockLocked ? "Unlock Dock" : "Lock Dock Position"}
         >
            {isDockLocked ? <Lock size={20} /> : <Unlock size={20} />}
         </button>

         <div className="w-px h-6 bg-gray-300 mx-1"></div>

         <button 
            onClick={() => {
                if (confirm('Quit BiliCard?')) {
                    (window as any).ipcRenderer?.send('quit-app')
                }
            }}
            className="p-2 hover:bg-red-100 text-red-500 rounded-xl transition-colors"
            title="Quit Application"
         >
            <LogOut size={20} />
         </button>

         <button 
            onClick={() => {
                addCard({
                    id: `settings-${Date.now()}`,
                    type: 'settings',
                    title: 'Settings',
                    x: window.innerWidth / 2 - 150,
                    y: window.innerHeight / 2 - 200,
                    w: 300,
                    h: 400
                })
            }}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-700"
            title="Settings"
         >
            <Settings size={20} />
         </button>
      </div>
    </div>
    </div>
  )
}

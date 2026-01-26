import React, { useRef } from 'react'
import { useGesture } from '@use-gesture/react'
import { useShallow } from 'zustand/react/shallow'
import { useCanvasStore } from '../../store/useCanvasStore'
import { useCardStore } from '../../store/useCardStore'
import { Card } from '../cards/Card'

import { Lock, Unlock, Plus, Search, User, Zap, Tv, LogOut, Radio } from 'lucide-react'
import { useUserStore } from '../../store/useUserStore'
import { setIgnoreMouseEvents } from '../../utils/ipc-mouse'

// Wrapper for UI elements to make them interactive
const Interactive: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <div 
      className={className}
      onMouseEnter={() => setIgnoreMouseEvents(false)}
      onMouseLeave={() => setIgnoreMouseEvents(true)}
      onPointerDown={(e) => {
          // Ensure clicks on interactive elements don't bubble up to unexpected places
          // e.stopPropagation() 
      }}
    >
        {children}
    </div>
)

export const Canvas: React.FC = () => {
  // We only need isLocked from store, no viewport logic needed anymore
  const { isLocked, toggleLock } = useCanvasStore()
  const cards = useCardStore(useShallow((state) => Object.values(state.cards)))
  const addCard = useCardStore((state) => state.addCard)
  const userInfo = useUserStore((state) => state.userInfo)
  const canvasRef = useRef<HTMLDivElement>(null)

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
      <Interactive className="fixed bottom-6 right-6 flex items-center gap-2 bg-white/90 backdrop-blur shadow-lg border border-gray-200/50 p-2 rounded-2xl transition-all hover:scale-105 z-[9999]">
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
             title="Add Feed"
          >
             <Plus size={20} />
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

          <button 
             onClick={() => {
                 addCard({
                     id: `live-${Date.now()}`,
                     type: 'live',
                     title: 'Live',
                     x: window.innerWidth / 2 - 180,
                     y: window.innerHeight / 2 - 250,
                     w: 360,
                     h: 600
                 })
             }}
             className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-700"
             title="Live"
          >
             <Radio size={20} />
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
             onClick={toggleLock}
            className={`p-2 rounded-xl transition-colors text-gray-700 ${isLocked ? 'bg-red-100 text-red-500' : 'hover:bg-gray-100'}`}
            title={isLocked ? "Unlock Cards" : "Lock Cards"}
         >
            {isLocked ? <Lock size={20} /> : <Unlock size={20} />}
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
      </Interactive>
    </div>
  )
}

import React, { useRef, useEffect } from 'react'
import { useGesture } from '@use-gesture/react'
import { useCardStore, type CardState } from '../../store/useCardStore'
import { useCanvasStore } from '../../store/useCanvasStore'
import { X, Pin } from 'lucide-react'
import { FeedCard } from './feed/FeedCard'
import { SearchCard } from './search/SearchCard'
import { LoginCard } from './login/LoginCard'
import { DynamicCard } from './dynamic/DynamicCard'
import { BangumiCard } from './bangumi/BangumiCard'
import { VideoPlayer } from './detail/VideoPlayer'
import { LiveCard } from './live/LiveCard'
import { LivePlayer } from './live/LivePlayer'
import { setIgnoreMouseEvents } from '../../utils/ipc-mouse'

interface CardProps {
  data: CardState
}

export const Card: React.FC<CardProps> = React.memo(({ data }) => {
  const updateCard = useCardStore((state) => state.updateCard)
  const focusCard = useCardStore((state) => state.focusCard)
  const removeCard = useCardStore((state) => state.removeCard)
  const toggleCardLock = useCardStore((state) => state.toggleCardLock)
  const scale = useCanvasStore((state) => state.scale)
  
  const cardRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)

  // Ensure mouse events are reset when card is unmounted
  useEffect(() => {
    return () => {
        setIgnoreMouseEvents(true)
    }
  }, [])

  const bind = useGesture(
    {
      onDrag: ({ delta: [dx, dy], first, last, event, movement: [mx, my], memo }) => {
        if (useCanvasStore.getState().isLocked) return memo
        
        if (first) {
            focusCard(data.id)
            isDraggingRef.current = true
            // Return initial position as memo
            return [data.x, data.y]
        }

        event.stopPropagation()
        
        // memo holds the starting [x, y] of the card
        const startX = memo[0]
        const startY = memo[1]
        
        // Calculate new position based on movement delta and scale
        const currentX = startX + mx / scale
        const currentY = startY + my / scale
        
        if (cardRef.current) {
            // Apply transform directly to DOM for performance
            cardRef.current.style.transform = `translate(${currentX}px, ${currentY}px)`
        }

        if (last) {
            isDraggingRef.current = false
            updateCard(data.id, { x: currentX, y: currentY })
        }

        return memo
      },
    },
    {
        drag: {
            from: () => [data.x, data.y],
        }
    }
  )

  return (
    <div
      ref={cardRef}
      className="absolute bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col overflow-hidden"
      style={{
        left: 0,
        top: 0,
        width: data.w,
        height: data.h,
        // When not dragging, we rely on React's render for position
        // When dragging, we override via style.transform
        transform: `translate(${data.x}px, ${data.y}px)`,
        zIndex: data.zIndex,
        // touchAction: 'none' // REMOVED: This blocks scrolling on touch devices. We only need it on the header.
      }}
      onPointerDown={() => focusCard(data.id)}
      onMouseEnter={() => setIgnoreMouseEvents(false)}
      onMouseLeave={() => setIgnoreMouseEvents(true)}
    >
      {/* Header / Drag Handle */}
      <div 
        {...bind()} 
        className={`h-8 border-b border-gray-100 flex items-center justify-between px-3 cursor-move select-none ${data.isLocked ? 'bg-gray-50' : 'bg-white'}`}
        style={{ touchAction: 'none' }} // Added: Keep drag working properly
        onPointerDown={(e) => {
          if (!data.isLocked) {
            focusCard(data.id)
          }
          // Chain the bind's onPointerDown handler if it exists
          const bindProps = bind()
          if (bindProps.onPointerDown) {
              bindProps.onPointerDown(e)
          }
        }}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 truncate flex-1">
           {data.title}
        </div>
        <div className="flex items-center gap-1">
            <button 
                className={`p-1 rounded transition-colors ${data.isLocked ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-400'}`}
                onPointerDown={(e) => { e.stopPropagation(); }}
                onClick={(e) => { 
                    e.stopPropagation(); 
                    toggleCardLock(data.id); 
                }}
                title={data.isLocked ? "Unlock Card" : "Lock Card"}
            >
                <Pin size={14} className={data.isLocked ? "fill-current" : ""} />
            </button>
            <button 
                className="p-1 hover:bg-red-50 hover:text-red-500 rounded transition-colors text-gray-400"
                onPointerDown={(e) => { e.stopPropagation(); }}
                onClick={(e) => {
                    e.stopPropagation()
                    removeCard(data.id)
                }}
            >
                <X size={14} />
            </button>
        </div>
      </div>

      {/* Content Area */}
      <div 
        className="flex-1 overflow-auto bg-white cursor-auto relative" 
        onPointerDown={(e) => {
             // Allow bubbling to focus card, but ensure we don't block interaction
             // Removed e.stopPropagation() to allow focus on click
        }}
        onWheel={(e) => e.stopPropagation()} 
      >
        {data.type === 'feed' && <FeedCard />}
        {data.type === 'search' && <SearchCard />}
        {data.type === 'login' && <LoginCard />}
        {data.type === 'dynamic' && <DynamicCard />}
        {data.type === 'bangumi' && <BangumiCard />}
        {data.type === 'live' && <LiveCard />}
        {data.type === 'live-player' && (
            <LivePlayer {...data.content} cardId={data.id} />
        )}
        
        {data.type === 'detail' && (
            <VideoPlayer {...data.content} cardId={data.id} />
        )}
      </div>
    </div>
  )
})

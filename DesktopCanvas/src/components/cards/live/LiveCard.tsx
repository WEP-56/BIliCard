import React, { useEffect, useState } from 'react'
import { BiliService, type LiveItem } from '../../../services/bili-service'
import { useCardStore } from '../../../store/useCardStore'
import { useUserStore } from '../../../store/useUserStore'
import { PlayCircle, Search } from 'lucide-react'

export const LiveCard: React.FC = () => {
  const [items, setItems] = useState<LiveItem[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [searchMode, setSearchMode] = useState(false)
  
  const addCard = useCardStore((state) => state.addCard)
  const userInfo = useUserStore((state) => state.userInfo)

  useEffect(() => {
    if (!searchMode) {
        const fetchLive = async () => {
          setLoading(true)
          const data = await BiliService.getLiveFeed()
          setItems(data)
          setLoading(false)
        }
        fetchLive()
    }
  }, [searchMode])

  const handleSearch = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!keyword.trim()) return
      
      setSearchMode(true)
      setLoading(true)
      const data = await BiliService.searchLive(keyword)
      setItems(data)
      setLoading(false)
  }

  const handleRoomClick = async (room: LiveItem) => {
      try {
        // Get Real Room ID first
        const roomInfo = await BiliService.getLiveRoomInfo(room.roomid)
        const realRoomId = roomInfo?.room_id || room.roomid

        addCard({
            id: `live-${realRoomId}`,
            type: 'live-player',
            title: `Live: ${room.uname}`,
            x: 400,
            y: 200,
            w: 800,
            h: 600,
            content: {
                roomId: realRoomId,
                title: room.title,
                uname: room.uname,
                face: room.face
            }
        })
      } catch (e) {
        console.error('Failed to open live stream:', e)
      }
  }

  return (
    <div className="flex flex-col h-full">
        {/* Search Header */}
        <div className="p-3 border-b border-gray-100 bg-white sticky top-0 z-10">
            <form onSubmit={handleSearch} className="relative">
                <input 
                    type="text" 
                    placeholder="Search Live Rooms..." 
                    className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                />
                <button 
                    type="submit"
                    className="absolute left-3 top-2.5 text-gray-400 hover:text-pink-500 transition-colors"
                >
                    <Search size={16} />
                </button>
                {searchMode && (
                    <button 
                        type="button"
                        onClick={() => { setSearchMode(false); setKeyword(''); }}
                        className="absolute right-3 top-2.5 text-xs text-gray-500 hover:text-gray-700"
                    >
                        Clear
                    </button>
                )}
            </form>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-2 space-y-3">
            {loading ? (
                 <div className="text-center text-gray-500 py-10">Searching Live Streams...</div>
            ) : items.length === 0 ? (
                 <div className="text-center text-gray-500 py-10">
                    {searchMode ? 'No rooms found' : 'Search for live rooms'}
                 </div>
            ) : (
                items.map((item, index) => (
                    <div 
                        key={`${item.roomid}-${index}`} 
                        className="group flex gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                        onClick={() => handleRoomClick(item)}
                    >
                        {/* Thumbnail */}
                        <div className="relative w-32 h-20 flex-shrink-0 rounded overflow-hidden bg-gray-200">
                            <img 
                                src={item.cover || item.face} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                loading="lazy"
                            />
                            <div className="absolute top-1 right-1 bg-pink-500 text-white text-[10px] px-1 rounded">
                                {item.online ? 'LIVE' : 'OFFLINE'}
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-opacity">
                                <PlayCircle className="text-white drop-shadow-md" size={24} />
                            </div>
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <h3 className="text-sm font-medium text-gray-800 line-clamp-1 mb-1" title={item.title}>
                                {item.title}
                            </h3>
                            <div className="flex items-center gap-2 mb-1">
                                <img src={item.face} className="w-4 h-4 rounded-full" />
                                <span className="text-xs text-gray-600 truncate">{item.uname}</span>
                            </div>
                            <span className="text-xs text-gray-400">{item.area_name}</span>
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
  )
}

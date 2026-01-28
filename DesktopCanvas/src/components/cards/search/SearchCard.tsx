import React, { useState } from 'react'
import { BiliService, type VideoItem, type LiveItem } from '../../../services/bili-service'
import { Search, PlayCircle, Video, Radio } from 'lucide-react'
import { useCardStore } from '../../../store/useCardStore'

export const SearchCard: React.FC = () => {
  const [keyword, setKeyword] = useState('')
  const [searchType, setSearchType] = useState<'video' | 'live'>('video')
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [lives, setLives] = useState<LiveItem[]>([])
  const [loading, setLoading] = useState(false)
  const addCard = useCardStore((state) => state.addCard)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyword.trim()) return

    setLoading(true)
    if (searchType === 'video') {
        const items = await BiliService.searchVideos(keyword)
        setVideos(items)
        setLives([])
    } else {
        const items = await BiliService.searchLive(keyword)
        setLives(items)
        setVideos([])
    }
    setLoading(false)
  }

  const handleVideoClick = (video: VideoItem) => {
      addCard({
          id: `video-${video.bvid}`,
          type: 'detail',
          title: video.title,
          x: 400,
          y: 200,
          w: 800,
          h: 800,
          content: video
      })
  }

  const handleLiveClick = async (live: LiveItem) => {
      try {
        const roomInfo = await BiliService.getLiveRoomInfo(live.roomid)
        const realRoomId = roomInfo?.room_id || live.roomid

        addCard({
            id: `live-${realRoomId}`,
            type: 'live-player',
            title: `Live: ${live.uname}`,
            x: 400,
            y: 200,
            w: 800,
            h: 600,
            content: {
                roomId: realRoomId,
                title: live.title,
                uname: live.uname,
                face: live.face
            }
        })
      } catch (e) {
        console.error(e)
      }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Search Header */}
      <div className="p-3 border-b border-gray-100 space-y-2 sticky top-0 bg-white z-10">
          <form onSubmit={handleSearch} className="relative">
            <input 
                type="text" 
                placeholder={searchType === 'video' ? "Search Videos..." : "Search Live Rooms..."}
                className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
            />
            <button 
                type="submit"
                className="absolute left-3 top-2.5 text-gray-400 hover:text-pink-500 transition-colors"
            >
                <Search size={16} />
            </button>
          </form>
          
          {/* Tabs */}
          <div className="flex gap-2">
              <button 
                  onClick={() => setSearchType('video')}
                  className={`flex-1 py-1 text-xs rounded-lg flex items-center justify-center gap-1 transition-colors ${searchType === 'video' ? 'bg-pink-50 text-pink-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                  <Video size={14} /> Video
              </button>
              <button 
                  onClick={() => setSearchType('live')}
                  className={`flex-1 py-1 text-xs rounded-lg flex items-center justify-center gap-1 transition-colors ${searchType === 'live' ? 'bg-pink-50 text-pink-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                  <Radio size={14} /> Live
              </button>
          </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-2">
        {loading ? (
            <div className="text-center text-gray-500 py-10">Searching...</div>
        ) : (
            <div className="grid grid-cols-1 gap-2">
                {searchType === 'video' && videos.map((video) => (
                    <div 
                        key={video.bvid} 
                        className="flex gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                        onClick={() => handleVideoClick(video)}
                    >
                        <div className="relative w-24 h-14 flex-shrink-0 rounded overflow-hidden bg-gray-200">
                            <img src={video.pic} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                            <div className="absolute bottom-0.5 right-1 text-[10px] text-white bg-black/50 px-1 rounded">
                                {video.duration}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className="text-sm font-medium line-clamp-2 leading-tight" title={video.title}>{video.title}</div>
                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <span>{video.owner.name}</span>
                            </div>
                        </div>
                    </div>
                ))}

                {searchType === 'live' && lives.map((live) => (
                    <div 
                        key={live.roomid} 
                        className="flex gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                        onClick={() => handleLiveClick(live)}
                    >
                        <div className="relative w-24 h-14 flex-shrink-0 rounded overflow-hidden bg-gray-200">
                            <img src={live.cover || live.face} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                            <div className="absolute top-0.5 right-0.5 bg-pink-500 text-white text-[8px] px-1 rounded">
                                {live.online ? 'LIVE' : 'OFF'}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className="text-sm font-medium line-clamp-1 leading-tight" title={live.title}>{live.title}</div>
                            <div className="text-xs text-gray-500 mt-1">{live.uname}</div>
                        </div>
                    </div>
                ))}
                
                {!loading && ((searchType === 'video' && videos.length === 0) || (searchType === 'live' && lives.length === 0)) && (
                    <div className="text-center text-gray-400 py-10 text-sm">No results</div>
                )}
            </div>
        )}
      </div>
    </div>
  )
}

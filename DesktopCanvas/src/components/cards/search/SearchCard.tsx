import React, { useState } from 'react'
import { BiliService, type VideoItem } from '../../../services/bili-service'
import { Search, PlayCircle } from 'lucide-react'
import { useCardStore } from '../../../store/useCardStore'

export const SearchCard: React.FC = () => {
  const [keyword, setKeyword] = useState('')
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(false)
  const addCard = useCardStore((state) => state.addCard)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyword.trim()) return

    setLoading(true)
    const items = await BiliService.searchVideos(keyword)
    setVideos(items)
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
          h: 800, // Increased height
          content: video
      })
  }

  return (
    <div className="flex flex-col h-full">
      <form onSubmit={handleSearch} className="p-3 border-b flex gap-2">
        <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search Bilibili..."
            className="flex-1 px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onPointerDown={(e) => e.stopPropagation()} // Allow typing without dragging
        />
        <button 
            type="submit"
            className="p-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
            <Search size={16} />
        </button>
      </form>

      <div className="flex-1 overflow-auto p-2 space-y-3">
        {loading && <div className="text-center text-gray-500 py-4">Searching...</div>}
        
        {!loading && videos.length === 0 && keyword && (
             <div className="text-center text-gray-400 py-4">No results found</div>
        )}

        {videos.map((video) => (
          <div 
              key={video.bvid} 
              className="group flex gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
              onClick={() => handleVideoClick(video)}
          >
            {/* Thumbnail */}
            <div className="relative w-32 h-20 flex-shrink-0 rounded overflow-hidden bg-gray-200">
              <img 
                  src={video.pic} 
                  alt={video.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  loading="lazy"
                  referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-opacity">
                  <PlayCircle className="text-white drop-shadow-md" size={24} />
              </div>
            </div>
            
            {/* Meta */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-800 line-clamp-2 leading-tight mb-1" title={video.title}>
                  {video.title}
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="bg-gray-100 px-1 rounded text-gray-600">{video.owner.name}</span>
                  <span>{video.stat.view} views</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

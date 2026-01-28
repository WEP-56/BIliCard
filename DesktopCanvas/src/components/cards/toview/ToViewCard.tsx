import React, { useEffect, useState } from 'react'
import { BiliService } from '../../../services/bili-service'
import { PlayCircle, Clock } from 'lucide-react'
import { useCardStore } from '../../../store/useCardStore'

export const ToViewCard: React.FC = React.memo(() => {
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const addCard = useCardStore((state) => state.addCard)

  useEffect(() => {
    const fetchToView = async () => {
      setLoading(true)
      const items = await BiliService.getToView()
      setVideos(items)
      setLoading(false)
    }
    fetchToView()
  }, [])

  const handleVideoClick = async (video: any) => {
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

  if (loading) {
    return (
        <div className="space-y-4 p-2">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex gap-3">
                    <div className="w-32 h-20 bg-gray-200 rounded animate-pulse" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                        <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                    </div>
                </div>
            ))}
        </div>
    )
  }

  return (
    <div className="space-y-4 p-2 h-full overflow-y-auto">
      {videos.length === 0 ? (
          <div className="text-center text-gray-500 py-10">No videos in To View list</div>
      ) : (
          videos.map((video, index) => (
            <div 
                key={`${video.bvid}-${index}`} 
                className="group flex gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                onClick={() => handleVideoClick(video)}
            >
              {/* Thumbnail */}
              <div className="relative w-32 h-20 flex-shrink-0 rounded overflow-hidden bg-gray-200">
                {video.pic ? (
                    <img 
                        src={video.pic} 
                        alt={video.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        loading="lazy"
                    />
                ) : null}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-opacity">
                    <PlayCircle className="text-white drop-shadow-md" size={24} />
                </div>
              </div>
              
              {/* Meta */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                <h3 className="text-sm font-medium text-gray-800 line-clamp-2 leading-tight mb-1" title={video.title}>
                    {video.title}
                </h3>
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                        <span className="bg-gray-100 px-1 rounded text-gray-600 truncate max-w-[100px]">{video.owner.name}</span>
                    </div>
                    <div className="flex items-center gap-1 whitespace-nowrap">
                        <Clock size={12} />
                        <span>{new Date(video.pubdate * 1000).toLocaleDateString()}</span>
                    </div>
                </div>
              </div>
            </div>
          ))
      )}
    </div>
  )
})

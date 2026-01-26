import React, { useEffect, useState } from 'react'
import { BiliService, type VideoItem } from '../../../services/bili-service'
import { PlayCircle } from 'lucide-react'
import { useCardStore } from '../../../store/useCardStore'

export const FeedCard: React.FC = React.memo(() => {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const addCard = useCardStore((state) => state.addCard)

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true)
      const items = await BiliService.getPersonalizedFeed()
      setVideos(items)
      setLoading(false)
    }
    fetchVideos()
  }, [])

  const handleVideoClick = async (video: VideoItem) => {
      // 1. Spawn Detail Card
      addCard({
          id: `video-${video.bvid}`,
          type: 'detail',
          title: video.title,
          x: 400, // Ideally this should be calculated near the click
          y: 200,
          w: 800,
          h: 800, // Increased height
          content: video
      })

      // 2. Launch MPV immediately (as requested)
      // We do NOT wait for this to finish to avoid blocking UI or state updates
      try {
        const info = await BiliService.getVideoInfo(video.bvid)
        const playUrl = await BiliService.getPlayUrl(video.bvid, info.cid)
        if (playUrl) {
            window.ipcRenderer.invoke('spawn-mpv', playUrl, video.title)
        }
      } catch (e) {
        console.error('Failed to auto-launch MPV:', e)
      }
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
    <div className="space-y-4 p-2">
      {videos.map((video, index) => (
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
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-800 line-clamp-2 leading-tight mb-1" title={video.title}>
                {video.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="bg-gray-100 px-1 rounded text-gray-600">{video.owner.name}</span>
                <span>{formatNumber(video.stat.view)} views</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
})

function formatNumber(num: number): string {
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万'
    }
    return num.toString()
}

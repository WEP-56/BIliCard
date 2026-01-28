import React, { useEffect, useState } from 'react'
import { BiliService } from '../../../services/bili-service'
import { PlayCircle, Folder, ArrowLeft } from 'lucide-react'
import { useCardStore } from '../../../store/useCardStore'

interface FavFolder {
    id: number
    title: string
    media_count: number
}

export const FavoritesCard: React.FC = React.memo(() => {
  const [view, setView] = useState<'folders' | 'videos'>('folders')
  const [folders, setFolders] = useState<FavFolder[]>([])
  const [videos, setVideos] = useState<any[]>([])
  const [currentFolder, setCurrentFolder] = useState<FavFolder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const addCard = useCardStore((state) => state.addCard)

  useEffect(() => {
    const fetchFolders = async () => {
      setLoading(true)
      try {
          const userInfo = await BiliService.getNavUserInfo()
          if (!userInfo || !userInfo.mid) {
              setError('Please login to view favorites')
              setLoading(false)
              return
          }

          const items = await BiliService.getFavFolders(userInfo.mid)
          setFolders(items)
      } catch (e) {
          setError('Failed to fetch favorites folders')
      } finally {
          setLoading(false)
      }
    }
    fetchFolders()
  }, [])

  const handleFolderClick = async (folder: FavFolder) => {
      setLoading(true)
      setCurrentFolder(folder)
      try {
          const items = await BiliService.getFavFolderContent(folder.id)
          setVideos(items)
          setView('videos')
      } catch (e) {
          console.error(e)
      } finally {
          setLoading(false)
      }
  }

  const handleBack = () => {
      setView('folders')
      setVideos([])
      setCurrentFolder(null)
  }

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

  if (loading && view === 'folders' && folders.length === 0) {
      return <div className="p-4 text-center text-gray-500">Loading Favorites...</div>
  }

  if (error) return <div className="p-4 text-center text-red-500">{error}</div>

  // Folders View
  if (view === 'folders') {
      return (
        <div className="grid grid-cols-2 gap-3 p-2 h-full overflow-y-auto">
            {folders.map((folder) => (
                <div 
                    key={folder.id} 
                    className="cursor-pointer bg-gray-50 hover:bg-gray-100 p-3 rounded border border-gray-200 flex flex-col items-center justify-center gap-2 transition-colors"
                    onClick={() => handleFolderClick(folder)}
                >
                    <Folder size={32} className="text-pink-400" />
                    <div className="text-center">
                        <div className="text-sm font-medium line-clamp-1" title={folder.title}>{folder.title}</div>
                        <div className="text-xs text-gray-500">{folder.media_count} items</div>
                    </div>
                </div>
            ))}
        </div>
      )
  }

  // Videos View
  return (
    <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 p-2 border-b border-gray-100 bg-white sticky top-0 z-10">
            <button 
                onClick={handleBack}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
                <ArrowLeft size={20} />
            </button>
            <div className="font-medium text-sm line-clamp-1 flex-1">
                {currentFolder?.title}
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {loading ? (
                <div className="text-center py-4 text-gray-500">Loading videos...</div>
            ) : videos.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No videos in this folder</div>
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
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="bg-gray-100 px-1 rounded text-gray-600 truncate max-w-[100px]">{video.owner?.name}</span>
                                <span>{new Date(video.pubdate * 1000).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
  )
})

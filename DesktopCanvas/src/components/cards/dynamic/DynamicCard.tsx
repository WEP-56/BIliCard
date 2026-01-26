import React, { useEffect, useState } from 'react'
import { BiliService } from '../../../services/bili-service'
import { useCardStore } from '../../../store/useCardStore'
import { PlayCircle } from 'lucide-react'

export const DynamicCard: React.FC = () => {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const addCard = useCardStore((state) => state.addCard)

  useEffect(() => {
    const fetchDynamic = async () => {
      setLoading(true)
      const data = await BiliService.getDynamicFeed()
      setItems(data)
      setLoading(false)
    }
    fetchDynamic()
  }, [])

  const handleVideoClick = (bvid: string, title: string) => {
      addCard({
          id: `video-${bvid}`,
          type: 'detail',
          title: title,
          x: 400,
          y: 200,
          w: 800,
          h: 800, // Increased height for better visibility
          content: { bvid, title }
      })
  }

  if (loading) return <div className="p-4 text-center text-gray-500">Loading Dynamics...</div>

  return (
    <div className="space-y-4 p-2">
      {items.map((item) => (
        <div key={item.id} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
                <img src={item.author.face} className="w-8 h-8 rounded-full" />
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-800">{item.author.name}</span>
                    <span className="text-xs text-gray-500">{item.author.pub_action} · {item.author.pub_time}</span>
                </div>
            </div>

            {/* Text */}
            {item.text && <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">{item.text}</p>}

            {/* Content (Video/Image) */}
            {item.content?.type === 'video' && (
                <div 
                    className="relative rounded overflow-hidden cursor-pointer group"
                    onClick={() => handleVideoClick(item.content.bvid, item.content.title)}
                >
                    <img src={item.content.pic} className="w-full aspect-video object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                        <PlayCircle className="text-white" size={32} />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <span className="text-white text-xs line-clamp-1">{item.content.title}</span>
                    </div>
                </div>
            )}

            {item.content?.type === 'image' && (
                <div className="grid grid-cols-3 gap-1">
                    {item.content.pics.map((pic: string, idx: number) => (
                        <img key={idx} src={pic} className="w-full aspect-square object-cover rounded" />
                    ))}
                </div>
            )}
        </div>
      ))}
      
      {items.length === 0 && !loading && (
          <div className="text-center text-gray-500 mt-10">No updates or not logged in</div>
      )}
    </div>
  )
}

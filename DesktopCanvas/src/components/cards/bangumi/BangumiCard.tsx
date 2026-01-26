import React, { useEffect, useState } from 'react'
import { BiliService } from '../../../services/bili-service'
import { useCardStore } from '../../../store/useCardStore'
import { PlayCircle } from 'lucide-react'

export const BangumiCard: React.FC = () => {
  const [episodes, setEpisodes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const addCard = useCardStore((state) => state.addCard)

  useEffect(() => {
    const fetchBangumi = async () => {
      setLoading(true)
      const data = await BiliService.getBangumiFeed()
      setEpisodes(data)
      setLoading(false)
    }
    fetchBangumi()
  }, [])

  const handleEpisodeClick = (ep: any) => {
      // For Bangumi, the link is usually ep_id or season_id. 
      // The embedded player needs bvid or aid, OR ep_id support.
      // https://player.bilibili.com/player.html?bvid=...
      // Unfortunately the timeline API doesn't always give BVID directly.
      // But let's check the API response. It usually gives `ep_id`.
      // The official web player can take `?epid=xxx`.
      
      // Let's assume we can open it.
      // Note: embedded player might not support EPID directly without BVID.
      // But let's try opening a detail card.
      
      // Actually, standard player supports `?epid=`.
      
      addCard({
          id: `bangumi-${ep.episode_id}`,
          type: 'detail',
          title: ep.title,
          x: 400,
          y: 200,
          w: 800,
          h: 600,
          content: { 
              title: ep.title,
              pic: ep.cover,
              owner: { name: 'Bangumi' },
              stat: { view: 0 },
              // We'll handle this special case in Detail Card or just open external link?
              // Let's try to hack the Card to support `url` or `epid`.
              // For now, let's map it to a generic content object.
              epid: ep.episode_id
          }
      })
  }

  if (loading) return <div className="p-4 text-center text-gray-500">Loading Anime...</div>

  return (
    <div className="grid grid-cols-2 gap-3 p-2">
      {episodes.map((ep) => (
        <div 
            key={ep.episode_id} 
            className="group cursor-pointer flex flex-col gap-1"
            onClick={() => handleEpisodeClick(ep)}
        >
            <div className="relative rounded overflow-hidden aspect-video bg-gray-200">
                <img src={ep.cover} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute top-1 right-1 bg-pink-500 text-white text-xs px-1 rounded">
                    {ep.pub_index}
                </div>
            </div>
            <div className="text-xs font-bold line-clamp-1 mt-1">{ep.title}</div>
            <div className="text-xs text-gray-500 line-clamp-1">{ep.pub_time}</div>
        </div>
      ))}
    </div>
  )
}

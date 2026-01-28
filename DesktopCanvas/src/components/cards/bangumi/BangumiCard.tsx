import React, { useEffect, useState } from 'react'
import { BiliService } from '../../../services/bili-service'
import { useCardStore } from '../../../store/useCardStore'
import { PlayCircle } from 'lucide-react'

export const BangumiCard: React.FC = () => {
  const [episodes, setEpisodes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const addCard = useCardStore((state) => state.addCard)

  useEffect(() => {
    const fetchBangumi = async () => {
      setLoading(true)
      try {
          const userInfo = await BiliService.getNavUserInfo()
          if (!userInfo || !userInfo.mid) {
              setError('Please login to view followed bangumi')
              setLoading(false)
              return
          }

          const data = await BiliService.getFollowedBangumi(userInfo.mid)
          setEpisodes(data)
      } catch (e) {
          setError('Failed to fetch bangumi')
      } finally {
          setLoading(false)
      }
    }
    fetchBangumi()
  }, [])

  const handleEpisodeClick = (ep: any) => {
      addCard({
          id: `bangumi-${ep.season_id}`,
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
              // We pass season_id or similar if the detail card supports it
              // For now, mapping to existing structure
              bvid: '' // Bangumi usually doesn't have a single BVID for the season
          }
      })
  }

  if (loading) return <div className="p-4 text-center text-gray-500">Loading Followed Anime...</div>
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>

  return (
    <div className="grid grid-cols-2 gap-3 p-2 h-full overflow-y-auto">
      {episodes.map((ep) => (
        <div 
            key={ep.season_id} 
            className="group cursor-pointer flex flex-col gap-1"
            onClick={() => handleEpisodeClick(ep)}
        >
            <div className="relative rounded overflow-hidden aspect-[3/4] bg-gray-200">
                <img src={ep.cover} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute top-1 right-1 bg-pink-500 text-white text-xs px-1 rounded">
                    {ep.new_ep?.index_show || 'Updated'}
                </div>
            </div>
            <div className="text-xs font-bold line-clamp-2 mt-1">{ep.title}</div>
            <div className="text-xs text-gray-500 line-clamp-1">{ep.new_ep?.pub_time || ''}</div>
        </div>
      ))}
    </div>
  )
}

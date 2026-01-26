import React, { useEffect, useState, useRef } from 'react'
import { BiliService as biliService } from '../../../services/bili-service'
import { PlayCircle, MessageSquare, ThumbsUp, Star, Share2, User } from 'lucide-react'
import { useCardStore } from '../../../store/useCardStore'

interface VideoPlayerProps {
  bvid: string
  cid?: number
  title?: string
  pic?: string
  owner?: { name: string, face: string }
  stat?: { view: number, danmaku: number, like?: number, coin?: number, favorite?: number, share?: number, reply?: number }
  desc?: string
  cardId?: string
  autoPlay?: boolean
}

export const VideoPlayer: React.FC<VideoPlayerProps> = React.memo(({ 
  bvid, 
  cid: initialCid, 
  title: initialTitle,
  pic: initialPic,
  owner: initialOwner,
  stat: initialStat,
  desc: initialDesc,
  cardId,
  autoPlay
}) => {
  const [activeTab, setActiveTab] = useState<'intro' | 'related' | 'comments'>('intro')
  const [detail, setDetail] = useState<any>(null)
  const [related, setRelated] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false)
  const autoPlayTriggered = useRef(false)

  const addCard = useCardStore((state) => state.addCard)
  const removeCard = useCardStore((state) => state.removeCard)

  // Fetch details
  useEffect(() => {
    const fetchDetail = async () => {
      const data = await biliService.getVideoInfo(bvid)
      if (data) {
        setDetail(data)
        // Fetch comments if we have aid
        if (data.aid) {
            const commentData = await biliService.getComments(data.aid)
            setComments(commentData)
        }
      }
      
      const relatedData = await biliService.getRelatedVideos(bvid)
      setRelated(relatedData)
    }
    fetchDetail()
  }, [bvid])

  // Auto-play effect
  useEffect(() => {
      if (autoPlay && detail && !isPlaying && !loading && !hasAutoPlayed && !autoPlayTriggered.current) {
          autoPlayTriggered.current = true
          setHasAutoPlayed(true)
          handlePlay()
      }
  }, [autoPlay, detail, isPlaying, loading, hasAutoPlayed])

  // Cleanup MPV on unmount
  useEffect(() => {
    return () => {
        // Stop MPV when card is closed
        if ((window as any).ipcRenderer) {
            (window as any).ipcRenderer.invoke('stop-mpv')
        }
    }
  }, [])

  const handlePlay = async () => {
    if (isPlaying) return
    
    const cidToUse = detail?.cid || initialCid
    if (!cidToUse) {
        console.error('No CID available')
        return
    }

    setLoading(true)
    try {
        const url = await biliService.getPlayUrl(bvid, cidToUse)
        if (url && (window as any).ipcRenderer) {
            await (window as any).ipcRenderer.invoke('spawn-mpv', url)
            setIsPlaying(true)
        }
    } catch (e) {
        console.error('Failed to play', e)
    } finally {
        setLoading(false)
    }
  }

  // Auto-play effect
  useEffect(() => {
      if (autoPlay && detail && !isPlaying && !loading && !hasAutoPlayed) {
          setHasAutoPlayed(true)
          handlePlay()
      }
  }, [autoPlay, detail, isPlaying, loading, hasAutoPlayed])

  const handleRelatedClick = (item: any) => {
      if (cardId) {
          removeCard(cardId)
      }
      
      // Delay adding new card to ensure clean state transition if needed
      // and to let the UI update (card removal animation if any)
      setTimeout(() => {
          addCard({
              id: `video-${item.bvid}`,
              type: 'detail',
              title: item.title,
              x: 400,
              y: 200,
              w: 800,
              h: 800,
              content: { 
                  bvid: item.bvid, 
                  title: item.title,
                  pic: item.pic,
                  owner: item.owner,
                  stat: item.stat,
                  autoPlay: true
              }
          })
      }, 100)
  }

  const displayTitle = detail?.title || initialTitle || 'Loading...'
  const displayPic = detail?.pic?.replace('http:', 'https:') || initialPic || ''
  const displayOwner = detail?.owner || initialOwner || { name: 'Unknown', face: '' }
  const displayStat = detail?.stat || initialStat || { view: 0, danmaku: 0 }
  const displayDesc = detail?.desc || initialDesc || ''

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          {/* Hero / Player Placeholder */}
          <div className="aspect-video bg-black relative group">
              <img src={displayPic} className="w-full h-full object-cover opacity-80" />
              <div className="absolute inset-0 flex items-center justify-center">
                  {!isPlaying ? (
                      <button 
                        onClick={handlePlay}
                        disabled={loading}
                        className="bg-pink-500 hover:bg-pink-600 text-white rounded-full p-4 transition-transform transform group-hover:scale-110 shadow-lg"
                      >
                          {loading ? <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" /> : <PlayCircle size={48} fill="white" />}
                      </button>
                  ) : (
                      <div className="text-white bg-black/50 px-4 py-2 rounded backdrop-blur-sm">
                          Playing on MPV
                      </div>
                  )}
              </div>
          </div>

          {/* Sticky Tabs */}
          <div className="sticky top-0 bg-white z-10 border-b border-gray-200 shadow-sm flex">
              <button 
                  onClick={() => setActiveTab('intro')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'intro' ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                  Introduction
              </button>
              <button 
                  onClick={() => setActiveTab('related')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'related' ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                  Related ({related.length})
              </button>
              <button 
                  onClick={() => setActiveTab('comments')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'comments' ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                  Comments ({comments.length})
              </button>
          </div>

          {/* Content Area */}
          <div className="p-4">
              {activeTab === 'intro' && (
                  <div className="space-y-4">
                      <h1 className="text-xl font-bold text-gray-800 leading-tight">{displayTitle}</h1>
                      
                      <div className="flex items-center justify-between text-gray-500 text-sm">
                          <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1"><PlayCircle size={14} /> {formatNumber(displayStat.view)}</span>
                              <span className="flex items-center gap-1"><MessageSquare size={14} /> {formatNumber(displayStat.danmaku)}</span>
                              <span className="text-gray-400">{formatDate(detail?.pubdate)}</span>
                          </div>
                      </div>

                      <div className="flex items-center gap-3 py-3 border-y border-gray-100">
                          <img src={displayOwner.face} className="w-10 h-10 rounded-full border border-gray-100" />
                          <div className="flex-1">
                              <div className="font-medium text-pink-600">{displayOwner.name}</div>
                              <div className="text-xs text-gray-400">{detail?.owner?.mid}</div>
                          </div>
                          <button className="bg-pink-500 text-white px-4 py-1.5 rounded-full text-sm hover:bg-pink-600 transition-colors">
                              + Follow
                          </button>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-center py-2">
                          <ActionBtn icon={ThumbsUp} label={formatNumber(displayStat.like || 0)} />
                          <ActionBtn icon={Star} label={formatNumber(displayStat.favorite || 0)} />
                          <ActionBtn icon={Share2} label={formatNumber(displayStat.share || 0)} />
                          <ActionBtn icon={MessageSquare} label={formatNumber(displayStat.reply || 0)} />
                      </div>

                      <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap break-words">
                          {displayDesc}
                      </div>
                  </div>
              )}

              {activeTab === 'related' && (
                  <div className="grid grid-cols-2 gap-3">
                      {related.map(item => (
                          <div 
                              key={item.bvid} 
                              className="group cursor-pointer bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                              onClick={() => handleRelatedClick(item)}
                          >
                              <div className="aspect-video bg-gray-200 relative">
                                  {item.pic ? <img src={item.pic} className="w-full h-full object-cover" /> : null}
                                  <div className="absolute bottom-1 right-1 bg-black/50 text-white text-xs px-1 rounded">
                                      {formatDuration(item.duration)}
                                  </div>
                              </div>
                              <div className="p-2">
                                  <h3 className="text-xs font-medium line-clamp-2 mb-1 group-hover:text-pink-600 transition-colors">{item.title}</h3>
                                  <div className="text-xs text-gray-500 flex items-center justify-between">
                                      <span>{item.owner.name}</span>
                                      <span>{formatNumber(item.stat.view)} views</span>
                                  </div>
                              </div>
                          </div>
                      ))}
                      {related.length === 0 && <div className="col-span-2 text-center text-gray-500 py-8">Loading related videos...</div>}
                  </div>
              )}

              {activeTab === 'comments' && (
                  <div className="space-y-4">
                      {comments.map(item => (
                          <div key={item.rpid} className="flex gap-3 items-start">
                              <img src={item.member.avatar} className="w-8 h-8 rounded-full border border-gray-100" />
                              <div className="flex-1 space-y-1">
                                  <div className="flex items-center justify-between">
                                      <span className={`text-sm font-medium ${item.member.vip?.status ? 'text-pink-600' : 'text-gray-600'}`}>
                                          {item.member.uname}
                                      </span>
                                      <span className="text-xs text-gray-400">{formatDate(item.ctime)}</span>
                                  </div>
                                  <p className="text-sm text-gray-800 leading-relaxed">{item.content.message}</p>
                                  <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                                      <span className="flex items-center gap-1 cursor-pointer hover:text-gray-600">
                                          <ThumbsUp size={12} /> {item.like}
                                      </span>
                                      <span className="cursor-pointer hover:text-gray-600">Reply</span>
                                  </div>
                              </div>
                          </div>
                      ))}
                      {comments.length === 0 && <div className="text-center text-gray-500 py-8">Loading comments...</div>}
                  </div>
              )}
          </div>
      </div>
    </div>
  )
})

const ActionBtn = ({ icon: Icon, label }: any) => (
    <div className="flex flex-col items-center gap-1 text-gray-500 cursor-pointer hover:text-pink-600 transition-colors">
        <Icon size={20} />
        <span className="text-xs">{label}</span>
    </div>
)

function formatNumber(num: number) {
    if (!num) return '0'
    if (num > 10000) return `${(num / 10000).toFixed(1)}w`
    return num.toString()
}

function formatDate(timestamp: number) {
    if (!timestamp) return ''
    const date = new Date(timestamp * 1000)
    return date.toLocaleDateString()
}

function formatDuration(seconds: number) {
    if (!seconds) return '0:00'
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return `${min}:${sec.toString().padStart(2, '0')}`
}

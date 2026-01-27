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
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false)
  const [isWebviewReady, setIsWebviewReady] = useState(false)
  const autoPlayTriggered = useRef(false)
  const webviewRef = useRef<any>(null)

  const addCard = useCardStore((state) => state.addCard)
  const removeCard = useCardStore((state) => state.removeCard)

  // Inject CSS to Web Player
  useEffect(() => {
      const webview = webviewRef.current
      if (webview && isPlaying) {
          setIsWebviewReady(false) // Reset readiness on play start
          const injectCSS = async () => {
              try {
                  await webview.insertCSS(`
                      #bilibili-player {
                          position: fixed !important;
                          top: 0 !important;
                          left: 0 !important;
                          width: 100% !important;
                          height: 100% !important;
                          z-index: 10000 !important;
                          background: black !important;
                      }
                      .bpx-player-container {
                          box-shadow: none !important;
                      }
                      body {
                          overflow: hidden !important;
                          background: black !important;
                      }
                      
                      /* Hide Header and Sidebar */
                      #bili-header-container, 
                      .bili-header,
                      .left-container-under-player, 
                      .right-container, 
                      #v_upinfo, 
                      .video-info-container, 
                      .video-toolbar-container,
                      .bili-footer,
                      .palette-button-wrap,
                      #activity_vote,
                      .ad-report,
                      .reply-header,
                      .bili-comments-header-renderer,
                      #bannerAd,
                      .bili-grid,
                      .bili-layout,
                      .sidenav,
                      .fixed-sidenav-storage,
                      .report-scroll-module,
                      .bili-pendant,
                      .tool-bar,
                      .video-float-dialog,
                      .video-float-card,
                      .side-bar,
                      .nav-tools,
                      [class*="storage-box"],
                      [class*="contact-help"],
                      [class*="back-top"] {
                          display: none !important;
                      }
                  `)
                  // Fade in after CSS injection
                  setTimeout(() => setIsWebviewReady(true), 100)
              } catch (e) {
                  console.error('Failed to inject CSS', e)
                  setIsWebviewReady(true) // Fallback to show even if error
              }
          }
          
          const handleLoadError = (e: any) => {
              console.error('Webview load error:', e.errorCode, e.errorDescription)
              setIsWebviewReady(true) // Show webview even if error occurs so user can see it
          }

          webview.addEventListener('dom-ready', injectCSS)
          webview.addEventListener('did-fail-load', handleLoadError)
          
          return () => { 
              webview.removeEventListener('dom-ready', injectCSS)
              webview.removeEventListener('did-fail-load', handleLoadError)
          }
      }
  }, [isPlaying])

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
      if (autoPlay && detail && !isPlaying && !hasAutoPlayed && !autoPlayTriggered.current) {
          autoPlayTriggered.current = true
          setHasAutoPlayed(true)
          setIsPlaying(true)
      }
  }, [autoPlay, detail, isPlaying, hasAutoPlayed])

  const handlePlay = () => {
    setIsPlaying(true)
  }

  const handleRelatedClick = (item: any) => {
      if (cardId) {
          removeCard(cardId)
      }
      
      // Delay adding new card to ensure clean state transition if needed
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
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {!isPlaying && (
                      <div className="pointer-events-auto">
                        <button 
                            onClick={handlePlay}
                            className="bg-pink-500 hover:bg-pink-600 text-white rounded-full p-4 transition-transform transform hover:scale-110 shadow-lg flex items-center gap-2"
                        >
                            <PlayCircle size={48} fill="white" />
                        </button>
                      </div>
                  )}
              </div>
              
              {/* Web Player Overlay */}
              {isPlaying && (
                  <div className="absolute inset-0 z-20 bg-black">
                      <webview
                        ref={webviewRef}
                        src={`https://www.bilibili.com/video/${bvid}?autoplay=1`}
                        className="w-full h-full transition-opacity duration-300"
                        style={{ opacity: isWebviewReady ? 1 : 0 }}
                        // partition="persist:bilibili" // Use default session
                        allowpopups="true"
                        webpreferences="contextIsolation=no, nodeIntegration=no"
                        // @ts-ignore
                      />
                      <button 
                        onClick={() => setIsPlaying(false)}
                        className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded hover:bg-black/70 z-30"
                      >
                          Close
                      </button>
                  </div>
              )}
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
                                  
                                  {/* Sub-comments (Replies) */}
                                  {item.replies && item.replies.length > 0 && (
                                      <div className="mt-2 bg-gray-50 p-3 rounded text-sm space-y-2">
                                          {item.replies.map((reply: any) => (
                                              <div key={reply.rpid} className="flex gap-2">
                                                  <span className="font-medium text-gray-600 whitespace-nowrap">{reply.member.uname}:</span>
                                                  <span className="text-gray-700">{reply.content.message}</span>
                                              </div>
                                          ))}
                                          {item.replies.length >= 3 && (
                                               <div className="text-blue-500 text-xs cursor-pointer hover:underline">
                                                  View all replies
                                               </div>
                                          )}
                                      </div>
                                  )}
                              </div>
                          </div>
                      ))}
                      {comments.length === 0 && <div className="text-center text-gray-500 py-8">No comments yet.</div>}
                  </div>
              )}
          </div>
      </div>
    </div>
  )
})

// Helpers
const formatNumber = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
    return num
}

const formatDate = (ts: number) => {
    if (!ts) return ''
    return new Date(ts * 1000).toLocaleDateString()
}

const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
}

const ActionBtn = ({ icon: Icon, label }: any) => (
    <button className="flex flex-col items-center gap-1 text-gray-500 hover:text-pink-500 transition-colors p-2 rounded hover:bg-gray-100">
        <Icon size={20} />
        <span className="text-xs">{label}</span>
    </button>
)

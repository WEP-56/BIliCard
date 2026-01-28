import React, { useEffect, useState, useRef } from 'react'
import { X, Send } from 'lucide-react'
import { useCardStore } from '../../../store/useCardStore'
import { useUserStore } from '../../../store/useUserStore'
import { BiliService } from '../../../services/bili-service'

interface LivePlayerProps {
  roomId: number | string
  title?: string
  uname?: string
  face?: string
  cardId?: string
}

export const LivePlayer: React.FC<LivePlayerProps> = ({ 
  roomId, 
  title, 
  uname,
  face,
  cardId
}) => {
  const [isWebviewReady, setIsWebviewReady] = useState(false)
  const [danmuInput, setDanmuInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const webviewRef = useRef<any>(null)
  const removeCard = useCardStore((state) => state.removeCard)
  const cookie = useUserStore((state) => state.cookie)

  // Send Danmu
  const handleSendDanmu = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!danmuInput.trim() || isSending) return

      setIsSending(true)
      const res = await BiliService.sendDanmu(roomId, danmuInput)
      if (res.success) {
          setDanmuInput('')
          // Optional: Show toast
      } else {
          console.error('Failed to send danmu:', res.msg)
          alert(`Send Failed: ${res.msg}`)
      }
      setIsSending(false)
  }

  // Inject CSS to Live Player
  useEffect(() => {
      const webview = webviewRef.current
      if (webview) {
          const injectCSS = async () => {
              try {
                  await webview.insertCSS(`
                      /* Global Reset */
                      ::-webkit-scrollbar { width: 0px; background: transparent; }
                      body { overflow: hidden !important; background-color: #000 !important; }

                      /* 
                       * Strategy: Hide EVERYTHING extraneous, but keep the player container intact.
                       * This ensures "Display Modes" and controls (bottom bar) remain visible.
                       */
                      
                      /* Hide common UI noise */
                      #bili-header-container, 
                      .bili-header, 
                      .z-top-nav, 
                      #link-navbar-vm,
                      .left-container-under-player, 
                      .right-container, 
                      .gift-control-section,
                      .chat-history-panel,
                      #room-info-vm,
                      .room-info-ctnr,
                      .header-info-ctnr, 
                      .up-info-container,
                      .head-info-section,
                      .room-feed,
                      .activity-banner,
                      .gift-panel,
                      .web-player-icon-roomStatus,
                      .flip-view-container,
                      .side-bar-cntr,
                      .sidebar-vm,
                      #sidebar-vm,
                      .shop-popover,
                      .pk-vm,
                      .awesome-activity-vm
                      {
                         visibility: hidden !important;
                         pointer-events: none !important;
                         position: absolute !important;
                         top: -9999px !important;
                         left: -9999px !important;
                         width: 0 !important;
                         height: 0 !important;
                         opacity: 0 !important;
                         z-index: -1 !important;
                         display: none !important;
                      }

                      /* Force Player Container to Fullscreen */
                      /* Targetting common player container classes */
                      html, body, #app, .live-room-app {
                          width: 100% !important;
                          height: 100% !important;
                          margin: 0 !important;
                          padding: 0 !important;
                          overflow: hidden !important;
                          background-color: #000 !important;
                          min-width: 0 !important;
                          min-height: 0 !important;
                      }

                      #player-ctnr, 
                      .player-ctnr, 
                      .live-room-player-container,
                      #live-room-player,
                      .player-container,
                      .bilibili-live-player,
                      #bilibili-player,
                      .live-room-app .app-content
                      {
                          position: fixed !important;
                          top: 0 !important;
                          left: 0 !important;
                          width: 100vw !important;
                          height: 100vh !important;
                          z-index: 1000 !important;
                          background-color: #000 !important;
                          margin: 0 !important;
                          padding: 0 !important;
                          visibility: visible !important;
                          opacity: 1 !important;
                          min-width: 0 !important;
                          min-height: 0 !important;
                          display: flex !important;
                          justify-content: center !important;
                          align-items: center !important;
                      }

                      /* Ensure Video Element is Centered and Contain */
                      video {
                          object-fit: contain !important;
                          width: 100% !important;
                          height: 100% !important;
                      }

                      /* Hide scrollbars */
                      ::-webkit-scrollbar {
                          display: none !important;
                          width: 0 !important;
                          height: 0 !important;
                      }
                  `)
                  
                  // Inject JS to force resize logic that CSS might miss (e.g. JS-calculated inline styles)
                  await webview.executeJavaScript(`
                      const forceResize = () => {
                          try {
                              const video = document.querySelector('video');
                              if (video) {
                                  video.style.width = '100%';
                                  video.style.height = '100%';
                                  video.style.objectFit = 'contain';
                              }
                              
                              const containers = document.querySelectorAll('#player-ctnr, .player-ctnr, .live-room-player-container, #live-room-player, .player-container, .bilibili-live-player');
                              containers.forEach(c => {
                                  c.style.width = '100vw';
                                  c.style.height = '100vh';
                                  c.style.position = 'fixed';
                                  c.style.top = '0';
                                  c.style.left = '0';
                                  c.style.zIndex = '1000';
                                  c.style.minWidth = '0';
                                  c.style.minHeight = '0';
                                  c.style.display = 'flex';
                                  c.style.justifyContent = 'center';
                                  c.style.alignItems = 'center';
                              });

                              // Force trigger resize event to make player adapt
                              window.dispatchEvent(new Event('resize'));
                          } catch(e) {}
                      };
                      
                      // Run immediately and periodically
                      forceResize();
                      setInterval(forceResize, 2000);
                      
                      // Also disable any min-width on body
                      document.body.style.minWidth = '0';
                      document.body.style.overflow = 'hidden';
                  `)

                  // Fade in
                  setTimeout(() => setIsWebviewReady(true), 100)
              } catch (e) {
                  console.error('Failed to inject CSS/JS', e)
                  setIsWebviewReady(true)
              }
          }
          
          const handleLoadError = (e: any) => {
              console.error('Webview load error:', e.errorCode, e.errorDescription)
              setIsWebviewReady(true)
          }

          webview.addEventListener('dom-ready', injectCSS)
          webview.addEventListener('did-fail-load', handleLoadError)
          
          return () => { 
              webview.removeEventListener('dom-ready', injectCSS)
              webview.removeEventListener('did-fail-load', handleLoadError)
          }
      }
  }, [roomId])

  return (
    <div className="flex flex-col h-full bg-black relative">
        {/* Loading / Placeholder */}
        {!isWebviewReady && (
            <div className="absolute inset-0 flex items-center justify-center text-white z-0">
                <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
                    <span>Loading Live Room {roomId}...</span>
                </div>
            </div>
        )}
        
        {/* Webview Container */}
        <div className="flex-1 relative w-full overflow-hidden">
            <webview
                ref={webviewRef}
                src={`https://live.bilibili.com/${roomId}`}
                className="w-full h-full transition-opacity duration-300"
                style={{ opacity: isWebviewReady ? 1 : 0 }}
                partition="persist:bilibili" // Use persistent session to ensure cookie sync
                allowpopups="true"
                // Use a standard Chrome User Agent to avoid being detected as a bot/crawler
                useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0"
                webpreferences={`contextIsolation=no, nodeIntegration=no${window.electron_preload_live ? `, preload=${window.electron_preload_live}` : ''}`}
                // @ts-ignore
            />
        </div>

        {/* Danmu Input Bar */}
        <div className="h-12 bg-gray-900 border-t border-gray-800 flex items-center px-2 gap-2 z-10">
            <form onSubmit={handleSendDanmu} className="flex-1 flex items-center gap-2">
                <input 
                    type="text" 
                    value={danmuInput}
                    onChange={(e) => setDanmuInput(e.target.value)}
                    placeholder={cookie ? "Send a danmu..." : "Login to send danmu"}
                    disabled={!cookie || isSending}
                    className="flex-1 bg-gray-800 text-white rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 disabled:opacity-50"
                />
                <button 
                    type="submit" 
                    disabled={!cookie || isSending || !danmuInput.trim()}
                    className="p-2 bg-pink-600 hover:bg-pink-500 text-white rounded-full disabled:opacity-50 disabled:bg-gray-700 transition-colors"
                >
                    <Send size={16} />
                </button>
            </form>
        </div>
        
        {/* Close Button (Overlay) */}
        {cardId && (
            <button 
                onClick={() => removeCard(cardId)}
                className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 z-50 opacity-0 hover:opacity-100 transition-opacity"
                title="Close Player"
            >
                <X size={16} />
            </button>
        )}
    </div>
  )
}

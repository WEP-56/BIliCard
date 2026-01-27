import React, { useEffect, useState, useRef } from 'react'
import { X } from 'lucide-react'
import { useCardStore } from '../../../store/useCardStore'

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
  const webviewRef = useRef<any>(null)
  const removeCard = useCardStore((state) => state.removeCard)

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
                          display: none !important;
                      }

                      /* Force Player Container to Fullscreen */
                      /* Targetting common player container classes */
                      #player-ctnr, 
                      .player-ctnr, 
                      .live-room-player-container,
                      #live-room-player,
                      .player-container
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
                      }

                      /* 
                       * Do NOT force video object-fit or z-index, 
                       * as this breaks the player's internal layering (controls vs video).
                       */
                      
                      /* Fix layout shifts */
                      .live-room-app .app-content {
                          padding-top: 0 !important;
                          margin: 0 !important;
                          height: 100vh !important;
                      }
                  `)
                  // Fade in
                  setTimeout(() => setIsWebviewReady(true), 100)
              } catch (e) {
                  console.error('Failed to inject CSS', e)
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

        <webview
            ref={webviewRef}
            src={`https://live.bilibili.com/${roomId}`}
            className="w-full h-full transition-opacity duration-300"
            style={{ opacity: isWebviewReady ? 1 : 0 }}
            partition="persist:bilibili" // Use persistent session to ensure cookie sync
            allowpopups="true"
            // Use a standard Chrome User Agent to avoid being detected as a bot/crawler
            useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0"
            webpreferences="contextIsolation=no, nodeIntegration=no"
            // @ts-ignore
        />
        
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

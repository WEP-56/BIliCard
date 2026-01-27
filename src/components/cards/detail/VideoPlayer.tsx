// ... existing imports
  const [activeTab, setActiveTab] = useState<'intro' | 'related' | 'comments'>('intro')
  // 新增：播放器模式状态
  const [playerMode, setPlayerMode] = useState<'mpv' | 'web'>('mpv')
  const [detail, setDetail] = useState<any>(null)
// ...
  // Auto-play effect 修改
  useEffect(() => {
      if (autoPlay && detail && !isPlaying && !loading && !hasAutoPlayed && !autoPlayTriggered.current) {
          autoPlayTriggered.current = true
          setHasAutoPlayed(true)
          if (playerMode === 'mpv') {
            handlePlay()
          } else {
            setIsPlaying(true) // Web模式直接显示
          }
      }
  }, [autoPlay, detail, isPlaying, loading, hasAutoPlayed, playerMode]) // 添加依赖

  // handlePlay 修改：Web模式直接切换状态
  const handlePlay = async () => {
    if (playerMode === 'web') {
        setIsPlaying(true)
        return
    }
    if (isPlaying) return
    // ... MPV 逻辑保持不变
// ...
          {/* 播放器区域 UI 修改 */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {!isPlaying ? (
                      <div className="flex gap-4 pointer-events-auto">
                        <button 
                            onClick={handlePlay}
                            disabled={loading}
                            className="bg-pink-500 hover:bg-pink-600 text-white rounded-full p-4 transition-transform transform hover:scale-110 shadow-lg flex items-center gap-2"
                        >
                            {loading ? <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" /> : <PlayCircle size={48} fill="white" />}
                            <span className="font-bold">MPV</span>
                        </button>
                        <button 
                            onClick={() => {
                                setPlayerMode('web')
                                setIsPlaying(true)
                            }}
                            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-4 transition-transform transform hover:scale-110 shadow-lg flex items-center gap-2"
                        >
                            <PlayCircle size={48} fill="white" />
                            <span className="font-bold">Web</span>
                        </button>
                      </div>
                  ) : playerMode === 'mpv' ? (
                      <div className="text-white bg-black/50 px-4 py-2 rounded backdrop-blur-sm pointer-events-auto">
                          Playing on MPV
                      </div>
                  ) : null}
              </div>
              
              {/* Web Player Overlay */}
              {isPlaying && playerMode === 'web' && (
                  <div className="absolute inset-0 z-20 bg-black">
                      <webview
                        src={`https://www.bilibili.com/video/${bvid}?autoplay=1`}
                        className="w-full h-full"
                        partition="persist:bilibili" // 关键：使用持久化分区共享Cookie
                        allowpopups
                        webpreferences="contextIsolation=no"
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
// ...

import { useUserStore } from '../store/useUserStore'
import { encWbi } from '../utils/wbi'

// Helper to get headers with cookie
const getHeaders = () => {
  const cookie = useUserStore.getState().cookie
  return cookie ? { 'X-Bili-Cookie': cookie } : {}
}

export interface VideoItem {
  bvid: string
  aid: number
  pic: string
  title: string
  owner: {
    name: string
    mid: number
    face: string
  }
  stat: {
    view: number
    danmaku: number
  }
  duration: number
}

export interface LiveItem {
    roomid: number
    title: string
    uname: string
    face: string
    cover: string
    online: number
    area_name: string
}

export const BiliService = {
  async getDynamicFeed(page: number = 1): Promise<any[]> {
    try {
        const offset = page === 1 ? '' : (window as any)._dynamic_offset || ''
        const response = await fetch(`https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/all?timezone_offset=-480&type=all&offset=${offset}&page=${page}`, {
            headers: getHeaders()
        })
        const data = await response.json()
        
        if (data.code !== 0 || !data.data.items) {
            return []
        }

        // Store offset for next page
        if (data.data.offset) {
            (window as any)._dynamic_offset = data.data.offset
        }

        return data.data.items.map((item: any) => {
            const author = item.modules.module_author
            const desc = item.modules.module_dynamic.desc?.text || ''
            const major = item.modules.module_dynamic.major
            
            let content = null
            if (major?.archive) {
                content = {
                    type: 'video',
                    pic: major.archive.cover.replace('http:', 'https:'),
                    title: major.archive.title,
                    bvid: major.archive.bvid
                }
            } else if (major?.draw) {
                content = {
                    type: 'image',
                    pics: major.draw.items.map((i: any) => i.src.replace('http:', 'https:'))
                }
            }

            return {
                id: item.id_str,
                author: {
                    name: author.name,
                    face: author.face.replace('http:', 'https:'),
                    pub_time: author.pub_time,
                    pub_action: author.pub_action
                },
                text: desc,
                content
            }
        })
    } catch (e) {
        console.error(e)
        return []
    }
  },

  async getPlayUrl(bvid: string, cid: number, quality: number = 80): Promise<string | null> {
    try {
        const headers = getHeaders()
        console.log(`[BiliService] Requesting PlayURL for ${bvid} (qn=${quality})`)
        console.log(`[BiliService] Headers have cookie? ${!!headers['X-Bili-Cookie']}`)
        
        // fnval=0 means FLV (legacy), usually supports up to 1080p (qn=80)
        // For 1080p60 or 4K, we need fnval=16 (DASH) or fnval=4048
        // But for MPV, we prefer direct URL (FLV/MP4) if possible to avoid DASH manifest handling if not strictly needed.
        // However, qn=80 works fine with fnval=0.
        // If user wants higher quality, we might need DASH.
        // Let's stick to fnval=0 for now but allow requesting qn=80.
        
        const response = await fetch(`https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=${quality}&fnval=0&fnver=0&fourk=1&platform=pc`, {
            headers
        })
        const data = await response.json()
        if (data.code !== 0) {
            console.error('[BiliService] getPlayUrl failed:', data)
            return null
        }
        
        if (data.data.durl && data.data.durl.length > 0) {
            // Check returned quality
            console.log(`[BiliService] Got video url with quality: ${data.data.quality}`)
            return data.data.durl[0].url
        }
        
        return null
    } catch (e) {
        console.error(e)
        return null
    }
  },

  async getDanmakuAsAss(cid: number): Promise<string | null> {
      try {
          console.log(`[BiliService] Fetching danmaku for cid ${cid}`)
          // Use fetch to get XML (browser handles decompression)
          const response = await fetch(`https://api.bilibili.com/x/v1/dm/list.so?oid=${cid}`, {
              headers: getHeaders()
          })
          
          if (!response.ok) {
             console.error(`[BiliService] Failed to fetch danmaku: ${response.status} ${response.statusText}`)
             return null
          }
          
          const xmlText = await response.text()
          console.log(`[BiliService] Got danmaku XML length: ${xmlText.length}`)
          
          // Parse XML
          // Simple regex parsing to avoid heavy DOMParser overhead for large files?
          // Actually DOMParser is native and fast enough.
          const parser = new DOMParser()
          const xmlDoc = parser.parseFromString(xmlText, "text/xml")
          const dElements = xmlDoc.getElementsByTagName('d')
          
          if (!dElements || dElements.length === 0) {
              console.warn('[BiliService] No danmaku elements found')
              return null
          }
          
          console.log(`[BiliService] Parsing ${dElements.length} danmaku items`)
          
          // ASS Header
          let assContent = `[Script Info]
ScriptType: v4.00+
Collisions: Normal
PlayResX: 1920
PlayResY: 1080
Timer: 100.0000

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Microsoft YaHei,40,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,2,20,20,20,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`
          
          // Helper to format time (seconds -> h:mm:ss.cc)
          const formatTime = (seconds: number) => {
              const h = Math.floor(seconds / 3600)
              const m = Math.floor((seconds % 3600) / 60)
              const s = Math.floor(seconds % 60)
              const cs = Math.floor((seconds % 1) * 100)
              return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`
          }

          // Convert danmaku
          // Bilibili screen width approx 10s traversal for scroll?
          // Actually simple ASS conversion:
          // Scroll: \Move or specialized renderer.
          // For simplicity, let's just use static or simple scroll if possible.
          // Standard ASS scrolling: Banner effect or Move command.
          // But "Banner" is distinct.
          // Most converters use \move(x1,y,x2,y)
          // But calculating y position to avoid collision is complex.
          // Alternative: Use MPV's built-in danmaku script if we can just pass XML?
          // MPV doesn't support Bilibili XML natively.
          // So we must generate valid ASS.
          // Generating COLLISION-FREE ASS is hard.
          // Generating simple ASS (all center or random y) is easy but ugly.
          // Let's try to map types roughly.
          
          // Let's iterate
          for (let i = 0; i < dElements.length; i++) {
              const d = dElements[i]
              const p = d.getAttribute('p')
              const text = d.textContent
              if (!p || !text) continue
              
              const parts = p.split(',')
              const time = parseFloat(parts[0])
              const mode = parseInt(parts[1])
              const size = parseInt(parts[2])
              const color = parseInt(parts[3])
              // const timestamp = parseInt(parts[4])
              // const pool = parseInt(parts[5])
              // const uid = parts[6]
              // const rowId = parts[7]
              
              // ASS Color: &HBBGGRR
              const r = (color >> 16) & 0xFF
              const g = (color >> 8) & 0xFF
              const b = color & 0xFF
              const assColor = `&H00${b.toString(16).padStart(2, '0').toUpperCase()}${g.toString(16).padStart(2, '0').toUpperCase()}${r.toString(16).padStart(2, '0').toUpperCase()}`
              
              const startTime = formatTime(time)
              const endTime = formatTime(time + 8) // Duration approx 8s?
              
              // Mode: 1,2,3=Scroll, 4=Bottom, 5=Top
              // We need complex logic for full experience.
              // For now, let's map:
              // Scroll -> Default style (Alignment 2 is bottom center? No, 2 is bottom center in numpad, but standard ASS alignment...)
              // Alignment in ASS: 1=SW, 2=S, 3=SE, 4=W, 5=C, 6=E, 7=NW, 8=N, 9=NE
              // Default style uses 2 (Bottom Center)? Wait.
              // We want Scroll to move from Right to Left.
              // Command: {\move(1920,y,-500,y)}
              
              // We'll skip collision detection for now and just randomize Y for scroll?
              // Or use fixed lanes.
              
              let styleOverride = `{\\c${assColor}}`
              let event = ''
              
              if (mode === 1 || mode === 2 || mode === 3) {
                  // Scroll
                  // Random Y between 50 and 1000?
                  const y = Math.floor(Math.random() * 900) + 50
                  styleOverride += `{\\move(2000,${y},-500,${y})}`
                  event = `Dialogue: 2,${startTime},${endTime},Default,,0,0,0,,${styleOverride}${text}`
              } else if (mode === 4) {
                  // Bottom
                  styleOverride += `{\\an2\\pos(960,1000)}` // Bottom Center
                   event = `Dialogue: 1,${startTime},${formatTime(time + 4)},Default,,0,0,0,,${styleOverride}${text}`
              } else if (mode === 5) {
                  // Top
                  styleOverride += `{\\an8\\pos(960,50)}` // Top Center
                  event = `Dialogue: 1,${startTime},${formatTime(time + 4)},Default,,0,0,0,,${styleOverride}${text}`
              } else {
                  // Default Scroll
                   const y = Math.floor(Math.random() * 900) + 50
                   styleOverride += `{\\move(2000,${y},-500,${y})}`
                   event = `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${styleOverride}${text}`
              }
              
              assContent += event + '\n'
          }
          
          return assContent
      } catch (e) {
          console.error('[BiliService] Failed to get danmaku:', e)
          return null
      }
  },

  // --- Live ---
  async getLiveFeed(page: number = 1): Promise<LiveItem[]> {
      try {
          // Using area_id=0 for all areas, sort=online
          const response = await fetch(`https://api.live.bilibili.com/xlive/web-interface/v1/webMain/getList?platform=web&page=${page}`, {
              headers: getHeaders()
          })
          const data = await response.json()
          if (data.code !== 0 || !data.data || !data.data.list) return []
          return data.data.list.map((item: any) => ({
              roomid: item.roomid,
              title: item.title,
              uname: item.uname,
              face: item.face ? item.face.replace('http:', 'https:') : '',
              cover: item.cover ? item.cover.replace('http:', 'https:') : '',
              online: item.online,
              area_name: item.area_name
          }))
      } catch (e) {
          console.error(e)
          return []
      }
  },

  async searchLive(keyword: string): Promise<LiveItem[]> {
      console.log('BiliService: searchLive called with', keyword)
      try {
          // Ensure we have cookies
          const cookie = useUserStore.getState().cookie
          if (!cookie) {
              try {
                  console.log('BiliService: Pre-fetching cookies...')
                  await fetch('https://www.bilibili.com/', { mode: 'no-cors' })
                  console.log('BiliService: Cookies pre-fetched')
              } catch (e) { console.error('Cookie fetch failed', e) }
          }
          
          // Try searching in 'video' type first as a fallback/test, or try 'live_room'
          // Note: 'live' type is strict. 'live_room' might be better?
          // Let's stick to 'live' but with better handling.
          
          const params = {
              search_type: 'live_room', // Changed from 'live' to 'live_room' based on API docs
              keyword: keyword,
          }
          console.log('BiliService: Encoding WBI params...')
          const query = await encWbi(params)
          console.log('BiliService: WBI query:', query)
          
          const url = `https://api.bilibili.com/x/web-interface/wbi/search/type?${query}`
          console.log('BiliService: Fetching', url)
          
          const response = await fetch(url, {
              headers: getHeaders(),
              credentials: 'include'
          })
          const data = await response.json()
          console.log('BiliService: Response data', data)
          
          if (data.code !== 0 || !data.data || !data.data.result || !Array.isArray(data.data.result)) {
              console.warn('BiliService: Invalid data format or error code', data)
              return []
          }
          
          return data.data.result.map((item: any) => ({
              roomid: item.roomid,
              title: item.title,
              uname: item.uname,
              face: item.user_cover ? item.user_cover.replace('http:', 'https:') : '',
              cover: item.user_cover ? item.user_cover.replace('http:', 'https:') : '',
              online: item.online,
              area_name: item.area_name || 'Live'
          }))
      } catch (e) {
          console.error('BiliService Error:', e)
          return []
      }
  },

  async getLivePlayUrl(roomid: number): Promise<string | null> {
      try {
          const response = await fetch(`https://api.live.bilibili.com/xlive/web-room/v1/playUrl/playUrl?cid=${roomid}&platform=web&quality=4&qn=4`, {
              headers: getHeaders()
          })
          const data = await response.json()
          if (data.code !== 0) return null
          const durl = data.data.durl
          if (durl && durl.length > 0) {
              return durl[0].url
          }
          return null
      } catch (e) {
          console.error(e)
          return null
      }
  },

  async getLiveRoomInfo(roomid: number): Promise<{ room_id: number, short_id: number } | null> {
      try {
          const response = await fetch(`https://api.live.bilibili.com/room/v1/Room/get_info?room_id=${roomid}`, {
              headers: getHeaders()
          })
          const data = await response.json()
          if (data.code !== 0) return null
          return {
              room_id: data.data.room_id,
              short_id: data.data.short_id
          }
      } catch (e) {
          console.error(e)
          return null
      }
  },

  async getDanmuInfo(roomid: number): Promise<{ token: string, host_list: any[] } | null> {
      try {
          const headers = getHeaders()
          console.log('[BiliService] getDanmuInfo headers:', headers)
          
          // Use WBI Sign for getDanmuInfo
          const params = {
              id: roomid,
              type: 0
          }
          const query = await encWbi(params)
          console.log('[BiliService] getDanmuInfo WBI query:', query)

          const response = await fetch(`https://api.live.bilibili.com/xlive/web-room/v1/index/getDanmuInfo?${query}`, {
              headers: headers
          })
          const data = await response.json()
          console.log('[BiliService] getDanmuInfo response:', data.code, data.message)
          if (data.code !== 0) return null
          return {
              token: data.data.token,
              host_list: data.data.host_list
          }
      } catch (e) {
          console.error('[BiliService] getDanmuInfo error:', e)
          return null
      }
  },

  // --- Video Info ---
  async getVideoInfo(bvid: string) {
    try {
      const response = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, {
          headers: getHeaders()
      })
      const data = await response.json()
      return data.code === 0 ? data.data : null
    } catch (e) {
      console.error(e)
      return null
    }
  },

  async getRelatedVideos(bvid: string): Promise<VideoItem[]> {
      try {
          const response = await fetch(`https://api.bilibili.com/x/web-interface/archive/related?bvid=${bvid}`, {
              headers: getHeaders()
          })
          const data = await response.json()
          if (data.code !== 0) return []
          return data.data.map((item: any) => ({
              bvid: item.bvid,
              aid: item.aid,
              pic: item.pic.replace('http:', 'https:'),
              title: item.title,
              owner: item.owner,
              stat: item.stat,
              duration: item.duration
          }))
      } catch (e) {
          console.error(e)
          return []
      }
  },

  async getComments(aid: number): Promise<any[]> {
      try {
          const response = await fetch(`https://api.bilibili.com/x/v2/reply?type=1&oid=${aid}&sort=1`, {
              headers: getHeaders()
          })
          const data = await response.json()
          if (data.code !== 0) return []
          
          const mapComment = (item: any) => ({
              rpid: item.rpid,
              content: { message: item.content.message },
              member: {
                  uname: item.member.uname,
                  avatar: item.member.avatar.replace('http:', 'https:'),
                  vip: item.member.vip
              },
              like: item.like,
              ctime: item.ctime,
              replies: item.replies ? item.replies.map(mapComment) : []
          })

          return data.data.replies.map(mapComment)
      } catch (e) {
          console.error(e)
          return []
      }
  },

  // --- Auth ---
  async getQRCode() {
    try {
      const res = await fetch('https://passport.bilibili.com/x/passport-login/web/qrcode/generate')
      const data = await res.json()
      return data.code === 0 ? data.data : null
    } catch (e) {
      console.error(e)
      return null
    }
  },

  async checkQRCode(qrcode_key: string) {
    try {
      const res = await fetch(`https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key=${qrcode_key}`)
      const data = await res.json()
      return data
    } catch (e) {
      console.error(e)
      return null
    }
  },
  
  async getNavUserInfo() {
      try {
          const res = await fetch('https://api.bilibili.com/x/web-interface/nav', {
              headers: getHeaders()
          })
          const data = await res.json()
          return data.code === 0 ? data.data : null
      } catch (e) {
          console.error(e)
          return null
      }
  },

  async getPersonalizedFeed(): Promise<VideoItem[]> {
      try {
          const res = await fetch('https://api.bilibili.com/x/web-interface/index/top/feed/rcmd?fresh_idx=1&feed_version=V8&ps=10', {
              headers: getHeaders()
          })
          const data = await res.json()
          if (data.code !== 0) return []
          return data.data.item.map((item: any) => ({
              bvid: item.bvid,
              aid: item.id,
              pic: item.pic ? item.pic.replace('http:', 'https:') : '',
              title: item.title,
              owner: {
                  name: item.owner?.name || 'Unknown',
                  mid: item.owner?.mid || 0,
                  face: item.owner?.face ? item.owner.face.replace('http:', 'https:') : ''
              },
              stat: {
                  view: item.stat?.view || 0,
                  danmaku: item.stat?.danmaku || 0
              },
              duration: item.duration
          }))
      } catch (e) {
          console.error(e)
          return []
      }
  },

  async searchVideos(keyword: string): Promise<VideoItem[]> {
      try {
          const res = await fetch(`https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(keyword)}`, {
              headers: getHeaders()
          })
          const data = await res.json()
          if (data.code !== 0 || !data.data.result) return []
          return data.data.result.map((item: any) => ({
              bvid: item.bvid,
              aid: item.id,
              pic: item.pic.replace('http:', 'https:'),
              title: item.title.replace(/<em class="keyword">/g, '').replace(/<\/em>/g, ''),
              owner: {
                  name: item.author,
                  mid: item.mid,
                  face: '' // Search API doesn't return face
              },
              stat: {
                  view: item.play,
                  danmaku: item.video_review
              },
              duration: 0 // Duration format is string "MM:SS"
          }))
      } catch (e) {
          console.error(e)
          return []
      }
  },

  async getBangumiFeed(): Promise<any[]> {
      try {
          const res = await fetch('https://api.bilibili.com/pgc/web/timeline/v2?season_type=1&day_before=2&day_after=4', {
              headers: getHeaders()
          })
          const data = await res.json()
          // Extract today's updates or recent
          // Simplified for now
          return [] 
      } catch (e) {
          console.error(e)
          return []
      }
  }
}

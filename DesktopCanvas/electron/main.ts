import { app, BrowserWindow, ipcMain, session, screen, Tray, Menu, nativeImage } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Disable security warnings
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

// Ignore certificate errors
app.commandLine.appendSwitch('ignore-certificate-errors')
app.commandLine.appendSwitch('ignore-urlfetcher-cert-requests')

// Disable QUIC and HTTP2 to prevent connection resets on some networks (Restored as it was working before)
app.commandLine.appendSwitch('disable-quic')
app.commandLine.appendSwitch('disable-http2')

// Relax SameSite constraints for Iframe cookies
app.commandLine.appendSwitch('disable-features', 'SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure')
app.commandLine.appendSwitch('disable-site-isolation-trials')

// Disable hardware acceleration to fix video black screen in transparent window
app.disableHardwareAcceleration()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null
let tray: Tray | null = null
let globalCookies = ''

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
  // Get primary display size
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  win = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    type: 'toolbar', // Makes it float above other windows (optional, can be 'desktop' for bottom)
    frame: false,
    transparent: true,
    alwaysOnTop: true, // Enabled to keep Dock on top
    hasShadow: false,
    skipTaskbar: false, // Show in taskbar so we can Alt+Tab
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      webSecurity: false, 
      webviewTag: true,
    },
  })

  // Enable click-through
  win.setIgnoreMouseEvents(true, { forward: true })

  // System Tray
  const iconPath = path.join(process.env.VITE_PUBLIC, 'vite.svg')
  try {
    // Try to load the icon first
    let icon = nativeImage.createFromPath(iconPath)
    if (icon.isEmpty()) {
        console.warn('Tray icon is empty or failed to load:', iconPath)
        // Fallback or just continue
    }
    
    tray = new Tray(icon)
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show/Hide', click: () => {
          if (win?.isVisible()) win.hide(); else win?.show()
      }},
      { type: 'separator' },
      { label: 'Quit BiliCard', click: () => app.quit() }
    ])
    tray.setToolTip('BiliCard Desktop')
    tray.setContextMenu(contextMenu)
  } catch (error) {
    console.error('Failed to create system tray:', error)
    // App can continue without tray
  }

  // IPC to toggle mouse events
  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    win.setIgnoreMouseEvents(ignore, { forward: true })
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  // Block popups (like player quality selection opening new window)
  win.webContents.setWindowOpenHandler(({ url }) => {
    console.log('Blocked popup:', url)
    return { action: 'deny' }
  })

  // Explicitly handle certificate errors to allow self-signed or proxy certificates
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    // Log the error for debugging
    // console.log(`[Certificate Error] URL: ${url}, Error: ${error}, Cert: ${certificate.subject.commonName}`)
    // Prevent default behavior which is to cancel loading
    event.preventDefault()
    // Allow the certificate
    callback(true)
  })

  // Configure Request Interception for both Default and Webview Sessions
  const configureSession = (sess: Electron.Session) => {
      // Force User-Agent for all requests to avoid Bilibili blocking/handshake issues
      // Use standard Chrome UA instead of Edge to minimize fingerprinting
      sess.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

      sess.webRequest.onBeforeSendHeaders((details, callback) => {
        const url = details.url
        const headers = details.requestHeaders
    
        // Only modify Referer for Bilibili domains
        if (url.includes('bilibili.com')) {
          // Check if this is a request from our Renderer (Custom Header)
          const isRendererRequest = !!headers['X-Bili-Cookie']
          
          // Check if this is an image load (likely from Canvas)
          const isImage = details.resourceType === 'image'
          
          // 1. Handle User-Agent
          if (isRendererRequest || isImage) {
              // Bilibili might block 'Electron'. Let's use a safe Edge/Chrome UA.
              headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0'
          }
    
          // 2. Handle Cookies injection from Renderer
          if (headers['X-Bili-Cookie']) {
            // Strip any potential trailing semicolons or spaces
            const cleanCookie = headers['X-Bili-Cookie'].trim().replace(/;$/, '')
            headers['Cookie'] = cleanCookie
            delete headers['X-Bili-Cookie']
          } else if (globalCookies && !headers['Cookie']) {
            headers['Cookie'] = globalCookies
          }
    
          // 3. Referer Handling
          // Generic Referer handling for API and Video Streams
          const isApi = url.includes('api.bilibili.com') || url.includes('passport.bilibili.com') || url.includes('api.live.bilibili.com')
          const isVideo = url.includes('bilivideo.com') || url.includes('hdslb.com') || url.includes('bilivideo.cn')
          const isLive = url.includes('live.bilibili.com')
          const isPassport = url.includes('passport.bilibili.com')
          
          if (isRendererRequest || isImage || isVideo || isApi || isLive) {
              if (isPassport) {
                  // For passport (login), allow the original Referer if present, or default to login page
                  // Do NOT delete Origin for passport as it breaks CORS/Security checks
                  if (!headers['Referer']) {
                       headers['Referer'] = 'https://passport.bilibili.com/login'
                  }
              } else if (url.includes('player.bilibili.com')) {
                  headers['Referer'] = 'https://www.bilibili.com/'
              } else if (url.includes('search/type')) {
                  try {
                      const urlObj = new URL(url)
                      const keyword = urlObj.searchParams.get('keyword')
                      const searchType = urlObj.searchParams.get('search_type')
                      
                      if ((searchType === 'live' || searchType === 'live_room') && keyword) {
                          headers['Referer'] = `https://search.bilibili.com/live?keyword=${encodeURIComponent(keyword)}`
                      } else {
                          headers['Referer'] = 'https://search.bilibili.com/all'
                      }
                  } catch (e) {
                      headers['Referer'] = 'https://search.bilibili.com/all'
                  }
              } else if (url.includes('getDanmuInfo')) {
                  try {
                      const urlObj = new URL(url)
                      const roomId = urlObj.searchParams.get('id')
                      if (roomId) {
                          headers['Referer'] = `https://live.bilibili.com/${roomId}`
                      } else {
                          headers['Referer'] = 'https://live.bilibili.com/'
                      }
                  } catch (e) {
                      headers['Referer'] = 'https://live.bilibili.com/'
                  }
                  delete headers['Origin']
              } else if (isLive || url.includes('/xlive/')) {
                  headers['Referer'] = 'https://live.bilibili.com/'
              } else {
                  headers['Referer'] = 'https://www.bilibili.com/'
              }

              // Remove Origin to prevent 412 Precondition Failed for some WBI APIs
              // But Keep it for Passport (Login) and Live API (needs correct Origin)
              if (isApi && !url.includes('getDanmuInfo') && !isPassport) {
                  if (url.includes('api.live.bilibili.com')) {
                      headers['Origin'] = 'https://live.bilibili.com'
                  } else {
                      delete headers['Origin']
                  }
              }
              
              // Special handling for search/type API
              if (url.includes('search/type')) {
                  delete headers['Origin']
              }
          } else {
              // Fallback
              if (!headers['Referer']) {
                  headers['Referer'] = 'https://www.bilibili.com/'
              }
          }
        } else if (url.includes('bilivideo.com') || url.includes('hdslb.com') || url.includes('bilivideo.cn')) {
            // Handle video domains
            delete headers['Referer']
            delete headers['Origin']
            
            headers['Referer'] = 'https://www.bilibili.com/'
            headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    
        callback({ requestHeaders: headers })
      })
    
      // Strip X-Frame-Options to allow loading in iframe and inject CORS
      sess.webRequest.onHeadersReceived((details, callback) => {
        const responseHeaders = details.responseHeaders || {}
        
        // Remove X-Frame-Options and CSP to allow iframe loading and script/style injection
        if (details.url.includes('bilibili.com')) {
            delete responseHeaders['x-frame-options']
            delete responseHeaders['content-security-policy']
            delete responseHeaders['frame-options']
            
            // Inject CORS headers to allow cross-origin requests with credentials
            responseHeaders['Access-Control-Allow-Origin'] = ['https://www.bilibili.com']
            responseHeaders['Access-Control-Allow-Credentials'] = ['true']
        }
        
        callback({ responseHeaders })
      })
  }

  // Apply to Default Session
  configureSession(win.webContents.session)
  
  // Apply to Webview Partition Session
  configureSession(session.fromPartition('persist:bilibili'))

  // IPC: App Control
  ipcMain.on('quit-app', () => {
      app.quit()
  })

  // IPC: Set Cookies
  ipcMain.handle('set-cookie', async (event, cookieString: string) => {
    globalCookies = cookieString
    const cookies = cookieString.split(';').map(c => c.trim()).filter(Boolean)
    
    // Sessions to sync: Default (for requests) and Webview Partition (for player)
    const sessions = [
        session.defaultSession,
        session.fromPartition('persist:bilibili')
    ]

    for (const cookie of cookies) {
        const splitIndex = cookie.indexOf('=')
        if (splitIndex === -1) continue
        
        const name = cookie.substring(0, splitIndex).trim()
        const value = cookie.substring(splitIndex + 1).trim()
        
        if (name && value) {
                 const isHttpOnly = name === 'SESSDATA' || name === 'DedeUserID__ckMd5'
                 const baseCookie = {
                    domain: '.bilibili.com',
                    path: '/',
                    name,
                    value,
                    expirationDate: Date.now() / 1000 + 31536000,
                    sameSite: 'no_restriction',
                    secure: true,
                    httpOnly: isHttpOnly
                } as Electron.CookiesSetDetails

                // Set for both main domain and specifically for live domain to ensure coverage
                const cookieVariations = [
                    { ...baseCookie, url: 'https://bilibili.com' },
                    { ...baseCookie, url: 'https://live.bilibili.com' },
                    { ...baseCookie, url: 'https://www.bilibili.com' }
                ]

                for (const sess of sessions) {
                    for (const cookieDetails of cookieVariations) {
                        try {
                            await sess.cookies.set(cookieDetails)
                        } catch (e) { 
                            // console.error(`Cookie Set Error for ${name}:`, e) 
                        }
                    }
                }
            }
    }
    console.log('Cookies synced to all sessions')
  })

  // IPC: Logger
  ipcMain.on('log', (event, message) => {
      console.log(`[Renderer] ${message}`)
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(process.env.DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)

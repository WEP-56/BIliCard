import { app, BrowserWindow, ipcMain, session, screen, Tray, Menu, nativeImage } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Disable security warnings
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

// Relax SameSite constraints for Iframe cookies
// Note: WebRtcHideLocalIpsWithMdns MUST be disabled to fix .local resolution errors
app.commandLine.appendSwitch('disable-features', 'SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure,WebRtcHideLocalIpsWithMdns')
app.commandLine.appendSwitch('disable-site-isolation-trials')

// Disable IPv6 to prevent DNS resolution issues with STUN/WebRTC
// app.commandLine.appendSwitch('enable-features', 'BlockInsecurePrivateNetworkRequests')
// app.commandLine.appendSwitch('enable-quic')
// app.commandLine.appendSwitch('disable-features', 'AsyncDns')

// Disable hardware acceleration to fix video black screen in transparent window
// app.disableHardwareAcceleration()

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
      additionalArguments: [`--preload-live=${path.join(__dirname, 'preload.mjs')}`]
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

  // Explicitly handle certificate errors to allow self-signed or proxy certificates
  // This is required for some Bilibili internal APIs and P2P connections
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
      const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      sess.setUserAgent(USER_AGENT)

      sess.webRequest.onBeforeSendHeaders((details, callback) => {
        const url = details.url
        const headers = details.requestHeaders

        const isRendererRequest = !!headers['X-Bili-Cookie']

        // Handle Cookie Injection
        if (headers['X-Bili-Cookie']) {
            const cleanCookie = headers['X-Bili-Cookie'].trim().replace(/;$/, '')
            headers['Cookie'] = cleanCookie
            delete headers['X-Bili-Cookie']
        } else if (globalCookies && !headers['Cookie']) {
            headers['Cookie'] = globalCookies
        }

        // Global User-Agent Override
        headers['User-Agent'] = USER_AGENT

        // Check if this is a request to Bilibili domains
        const isBiliDomain = url.includes('bilibili.com') || url.includes('bilivideo.com') || url.includes('hdslb.com') || url.includes('bilivideo.cn')

        if (isBiliDomain) {
            // Default Referer to www.bilibili.com
            // This is critical for the player to work
            if (!headers['Referer'] || headers['Referer'].includes('file://') || headers['Referer'].includes('localhost')) {
                headers['Referer'] = 'https://www.bilibili.com/'
            }
            
            // Fix Origin for API/Player requests
            // Bilibili API often checks Origin matching the domain
            if (!headers['Origin'] || headers['Origin'].includes('file://') || headers['Origin'].includes('localhost')) {
                // For live.bilibili.com, Origin must be https://live.bilibili.com
                if (url.includes('live.bilibili.com') || url.includes('api.live.bilibili.com')) {
                    headers['Origin'] = 'https://live.bilibili.com'
                    headers['Referer'] = 'https://live.bilibili.com/'
                } else {
                     headers['Origin'] = 'https://www.bilibili.com'
                }
            }

            // Special Case: Search API
            if (url.includes('search/type')) {
                // Search API is sensitive to Origin, sometimes prefers it removed or matching
                delete headers['Origin']
            }
        }
    
        callback({ requestHeaders: headers })
      })
    
      // Strip X-Frame-Options to allow loading in iframe and inject CORS
      sess.webRequest.onHeadersReceived((details, callback) => {
        const url = details.url
        const responseHeaders = details.responseHeaders || {}
        
        // Remove X-Frame-Options and CSP to allow iframe loading and script/style injection
        if (url.includes('bilibili.com')) {
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

  // IPC: Get Cookies (for preload)
  ipcMain.handle('get-cookies', () => {
      return globalCookies
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
                 const isSameSiteNone = name === 'bili_jct' || name === 'buvid3'
                 const baseCookie = {
                    domain: '.bilibili.com',
                    path: '/',
                    name,
                    value,
                    expirationDate: Date.now() / 1000 + 31536000,
                    sameSite: isSameSiteNone ? 'no_restriction' : 'lax', // Use Lax for most, None for JCT/CSRF if needed
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

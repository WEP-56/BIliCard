import { app, BrowserWindow, ipcMain, session, screen, Tray, Menu, nativeImage } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'

// Disable security warnings
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

// Relax SameSite constraints for Iframe cookies
app.commandLine.appendSwitch('disable-features', 'SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure')
app.commandLine.appendSwitch('disable-site-isolation-trials')

// Disable hardware acceleration to fix video black screen in transparent window
app.disableHardwareAcceleration()
// app.commandLine.appendSwitch('disable-gpu')
// app.commandLine.appendSwitch('disable-gpu-compositing')
// app.commandLine.appendSwitch('disable-gpu-rasterization')
// app.commandLine.appendSwitch('disable-gpu-sandbox')
// app.commandLine.appendSwitch('disable-software-rasterizer') // REMOVED: We need software rasterizer!

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

import { LiveDanmakuClient } from './danmaku-client'

let win: BrowserWindow | null
let tray: Tray | null = null
let globalCookies = ''
let currentDanmakuClient: LiveDanmakuClient | null = null
let currentMpvSocket: net.Socket | null = null
let currentMpvProcess: ChildProcess | null = null

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
    alwaysOnTop: false, // DISABLED for safety!
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
    win?.setIgnoreMouseEvents(ignore, { forward: true })
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  // Block popups (like player quality selection opening new window)
  win.webContents.setWindowOpenHandler(({ url }) => {
    console.log('Blocked popup:', url)
    return { action: 'deny' }
  })

  // Configure Request Interception for both Default and Webview Sessions
  const configureSession = (sess: Electron.Session) => {
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
          // Only enforce UA for Renderer requests or Images. 
          // Webview should use its own UA set in the tag.
          if (isRendererRequest || isImage) {
              // headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              // Use session UA to avoid -352 error due to UA mismatch with Cookies
              // Or use a very standard one that matches what we use in login window (if possible)
              // For now, let's comment out the override and see if default Electron UA works (it might contain 'Electron')
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
          
          if (isRendererRequest || isImage || isVideo || isApi || isLive) {
              if (url.includes('passport.bilibili.com')) {
                  headers['Referer'] = 'https://passport.bilibili.com/login'
              } else if (url.includes('search/type')) {
                  // ... (existing search logic)
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
                  // Special handling for getDanmuInfo to avoid -352
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
                  // Ensure Origin is correct (or removed)
                  // For GET requests, usually no Origin. But if present, must match.
                  delete headers['Origin']
              } else if (isLive || url.includes('/xlive/')) {
                  headers['Referer'] = 'https://live.bilibili.com/'
              } else {
                  headers['Referer'] = 'https://www.bilibili.com/'
              }

              // Remove Origin to prevent 412 Precondition Failed for some WBI APIs
              if (isApi && !url.includes('getDanmuInfo')) { // Avoid double delete if handled above
                  delete headers['Origin']
              }
              
              // Special handling for search/type API: It might need cookies but NO Origin
              // And strict Referer matching
              if (url.includes('search/type')) {
                  delete headers['Origin']
              }
          } else {
              // Fallback
              if (!headers['Referer']) {
                  headers['Referer'] = 'https://www.bilibili.com/'
                  // headers['Origin'] = 'https://www.bilibili.com'
              }
          }
        } else if (url.includes('bilivideo.com') || url.includes('hdslb.com') || url.includes('bilivideo.cn')) {
            // Handle video domains that might not have 'bilibili.com' in them
            // Remove existing headers to prevent duplication/conflict
            delete headers['Referer']
            delete headers['Origin']
            
            headers['Referer'] = 'https://www.bilibili.com/'
            // Some CDNs reject requests with Origin header if it doesn't match expected patterns
            // Safest bet is to NOT send Origin for GET requests to video CDN, or set it to null
            // But Bilibili usually expects Referer.
            // headers['Origin'] = 'https://www.bilibili.com' 
            headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    
        callback({ requestHeaders: headers })
      })
    
      // Strip X-Frame-Options to allow loading in iframe
      sess.webRequest.onHeadersReceived((details, callback) => {
        const responseHeaders = details.responseHeaders || {}
        
        // Remove X-Frame-Options and CSP to allow iframe loading and script/style injection
        if (details.url.includes('bilibili.com')) {
            delete responseHeaders['x-frame-options']
            delete responseHeaders['content-security-policy']
            delete responseHeaders['frame-options']
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
        const [name, ...rest] = cookie.split('=')
        const value = rest.join('=')
        if (name && value) {
             const isHttpOnly = name === 'SESSDATA'
             const cookieDetails = {
                url: 'https://bilibili.com',
                domain: '.bilibili.com',
                path: '/',
                name,
                value,
                expirationDate: Date.now() / 1000 + 31536000,
                sameSite: 'no_restriction',
                secure: true,
                httpOnly: isHttpOnly
            } as Electron.CookiesSetDetails

            for (const sess of sessions) {
                try {
                    await sess.cookies.remove('https://bilibili.com', name)
                } catch (e) { /* ignore */ }
                
                await sess.cookies.set(cookieDetails).catch(e => console.error('Cookie Set Error:', e))
            }
        }
    }
    console.log('Cookies synced to all sessions')
  })

  // IPC: MPV Command
  ipcMain.handle('mpv-command', async (event, args: any[]) => {
    if (!currentMpvSocket || currentMpvSocket.destroyed) {
        return { success: false, error: 'MPV not connected' }
    }
    
    return new Promise((resolve) => {
        try {
            const command = JSON.stringify({ command: args }) + '\n'
            currentMpvSocket?.write(command, (err) => {
                if (err) resolve({ success: false, error: err.message })
                else resolve({ success: true })
            })
        } catch (e) {
            resolve({ success: false, error: String(e) })
        }
    })
  })

  // IPC: Save Temp File (for Danmaku/Subtitles)
  ipcMain.handle('save-temp-file', async (event, filename: string, content: string) => {
      try {
          const tempDir = app.getPath('temp')
          const filePath = path.join(tempDir, filename)
          await fs.promises.writeFile(filePath, content, 'utf-8')
          return { success: true, path: filePath }
      } catch (e) {
          return { success: false, error: String(e) }
      }
  })

  // IPC: Connect Danmaku
  ipcMain.handle('connect-danmaku', (event, roomId: number, token?: string, uid: number = 0) => {
      console.log(`[Main] connect-danmaku called for room ${roomId}, uid ${uid}`)
      if (currentDanmakuClient) {
          console.log('[Main] Closing existing danmaku client')
          currentDanmakuClient.close()
      }
      if (win) {
          console.log('[Main] Creating new LiveDanmakuClient')
          currentDanmakuClient = new LiveDanmakuClient(roomId, win, token, uid)
          if (currentMpvSocket) {
              currentDanmakuClient.setMpvSocket(currentMpvSocket)
          }
          currentDanmakuClient.connect()
      } else {
        console.error('[Main] connect-danmaku failed: win is null')
      }
  })

  // IPC: Logger
  ipcMain.on('log', (event, message) => {
      console.log(`[Renderer] ${message}`)
  })

  // IPC: Stop MPV
  ipcMain.handle('stop-mpv', async (event) => {
      console.log('Stopping MPV...')
      // Stop previous danmaku client if exists
      if (currentDanmakuClient) {
          currentDanmakuClient.close()
          currentDanmakuClient = null
      }
      
      // Send quit command to MPV via IPC
      if (currentMpvSocket && !currentMpvSocket.destroyed) {
          try {
              const command = JSON.stringify({ command: ['quit'] }) + '\n'
              currentMpvSocket.write(command)
              return { success: true }
          } catch (e) {
              console.error('Failed to send quit command:', e)
          }
      }
      
      // Force kill if IPC failed or not connected but process exists
      if (currentMpvProcess) {
          console.log('Force killing MPV process...')
          try {
              currentMpvProcess.kill()
              currentMpvProcess = null
          } catch (e) {
              console.error('Failed to kill MPV process:', e)
          }
      }
      
      return { success: true }
  })

  // IPC: Spawn MPV
  ipcMain.handle('spawn-mpv', async (event, url: string, title: string) => {
    console.log('Spawning MPV for:', title, url)

    // Stop previous danmaku client if exists
    if (currentDanmakuClient) {
        currentDanmakuClient.close()
        currentDanmakuClient = null
    }
    
    // Close previous MPV socket
    if (currentMpvSocket) {
        currentMpvSocket.destroy()
        currentMpvSocket = null
    }

    // Force kill previous MPV process if still running
    if (currentMpvProcess) {
        console.log('Killing existing MPV process before spawn')
        try {
            currentMpvProcess.kill()
        } catch (e) {
            console.error('Failed to kill existing MPV:', e)
        }
        currentMpvProcess = null
    }

    // Determine MPV Path
    // 1. Check local bin folder
    let mpvPath = 'mpv' // Default to PATH
    const isPackaged = app.isPackaged
    // In packaged app, resources are usually at appPath/../resources (Windows/Linux)
    // Or inside appPath/Contents/Resources (macOS)
    // process.resourcesPath is the reliable way in Electron
    const localBinPath = isPackaged 
        ? path.join(process.resourcesPath, 'bin', 'mpv.exe')
        : path.join(process.cwd(), 'bin', 'mpv.exe')

    if (fs.existsSync(localBinPath)) {
        mpvPath = localBinPath
        console.log('Found local MPV at:', mpvPath)
    } else {
        console.warn('Local MPV not found at:', localBinPath, 'Trying system PATH')
    }

    // Construct HTTP Headers
    // Note: To avoid command line parsing issues with spaces/special chars in Windows,
    // we will write a temporary config file for MPV to load.
    
    let headers = 'Referer: https://www.bilibili.com/,User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    if (globalCookies) {
        // Ensure cookies are safe
        headers += `,Cookie: ${globalCookies}`
    }
    
    // IPC Pipe Name (Windows Named Pipe)
    const pipeName = `\\\\.\\pipe\\mpv-ipc-${Date.now()}`
    
    // Create a temporary config file for this session
    // Use app.getPath('temp') to avoid pollution and permission issues
    const tempDir = app.getPath('temp')
    const tempConfigPath = path.join(tempDir, `mpv-session-${Date.now()}.conf`)
    const configContent = `http-header-fields=${headers}\ninput-ipc-server=${pipeName}\n`
    
    try {
        fs.writeFileSync(tempConfigPath, configContent, 'utf-8')
    } catch (e) {
        console.error('Failed to write temp config:', e)
    }

    const args = [
        url,
        `--title=${title}`,
        '--force-window',
        '--keep-open',
        `--include=${tempConfigPath}`, // Include the temp config
        // '--msg-level=all=v', 
        // `--log-file=${path.join(tempDir, 'mpv-debug.log')}` 
    ]
    
    console.log('Spawning with args:', args)

    try {
        const child = spawn(mpvPath, args, {
            detached: false, 
            stdio: ['ignore', 'pipe', 'pipe'], // Capture stdout/stderr
            windowsVerbatimArguments: true 
        })
        
        currentMpvProcess = child

        child.stdout?.on('data', (data) => {
            const output = data.toString()
            // Filter out MPV status lines (e.g. AV: 00:00:18 ...)
            if (output.startsWith('AV:') || output.includes('Cache:')) {
                return
            }
            console.log(`[MPV] ${output.trim()}`)
        })
        
        child.stderr?.on('data', (data) => {
            console.error(`[MPV Err] ${data}`)
        })
        
        child.on('error', (err) => {
             console.error('MPV Spawn Error:', err)
        })
        
        child.on('exit', (code, signal) => {
            console.log(`MPV exited with code ${code} and signal ${signal}`)
            
            if (currentMpvProcess === child) {
                currentMpvProcess = null
            }

            // Cleanup temp file
            try {
                if (fs.existsSync(tempConfigPath)) fs.unlinkSync(tempConfigPath)
            } catch (e) { /* ignore */ }
            
            if (currentMpvSocket) {
                currentMpvSocket.destroy()
                currentMpvSocket = null
            }
        })
        
        // Connect to IPC Pipe
        // Return a promise that resolves when connected or fails
        return new Promise((resolve) => {
            let attempts = 0
            const maxAttempts = 10
            
            const tryConnect = () => {
                attempts++
                console.log(`[Main] Attempting MPV IPC connection (${attempts}/${maxAttempts})...`)
                
                try {
                    const socket = net.connect(pipeName)
                    socket.on('connect', () => {
                        console.log('Connected to MPV IPC')
                        currentMpvSocket = socket
                        if (currentDanmakuClient) {
                            currentDanmakuClient.setMpvSocket(socket)
                        }
                        resolve({ success: true })
                    })
                    socket.on('error', (err) => {
                        if (attempts < maxAttempts) {
                            setTimeout(tryConnect, 500)
                        } else {
                            console.error('MPV IPC Connection Error (Final):', err)
                            resolve({ success: true, warning: 'IPC Connection Failed' }) // Return success for spawn, but warning for IPC
                        }
                    })
                } catch (e) {
                    if (attempts < maxAttempts) {
                        setTimeout(tryConnect, 500)
                    } else {
                         resolve({ success: true, warning: 'IPC Connection Failed' })
                    }
                }
            }
            
            // Initial delay to let MPV start
            setTimeout(tryConnect, 1000)
        })
    } catch (error) {
        console.error('Failed to spawn MPV:', error)
        return { success: false, error: String(error) }
    }
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

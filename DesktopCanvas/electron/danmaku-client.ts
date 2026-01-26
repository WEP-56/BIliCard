import WebSocket from 'ws'
import zlib from 'zlib'
import { BrowserWindow } from 'electron'

// Bilibili Live Danmaku Protocol Constants
const WS_OP_HEARTBEAT = 2
const WS_OP_HEARTBEAT_REPLY = 3
const WS_OP_MESSAGE = 5
const WS_OP_USER_AUTHENTICATION = 7
const WS_OP_CONNECT_SUCCESS = 8

const WS_HEADER_OFFSET = 16
const WS_VERSION_OFFSET = 6
const WS_OPERATION_OFFSET = 8
const WS_SEQUENCE_OFFSET = 12

export class LiveDanmakuClient {
    private ws: WebSocket | null = null
    private heartbeatInterval: NodeJS.Timeout | null = null
    private roomId: number
    private token: string | undefined
    private mainWindow: BrowserWindow
    private mpvSocket: any = null // Placeholder for MPV IPC socket

    private uid: number = 0

    constructor(roomId: number, win: BrowserWindow, token?: string, uid: number = 0) {
        this.roomId = roomId
        this.mainWindow = win
        this.token = token
        this.uid = uid
    }

    public setMpvSocket(socket: any) {
        this.mpvSocket = socket
    }

    public connect() {
        // Default Bilibili Live WS URL
        const url = 'wss://broadcastlv.chat.bilibili.com/sub'
        
        console.log(`[Danmaku] Connecting to ${url} for room ${this.roomId}`)

        // Add headers for WebSocket connection to avoid 403/Disconnect
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://live.bilibili.com'
            }
        }
        
        try {
            this.ws = new WebSocket(url, options)
        } catch (e) {
            console.error('[Danmaku] Failed to create WebSocket:', e)
            return
        }

        this.ws.on('open', () => {
            console.log(`[Danmaku] WebSocket Open. Sending Auth...`)
            this.sendAuth()
        })

        this.ws.on('message', (data: Buffer) => {
            this.handleMessage(data)
        })

        this.ws.on('close', (code, reason) => {
            console.log(`[Danmaku] Connection closed. Code: ${code}, Reason: ${reason}`)
            this.stopHeartbeat()
        })

        this.ws.on('error', (err) => {
            console.error('[Danmaku] Error:', err)
        })
    }

    public close() {
        if (this.ws) {
            this.ws.removeAllListeners()
            this.ws.close()
            this.ws = null
        }
        this.stopHeartbeat()
    }

    private sendAuth() {
        // Authentication Packet
        const authData: any = {
            uid: this.uid, 
            roomid: this.roomId,
            protover: 2, // Use 2 (Zlib) for better compatibility, 3 (Brotli) might need brotli-decompress
            platform: 'web',
            type: 2
        }
        
        if (this.token) {
            authData.key = this.token
        }

        const authBody = JSON.stringify(authData)
        console.log('[Danmaku] Sending Auth:', authBody)

        const header = Buffer.alloc(WS_HEADER_OFFSET)
        header.writeUInt32BE(WS_HEADER_OFFSET + Buffer.byteLength(authBody), 0)
        header.writeUInt16BE(WS_HEADER_OFFSET, 4)
        header.writeUInt16BE(1, WS_VERSION_OFFSET)
        header.writeUInt32BE(WS_OP_USER_AUTHENTICATION, WS_OPERATION_OFFSET)
        header.writeUInt32BE(1, WS_SEQUENCE_OFFSET)

        this.ws?.send(Buffer.concat([header, Buffer.from(authBody)]))
    }

    private startHeartbeat() {
        this.stopHeartbeat()
        // First heartbeat immediately
        this.sendHeartbeat()
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat()
        }, 30000)
    }
    
    private sendHeartbeat() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const header = Buffer.alloc(WS_HEADER_OFFSET)
            header.writeUInt32BE(WS_HEADER_OFFSET, 0) // Packet Length (Header only)
            header.writeUInt16BE(WS_HEADER_OFFSET, 4) // Header Length
            header.writeUInt16BE(1, WS_VERSION_OFFSET)
            header.writeUInt32BE(WS_OP_HEARTBEAT, WS_OPERATION_OFFSET)
            header.writeUInt32BE(1, WS_SEQUENCE_OFFSET)
            this.ws.send(header)
        }
    }

    private stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval)
            this.heartbeatInterval = null
        }
    }

    private handleMessage(data: Buffer) {
        let offset = 0
        while (offset < data.length) {
            const packetLen = data.readUInt32BE(offset)
            const headerLen = data.readUInt16BE(offset + 4)
            const protocolVer = data.readUInt16BE(offset + 6)
            const operation = data.readUInt32BE(offset + 8)
            const bodyBuffer = data.subarray(offset + headerLen, offset + packetLen)

            if (operation === WS_OP_CONNECT_SUCCESS) {
                console.log('[Danmaku] Auth Success')
                this.startHeartbeat()
            } else if (operation === WS_OP_HEARTBEAT_REPLY) {
                // Heartbeat reply (popularity)
                const popularity = bodyBuffer.readUInt32BE(0)
                // this.mainWindow.webContents.send('danmaku-popularity', popularity)
            } else if (operation === WS_OP_MESSAGE) {
                this.decodeMessage(bodyBuffer, protocolVer)
            }

            offset += packetLen
        }
    }

    private decodeMessage(body: Buffer, protocol: number) {
        if (protocol === 2) {
            // Zlib compressed
            try {
                zlib.inflate(body, (err, result) => {
                    if (!err) {
                        this.handleMessage(result)
                    } else {
                        console.error('[Danmaku] Zlib error:', err)
                    }
                })
            } catch (e) { console.error(e) }
        } else if (protocol === 3) {
            // Brotli compressed (Need 'brotli' or native zlib.brotliDecompress)
            // Node 10+ has native brotli in zlib
            try {
                zlib.brotliDecompress(body, (err, result) => {
                    if (!err) {
                        this.handleMessage(result)
                    } else {
                        console.error('[Danmaku] Brotli error:', err)
                    }
                })
            } catch (e) { console.error(e) }
        } else {
            // Plain JSON
            try {
                const json = JSON.parse(body.toString('utf-8'))
                this.processCommand(json)
            } catch (e) {
                // Ignore parsing errors for non-JSON bodies
            }
        }
    }

    private processCommand(cmd: any) {
        if (cmd.cmd === 'DANMU_MSG') {
            const info = cmd.info
            const danmaku = {
                content: info[1],
                user: { name: info[2][1], id: info[2][0] },
                color: info[0][3] || 0xffffff,
                timestamp: info[0][4]
            }
            // this.mainWindow.webContents.send('danmaku-message', danmaku)
            if (this.mpvSocket) {
                try {
                    // Ensure content is string
                    const content = String(danmaku.content)
                    const userName = String(danmaku.user.name)
                    
                    const safeText = `${userName}: ${content}`
                        .replace(/\n/g, " ")
                    
                    // Send as script-message for custom rendering
                    // Arguments: content, color, author
                    const cmd = JSON.stringify({ 
                        command: ["script-message", "osd-danmaku", content, String(danmaku.color), userName] 
                    })
                    this.mpvSocket.write(cmd + '\n')
                } catch (e) { console.error('MPV IPC Error', e) }
            }
        } else if (cmd.cmd === 'SEND_GIFT') {
            const data = cmd.data
            const gift = {
                user: data.uname,
                giftName: data.giftName,
                num: data.num,
                action: data.action
            }
            this.mainWindow.webContents.send('danmaku-gift', gift)
        } else if (cmd.cmd === 'INTERACT_WORD') {
             // User entered room
             // this.mainWindow.webContents.send('danmaku-interact', cmd.data.uname)
        }
    }
}

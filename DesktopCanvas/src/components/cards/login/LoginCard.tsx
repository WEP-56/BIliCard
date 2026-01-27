import React, { useEffect, useState, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { BiliService } from '../../../services/bili-service'
import { useUserStore } from '../../../store/useUserStore'
import { useCardStore } from '../../../store/useCardStore'
import { CheckCircle, LogOut } from 'lucide-react'

export const LoginCard: React.FC = () => {
  const [qrUrl, setQrUrl] = useState('')
  const [status, setStatus] = useState('Loading QR Code...')
  const userInfo = useUserStore((state) => state.userInfo)
  const setUserInfo = useUserStore((state) => state.setUserInfo)
  const setCookie = useUserStore((state) => state.setCookie)
  const logout = useUserStore((state) => state.logout)
  const removeCard = useCardStore(s => s.removeCard)
  
  const [isScanned, setIsScanned] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Start Login Flow
  useEffect(() => {
    if (userInfo) return

    let isMounted = true
    const startLogin = async () => {
      setQrUrl('')
      setIsScanned(false)
      setStatus('Loading QR Code...')
      
      const qrData = await BiliService.getQRCode()
      if (!qrData || !isMounted) return

      setQrUrl(qrData.url)
      setStatus('Please scan with Bilibili App')

      // Poll
      timerRef.current = setInterval(async () => {
        const res = await BiliService.checkQRCode(qrData.qrcode_key)
        console.log('Poll result:', res) // Debug log

        if (res.data.code === 0) {
            // Success
            clearInterval(timerRef.current!)
            
            const url = new URL(res.data.url)
            const params = new URLSearchParams(url.search)
            let cookieString = ''
            
            params.forEach((value, key) => {
                cookieString += `${key}=${value}; `
            })
            
            setCookie(cookieString)
            
            // Sync to Electron Session
            if ((window as any).ipcRenderer) {
                (window as any).ipcRenderer.invoke('set-cookie', cookieString)
            }
            
            // Fetch User Info
            const info = await BiliService.getNavUserInfo()
            if (info) {
                setUserInfo(info)
            }
        } else if (res.data.code === 86090) {
            setIsScanned(true)
            setStatus('Scanned. Please Confirm on Phone.')
        } else if (res.data.code === 86038) {
             setStatus('QR Code Expired. Refreshing...')
             clearInterval(timerRef.current!)
             // Auto Refresh
             if (isMounted) startLogin()
        }
      }, 3000)
    }

    startLogin()

    return () => {
      isMounted = false
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [userInfo])

  if (userInfo) {
      return (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-blue-500">
                  <img src={userInfo.face} alt={userInfo.uname} className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                  <h2 className="text-lg font-bold">{userInfo.uname}</h2>
                  <p className="text-gray-500 text-sm">Level {userInfo.level}</p>
              </div>
              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm">
                  <CheckCircle size={14} />
                  Logged In
              </div>
              <button 
                onClick={logout}
                className="mt-4 flex items-center gap-2 text-red-500 hover:bg-red-50 px-4 py-2 rounded transition-colors"
              >
                  <LogOut size={16} />
                  Logout
              </button>
          </div>
      )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
      <h2 className="text-lg font-bold text-gray-700">Scan to Login</h2>
      
      {qrUrl && !isScanned ? (
          <div className="bg-white p-2 rounded shadow-sm border">
            <QRCodeSVG value={qrUrl} size={180} />
          </div>
      ) : isScanned ? (
          <div className="w-[180px] h-[180px] flex items-center justify-center bg-green-50 rounded-full border-2 border-green-500 text-green-600">
             <CheckCircle size={64} className="animate-pulse" />
          </div>
      ) : (
          <div className="w-[180px] h-[180px] bg-gray-100 animate-pulse rounded" />
      )}

      <p className="text-sm text-gray-500 font-medium text-center">{status}</p>
    </div>
  )
}
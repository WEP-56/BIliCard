import React from 'react'
import { Moon, Sun, Info, AlertTriangle, Languages, Server, Check, X, Loader2 } from 'lucide-react'
import { useSettingsStore } from '../../../store/useSettingsStore'

export const SettingsCard: React.FC = () => {
  // Placeholder state for theme, in future can be connected to a store
  const [isDark, setIsDark] = React.useState(false)
  const { lang, setLang, serverUrl, setServerUrl, t } = useSettingsStore()
  
  const [inputUrl, setInputUrl] = React.useState(serverUrl)
  const [verifyStatus, setVerifyStatus] = React.useState<'idle' | 'verifying' | 'success' | 'error'>('idle')

  const handleVerify = async () => {
    if (!inputUrl) return
    
    try {
        setVerifyStatus('verifying')
        
        // 1. Check URL syntax
        new URL(inputUrl)
        
        // 2. Check connectivity
        // Using 'no-cors' to allow checking reachability even if CORS is not set up (opaque response)
        await fetch(inputUrl, { method: 'HEAD', mode: 'no-cors' })
        
        setVerifyStatus('success')
        setServerUrl(inputUrl)
        
        // Reset after 2s
        setTimeout(() => setVerifyStatus('idle'), 2000)
    } catch (e) {
        console.error('Verification failed', e)
        setVerifyStatus('error')
    }
  }

  return (
    <div className="p-4 space-y-6">
      {/* Theme Section */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t('settings.appearance')}</h2>
        
        {/* Language Toggle */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
                <Languages className="text-blue-500" />
                <span className="font-medium text-gray-700">{t('settings.language')}</span>
            </div>
            <div className="flex bg-gray-200 rounded-lg p-1">
                <button 
                    onClick={() => setLang('zh')}
                    className={`px-3 py-1 rounded-md text-sm transition-all ${lang === 'zh' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    中文
                </button>
                <button 
                    onClick={() => setLang('en')}
                    className={`px-3 py-1 rounded-md text-sm transition-all ${lang === 'en' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    English
                </button>
            </div>
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
                {isDark ? <Moon className="text-purple-500" /> : <Sun className="text-orange-500" />}
                <span className="font-medium text-gray-700">{t('settings.theme')}</span>
            </div>
            <button 
                onClick={() => setIsDark(!isDark)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDark ? 'bg-purple-600' : 'bg-gray-200'}`}
            >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDark ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
        </div>
      </section>

      {/* Server Section */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t('settings.server')}</h2>
        <div className="bg-gray-50 rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-3 mb-1">
                <Server className="text-green-600" size={20} />
                <span className="font-medium text-gray-700">{t('settings.server_url')}</span>
            </div>
            
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={inputUrl}
                    onChange={(e) => {
                        setInputUrl(e.target.value)
                        setVerifyStatus('idle')
                    }}
                    placeholder={t('settings.server_placeholder')}
                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
                />
                <button 
                    onClick={handleVerify}
                    disabled={verifyStatus === 'verifying' || !inputUrl}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 min-w-[100px] justify-center
                        ${verifyStatus === 'success' ? 'bg-green-500 text-white' : 
                          verifyStatus === 'error' ? 'bg-red-500 text-white' : 
                          'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                    {verifyStatus === 'verifying' && <Loader2 size={14} className="animate-spin" />}
                    {verifyStatus === 'success' && <Check size={14} />}
                    {verifyStatus === 'error' && <X size={14} />}
                    
                    {verifyStatus === 'verifying' ? t('settings.verifying') : 
                     verifyStatus === 'success' ? t('settings.verified') : 
                     verifyStatus === 'error' ? t('settings.verify_failed') :
                     t('settings.verify')}
                </button>
            </div>
        </div>
      </section>

      {/* About Section */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t('settings.about')}</h2>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-blue-700 font-semibold">
                <Info size={18} />
                <span>{t('settings.version')} 0.2.0 (Beta)</span>
            </div>
            <p className="text-sm text-blue-600/80 leading-relaxed">
                {t('settings.desc')}
            </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-yellow-700 font-semibold">
                <AlertTriangle size={18} />
                <span>{t('settings.issues')}</span>
            </div>
            <ul className="list-disc list-inside text-sm text-yellow-600/80 space-y-1">
                <li>{t('settings.issue_drag')}</li>
                <li>{t('settings.issue_latency')}</li>
            </ul>
        </div>
      </section>

      <div className="pt-4 text-center text-xs text-gray-400">
          {t('settings.footer')}
      </div>
    </div>
  )
}

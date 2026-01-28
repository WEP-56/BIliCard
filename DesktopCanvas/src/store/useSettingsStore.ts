import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Language = 'zh' | 'en'

interface SettingsState {
  lang: Language
  serverUrl: string
  setLang: (lang: Language) => void
  setServerUrl: (url: string) => void
  t: (key: keyof typeof translations['zh']) => string
}

const translations = {
  zh: {
    // Dock
    'dock.recommend': '推荐',
    'dock.search': '搜索',
    'dock.following': '动态',
    'dock.anime': '番剧',
    'dock.live': '直播',
    'dock.history': '历史记录',
    'dock.toview': '稍后再看',
    'dock.favorites': '收藏夹',
    'dock.more': '更多',
    'dock.login': '登录 / 个人中心',
    'dock.lock': '锁定位置',
    'dock.unlock': '解锁位置',
    'dock.quit': '退出应用',
    'dock.settings': '设置',
    'dock.quit_confirm': '确定要退出 BiliCard 吗？',

    // Card Actions
    'card.lock': '锁定卡片',
    'card.unlock': '解锁卡片',
    'card.maximize': '最大化',
    'card.restore': '还原',
    'card.close': '关闭',

    // Login Card
    'login.title': '登录 Bilibili',
    'login.scan': '请使用 Bilibili 手机客户端扫码登录',
    'login.scanned': '扫描成功',
    'login.confirm': '请在手机上确认登录',
    'login.success': '登录成功',
    'login.profile': '个人中心',
    'login.logout': '退出登录',
    'login.logout_confirm': '确定要退出登录吗？',
    'login.level': '等级',
    'login.coins': '硬币',
    'login.follows': '关注',
    'login.fans': '粉丝',
    'login.dynamic': '动态',

    // Search Card
    'search.placeholder': '搜索视频、番剧、UP主...',
    'search.tab_video': '视频',
    'search.tab_live': '直播',
    'search.no_results': '未找到相关内容',
    'search.searching': '搜索中...',

    // Settings Card
    'settings.title': '设置',
    'settings.appearance': '外观',
    'settings.theme': '应用主题',
    'settings.language': '语言 / Language',
    'settings.about': '关于 BiliCard',
    'settings.version': '当前版本',
    'settings.desc': '一个轻量级、卡片式的 Bilibili 桌面客户端。享受无干扰的观看体验。',
    'settings.issues': '已知问题',
    'settings.issue_drag': '窗口拖动可能会因为透明效果而感觉不同。',
    'settings.issue_latency': '部分直播流可能会有较高延迟。',
    'settings.footer': '由 WEP56 ❤️ 制作',

    // Video Player
    'player.loading': '加载中...',
    'player.intro': '简介',
    'player.related': '相关推荐',
    'player.comments': '评论',
    'player.follow': '+ 关注',
    'player.close': '关闭播放器',
    'player.views': '播放',
    'player.danmaku': '弹幕',

    // Common
    'common.updated': '已更新',
    'common.loading': '加载中...',
    'common.error': '出错了',
    'common.retry': '重试',
  },
  en: {
    // Dock
    'dock.recommend': 'Recommended',
    'dock.search': 'Search',
    'dock.following': 'Following',
    'dock.anime': 'Anime',
    'dock.live': 'Live',
    'dock.history': 'History',
    'dock.toview': 'To View',
    'dock.favorites': 'Favorites',
    'dock.more': 'More',
    'dock.login': 'Login / Profile',
    'dock.lock': 'Lock Position',
    'dock.unlock': 'Unlock Position',
    'dock.quit': 'Quit App',
    'dock.settings': 'Settings',
    'dock.quit_confirm': 'Are you sure you want to quit BiliCard?',

    // Card Actions
    'card.lock': 'Lock Card',
    'card.unlock': 'Unlock Card',
    'card.maximize': 'Maximize',
    'card.restore': 'Restore',
    'card.close': 'Close',

    // Login Card
    'login.title': 'Login to Bilibili',
    'login.scan': 'Please scan QR code with Bilibili App',
    'login.scanned': 'Scanned',
    'login.confirm': 'Please confirm on your phone',
    'login.success': 'Login Success',
    'login.profile': 'Profile',
    'login.logout': 'Logout',
    'login.logout_confirm': 'Are you sure you want to logout?',
    'login.level': 'Level',
    'login.coins': 'Coins',
    'login.follows': 'Following',
    'login.fans': 'Fans',
    'login.dynamic': 'Dynamic',

    // Search Card
    'search.placeholder': 'Search videos, anime, users...',
    'search.tab_video': 'Video',
    'search.tab_live': 'Live',
    'search.no_results': 'No results found',
    'search.searching': 'Searching...',

    // Settings Card
    'settings.title': 'Settings',
    'settings.appearance': 'Appearance',
    'settings.theme': 'App Theme',
    'settings.language': 'Language',
    'settings.about': 'About BiliCard',
    'settings.version': 'Version',
    'settings.desc': 'A lightweight, card-based desktop client for Bilibili. Enjoy a clutter-free viewing experience.',
    'settings.issues': 'Known Issues',
    'settings.issue_drag': 'Window dragging might feel different due to transparency.',
    'settings.issue_latency': 'Some live streams might have higher latency.',
    'settings.footer': 'Made with ❤️ by WEP56',

    // Video Player
    'player.loading': 'Loading...',
    'player.intro': 'Introduction',
    'player.related': 'Related',
    'player.comments': 'Comments',
    'player.follow': '+ Follow',
    'player.close': 'Close Player',
    'player.views': 'views',
    'player.danmaku': 'danmaku',

    // Common
    'common.updated': 'Updated',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.retry': 'Retry',
  }
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      lang: 'zh', // Default to Chinese
      serverUrl: 'https://api.bilibili.com',
      setLang: (lang) => set({ lang }),
      setServerUrl: (serverUrl) => set({ serverUrl }),
      t: (key) => {
        const lang = get().lang
        return translations[lang][key] || key
      }
    }),
    {
      name: 'settings-storage',
    }
  )
)

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserInfo {
  mid: number
  uname: string
  face: string
  level: number
  isLogin: boolean
}

interface UserState {
  userInfo: UserInfo | null
  cookie: string
  setUserInfo: (info: UserInfo) => void
  setCookie: (cookie: string) => void
  logout: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      userInfo: null,
      cookie: '',
      setUserInfo: (info) => set({ userInfo: info }),
      setCookie: (cookie) => set({ cookie }),
      logout: () => set({ userInfo: null, cookie: '' }),
    }),
    {
      name: 'user-storage',
    }
  )
)

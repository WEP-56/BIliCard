import md5 from 'md5'
import { useUserStore } from '../store/useUserStore'

const mixinKeyEncTab = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
  61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
  36, 20, 34, 44, 52
]

// 对 imgKey 和 subKey 进行字符顺序打乱编码
const getMixinKey = (orig: string) => {
  let temp = ''
  mixinKeyEncTab.forEach((n) => {
    temp += orig[n]
  })
  return temp.slice(0, 32)
}

// 获取最新的 img_key 和 sub_key
const getWbiKeys = async () => {
  let navData = null
  try {
      // Avoid circular dependency by fetching directly
      const cookie = useUserStore.getState().cookie
      const headers = cookie ? { 'X-Bili-Cookie': cookie } : {}
      const res = await fetch('https://api.bilibili.com/x/web-interface/nav', { headers })
      const data = await res.json()
      if (data.code === 0) {
          navData = data.data
      }
  } catch (e) {
      console.error('Failed to fetch nav info for WBI:', e)
  }

  if (!navData || !navData.wbi_img) {
      // Fallback keys if nav fails (might expire, but better than nothing)
      return {
          img_key: '7cd084941338484aae1ad9425b84077c',
          sub_key: '4932caff0ff746eab6f01bf08b70ac45'
      }
  }
  const { img_url, sub_url } = navData.wbi_img
  return {
    img_key: img_url.slice(
      img_url.lastIndexOf('/') + 1,
      img_url.lastIndexOf('.')
    ),
    sub_key: sub_url.slice(
      sub_url.lastIndexOf('/') + 1,
      sub_url.lastIndexOf('.')
    )
  }
}

export const encWbi = async (params: Record<string, string | number>, customKeys?: {img_key: string, sub_key: string}) => {
  const keys = customKeys || await getWbiKeys()
  const mixin_key = getMixinKey(keys.img_key + keys.sub_key)
  const curr_time = Math.round(Date.now() / 1000)
  
  const chr_filter = /[!'()*]/g
  const query: string[] = []
  
  // Add timestamp
  const newParams = { ...params, wts: curr_time } 
  
  // Sort keys
  Object.keys(newParams)
    .sort() 
    .forEach((key) => {
      query.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(
          // Filter characters
          newParams[key].toString().replace(chr_filter, '')
        )}`
      )
    })
    
  const query_str = query.join('&')
  const w_rid = md5(query_str + mixin_key)
  
  return query_str + '&w_rid=' + w_rid
}

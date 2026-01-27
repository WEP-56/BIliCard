// ...
          if (isRendererRequest || isImage || isVideo || isApi || isLive) {
              if (url.includes('passport.bilibili.com')) {
                  headers['Referer'] = 'https://passport.bilibili.com/login'
              } else if (url.includes('player.bilibili.com')) {
                  // 新增：Web Player 的 Referer 处理
                  headers['Referer'] = 'https://www.bilibili.com/'
              } else if (url.includes('search/type')) {
// ...
    // 修改：更健壮的 Cookie 设置逻辑
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
             const cookieDetails = {
                url: 'https://bilibili.com',
                domain: '.bilibili.com', // 强制设置为根域
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
                    await sess.cookies.set(cookieDetails)
                } catch (e) { 
                    console.error(`Cookie Set Error for ${name}:`, e) 
                }
            }
        }
    }
    console.log('Cookies synced to all sessions')
// ...
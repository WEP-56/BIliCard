// ...
            const url = new URL(res.data.url)
            const params = new URLSearchParams(url.search)
            let cookieString = ''
            
            // 遍历所有参数，确保不遗漏 DedeUserID__ckMd5 等关键字段
            params.forEach((value, key) => {
                cookieString += `${key}=${value}; `
            })
            
            setCookie(cookieString)
// ...
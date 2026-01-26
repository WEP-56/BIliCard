B 站 API 调用规范 + 数据模型参考

1️⃣ 视频相关 API
功能	请求类型	说明	参数示例
视频详情	GET	获取单个视频的详细信息	bvid / aid
播放 URL	GET	获取视频可播放地址（不同清晰度）	cid / quality
视频评论	GET	获取评论列表	bvid / pn / ps
视频动态	GET	获取视频动态（如投稿相关）	bvid / limit
2️⃣ 用户/UP 主相关 API
功能	请求类型	说明	参数示例
UP 主信息	GET	获取 UP 主基本信息	mid
投稿列表	GET	获取 UP 主的投稿视频列表	mid / pn / ps
关注列表	GET	获取 UP 主关注的人	mid / pn / ps
粉丝列表	GET	获取 UP 主粉丝	mid / pn / ps
3️⃣ 动态 / 话题 API
功能	请求类型	说明	参数示例
动态列表	GET	获取某用户的动态	mid / type / pn / ps
热门动态	GET	获取全站热门动态	limit / offset
动态详情	GET	获取动态的评论和互动信息	dynamic_id
4️⃣ 搜索 API
功能	请求类型	说明	参数示例
视频搜索	GET	搜索视频内容	keyword / pn / ps / order
用户搜索	GET	搜索 UP 主	keyword / pn / ps
综合搜索	GET	多类型混合搜索	keyword / pn / ps / type
5️⃣ 播放列表 / 收藏夹 API
功能	请求类型	说明	参数示例
收藏夹列表	GET	获取用户收藏夹	mid
收藏夹内容	GET	获取收藏夹内视频	fid / pn / ps
历史播放	GET	获取用户观看历史	mid / pn / ps
6️⃣ 评论 / 弹幕 API
功能	请求类型	说明	参数示例
弹幕列表	GET	获取视频弹幕	cid / segment_index
评论发送	POST	发送评论	oid / type / message
评论点赞	POST	点赞评论	rpid / action
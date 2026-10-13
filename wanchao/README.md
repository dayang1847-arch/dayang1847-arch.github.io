# DC Web · 万朝逐鹿

跨朝代网页实时策略游戏，已作为 DC Web 的独立项目发布。

- [中文游戏](https://dayang1847-arch.github.io/wanchao/?lang=zh)
- [English game](https://dayang1847-arch.github.io/wanchao/?lang=en)
- [返回个人网站](https://dayang1847-arch.github.io/)

选择秦、汉、唐、宋、元或明，发展主城、征募编队、攻占城池并争夺洛阳王都。地图采用真实亚洲轮廓，包含 500 个实地城池名称与港口航线。历史人物、地域疆界与能力采用游戏化设计。

点击「进入练兵」即可与 1–3 位 AI 对战，无需账号、安装或服务器。拖动平移地图，滚轮缩放，Shift 框选，右键下令；手机支持单指平移与双指缩放。设置集中提供主题、地图操作、缩放速度和减少动画，偏好保存在当前浏览器。

GitHub Pages 托管静态网页。2–4 人朋友联机需要另外部署的 HTTPS / WebSocket 房间服务；在「设置 → 联机高级设置」填写服务地址后即可开房或加入。本次发布未配置公开房间服务。请勿将 GitHub Pages 网站地址作为房间服务地址。

地图数据来自 Natural Earth 公共领域资料，详细出处见 [地图资料说明](assets/map-sources.md)。封面由内置 imagegen 生成，完整提示词见 [封面提示词](assets/cover-art-prompt.txt)。

本目录只发布前端运行资源和来源说明，无构建步骤、API key、环境变量或 npm 依赖；完整开发版的本地服务器、Cloudflare Worker、自动测试及本机预览资料不放入静态发布目录。

## English

Clash of Dynasties is a browser real-time strategy game with six Chinese dynasty factions, an Asia map, 500 real place names, and port routes. Build your citadel, recruit squads, capture cities, and contest the capital. Historical abilities and territory divisions are gameplay interpretations.

**Enter practice** starts a local battle against 1–3 AI opponents without an account or backend. Pan, zoom, select troops, and issue orders from the map. Settings support light/dark themes, map controls, zoom speed, and reduced motion.

The GitHub Pages release is static. Friend multiplayer needs an independently deployed HTTPS/WebSocket room server, configured under **Settings → Advanced multiplayer settings**. No public room service is configured in this release. Do not use the GitHub Pages URL as the room-server address.

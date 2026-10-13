# DC Web

本作品集提供两个项目入口：

- [LumiPilot 照明研发决策工作台](./LumiPilot/)：公开浏览照明研发、工程知识与已保存分析。
- [TOSPO Outdoor Lighting · 户外照明展示](https://tospo-outdoor-lighting.dayang0509.chatgpt.site/)：公司介绍、户外产品与工程案例；需使用已授权邮箱登录访问。

作品集使用 GitHub Pages 静态托管。LumiPilot 公开页保留已有资料与结果，支持浏览和检索；资料更新通过重新发布快照完成。完整服务的登录、编辑、上传和外部来源刷新需要后端。

TOSPO 在作品集中展示项目简介和网站链接，访问权限由独立网站验证。产品资料由受限网站提供。

发布内容不包含运行数据库、上传原件或账号与接口凭据。

## 首页维护

网站名称与浏览器标题统一为 DC Web，首页以项目作品为主。Dayang.Cao 的身份和英文个人介绍放在页面最底部的“About Dayang”内，点击展开；获奖记录置于其“A few milestones”折叠详情内，默认收起。个人介绍在中文和英文界面中都保持英文。作品入口及发布统计来自现有项目和 LumiPilot 数据快照。

- `index.html`：首页结构；`styles.css`：首页样式；`main.js`：中英文字典、主题与语言切换、发布数据统计。
- `assets/icons/sun.svg`、`moon.svg`：官方 Phosphor Light 图标；MIT 许可在 `assets/icons/LICENSE`。
- 本地预览：`python3 -m http.server 4173 --bind 127.0.0.1`，打开 http://localhost:4173/ 。
- 只更新首页时，上传 `homepage-update.zip` 内的文件，保持 `assets/icons` 目录结构。现有 LumiPilot 和 TOSPO 目录由原仓库保留。ZIP 本身不会被 GitHub Pages 自动解压。
- `.preview/live-backup` 保留此前本地首页；`.preview/current-live` 是本次修改采用的发布源码快照。预览文件不提交到仓库。

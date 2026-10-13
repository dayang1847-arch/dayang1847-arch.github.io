# DC Web

本作品集提供三个项目入口：

- [LumiPilot 照明研发决策工作台](./LumiPilot/)：公开浏览照明研发、工程知识与已保存分析。
- [LUMINA 照明场景演示与 IES 分析](./LUMINA/)：体验三维场景、排布、IES 配光和模拟控制，可下载完整本地版。
- [TOSPO Outdoor Lighting · 户外照明展示](https://dayang1847-arch.github.io/TP-outdoor-lighting/)：公司介绍、户外产品与工程案例；需使用网站账号和密码登录访问。

作品集使用 GitHub Pages 静态托管。LumiPilot 公开页保留已有资料与结果，支持浏览和检索；资料更新通过重新发布快照完成。完整服务的登录、编辑、上传和外部来源刷新需要后端。

TOSPO 在作品集中展示项目简介和登录入口。点击 TOSPO 项目后会前往独立网站，用网站账号和密码登录；产品资料在登录后查看。

发布内容不包含运行数据库、上传原件或账号与接口凭据。

## 首页维护

网站名称与浏览器标题统一为 DC Web，首页以项目作品为主。Dayang.Cao 的身份和英文个人介绍放在页面最底部的“About Dayang”内，点击展开；获奖记录置于其“A few milestones”折叠详情内，默认收起。个人介绍在中文和英文界面中都保持英文。作品入口及发布统计来自现有项目和 LumiPilot 数据快照。

- `index.html`：首页结构；`styles.css`：首页样式；`main.js`：中英文字典、主题与语言切换、发布数据统计。
- `assets/icons/sun.svg`、`moon.svg`：官方 Phosphor Light 图标；MIT 许可在 `assets/icons/LICENSE`。
- 本地预览：`python3 -m http.server 4173 --bind 127.0.0.1`，打开 http://localhost:4173/ 。
- 只更新首页时，上传 `homepage-update.zip` 内的文件，保持 `assets/icons` 目录结构。现有 LumiPilot 和 TOSPO 目录由原仓库保留。ZIP 本身不会被 GitHub Pages 自动解压。
- `.preview/live-backup` 保留此前本地首页；`.preview/current-live` 是本次修改采用的发布源码快照。预览文件不提交到仓库。

## LUMINA 发布

`LUMINA/` 为无需后端的在线演示，使用内置样品与浏览器保存。`LUMINA/source/` 保留完整应用源码，`LUMINA/LUMINA-local.zip` 为同一源码的下载包；本地版包含 Node 服务、STEP / IGES 转换、文件库和设备适配接口。在线版不连接实体设备、不上传访问者数据。

更新演示时，在源码目录运行 `npm ci`、`npm run check`、`npm test`、`npm run build:public`，将 `dist-public/` 复制到 `LUMINA/`，保留预览图、源码及 ZIP。所有资源使用相对路径，分析 Worker 可在 GitHub Pages 子目录中运行。发布时仅包含源码与演示资源，排除 `data/`、依赖目录和本机调试资料。

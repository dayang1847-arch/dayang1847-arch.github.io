# DC Web

本作品集提供四个项目入口：

- [LumiPilot 照明研发决策工作台](./LumiPilot/)：公开浏览照明研发、工程知识与已保存分析。
- [LUMINA 照明场景演示与 IES 分析](./LUMINA/)：体验三维场景、排布、IES 配光和模拟控制，仅供在线演示。
- [TOSPO Outdoor Lighting · 户外照明展示](https://dayang1847-arch.github.io/TP-outdoor-lighting/)：公司介绍、户外产品与工程案例；需使用网站账号和密码登录访问。
- [越语冒险 · 越南语闯关学习](./vietnamese-learning/)：个人学习项目，包含 14 单元、42 课、420 道互动题与 96 个日常词条；提供发音拆解、音标、词源说明和间隔复习。

作品集使用 GitHub Pages 静态托管。LumiPilot 公开页保留已有资料与结果，支持浏览和检索；资料更新通过重新发布快照完成。完整服务的登录、编辑、上传和外部来源刷新需要后端。

TOSPO 在作品集中展示项目简介和登录入口。点击 TOSPO 项目后会前往独立网站，用网站账号和密码登录；产品资料在登录后查看。

发布内容不包含运行数据库、上传原件或账号与接口凭据。

越语冒险是无需后端的手机优先网页，学习进度保存在访问者的浏览器，可通过支持 PWA 的手机浏览器添加到主屏幕。课程资源在首次访问后缓存；大部分发音使用设备提供的越南语语音，真人录音及外部词源来源链接需要网络。`vietnamese-learning/` 只包含运行网页所需的课程和界面文件。

## 首页维护

网站名称与浏览器标题统一为 DC Web，首页以项目作品为主。Dayang.Cao 的身份和英文个人介绍放在页面最底部的“About Dayang”内，点击展开；获奖记录置于其“A few milestones”折叠详情内，默认收起。个人介绍在中文和英文界面中都保持英文。作品入口及发布统计来自现有项目和 LumiPilot 数据快照。

- `index.html`：首页结构；`styles.css`：首页样式；`main.js`：中英文字典、主题与语言切换、发布数据统计。
- `assets/icons/sun.svg`、`moon.svg`：官方 Phosphor Light 图标；MIT 许可在 `assets/icons/LICENSE`。
- 本地预览：`python3 -m http.server 4173 --bind 127.0.0.1`，打开 http://localhost:4173/ 。
- 只更新首页时，上传 `homepage-update.zip` 内的文件，保持 `assets/icons` 目录结构。现有 LumiPilot 和 TOSPO 目录由原仓库保留。ZIP 本身不会被 GitHub Pages 自动解压。
- `.preview/live-backup` 保留此前本地首页；`.preview/current-live` 是本次修改采用的发布源码快照。预览文件不提交到仓库。

## LUMINA 发布

`LUMINA/` 为仅供交互演示的静态网页，使用内置样品与浏览器保存，不连接实体设备、不上传访问者数据。支持产品模型与 IES 导入、浏览器内 CAD 转换、报告导出和含资产的方案打包。不提供应用安装包或完整源码包。

更新演示时，在本机应用目录运行 `npm run check`、`npm test`、`npm run build:public`，将 `dist-public/` 的运行资源复制到 `LUMINA/`，保留预览图、许可和发布说明。删除旧的构建资源以免保留过期功能。所有资源使用相对路径，分析 Worker 可在 GitHub Pages 子目录中运行。仅发布在线演示运行文件，排除完整应用源码、安装包、`data/`、依赖目录和本机调试资料。

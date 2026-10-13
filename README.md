# DC Web

本作品集提供五个项目入口：

- [LumiPilot 照明研发决策工作台](./LumiPilot/)：公开浏览照明研发、工程知识与已保存分析。
- [LUMINA 照明场景演示与 IES 分析](./LUMINA/)：体验三维场景、排布、IES 配光和模拟控制，仅供在线演示。
- [TOSPO Outdoor Lighting · 户外照明展示](https://dayang1847-arch.github.io/TP-outdoor-lighting/)：公司介绍、户外产品与工程案例；需使用网站账号和密码登录访问。
- [越语冒险 · 越南语闯关学习](./vietnamese-learning/)：个人学习项目，包含 14 单元、42 课、420 道互动题与 96 个日常词条；提供发音拆解、音标、词源说明和间隔复习。

- [万朝逐鹿 · 跨朝代实时战略](./wanchao/)：秦、汉、唐、宋、元、明六朝阵营，500 座真实地名城池；单人练兵立即可用，朋友联机需另行部署并配置服务器。

作品集使用 GitHub Pages 静态托管。LumiPilot 公开页保留已有资料与结果，支持浏览和检索；资料更新通过重新发布快照完成。完整服务的登录、编辑、上传和外部来源刷新需要后端。

TOSPO 在作品集中展示项目简介和登录入口。点击 TOSPO 项目后会前往独立网站，用网站账号和密码登录；产品资料在登录后查看。

发布内容不包含运行数据库、上传原件或账号与接口凭据。

越语冒险是无需后端的手机优先网页，学习进度保存在访问者的浏览器，可通过支持 PWA 的手机浏览器添加到主屏幕。课程资源在首次访问后缓存；大部分发音使用设备提供的越南语语音，真人录音及外部词源来源链接需要网络。`vietnamese-learning/` 只包含运行网页所需的课程和界面文件。

## 首页维护

网站名称与浏览器标题统一为 DC Web，首页以项目作品为主。Dayang.Cao 的身份和英文个人介绍放在页面最底部的“About Dayang”内，点击展开；获奖记录置于其“A few milestones”折叠详情内，默认收起。个人介绍在中文和英文界面中都保持英文。作品入口及发布统计来自现有项目和 LumiPilot 数据快照。

- `index.html`：项目卡片与页面结构；`styles.css`：响应式网格和首页样式；`main.js`：中英文字典、分类搜索、主题与语言切换、按需加载的发布统计。
- 卡片在电脑端显示三列、平板端两列、手机端一列。分类、关键词搜索和数量由现有卡片自动计算；项目详情默认收起。手机端使用小缩略图、标题、访问状态与操作按钮；搜索通过按钮展开，详细介绍与访问说明在详情内。
- 增加项目时沿用 `.project-card`，填写唯一 ID、`data-category` 和 `data-keywords`，在两套字典中补齐内容与图片说明。增加分类时同步添加 `data-filter` 按钮。
- `assets/lumipilot-preview.webp` 来自实际工作台截图；`assets/lumina-preview.webp` 来自已发布项目预览。TOSPO 使用品牌与内容主题排版。
- `assets/icons/search.svg` 来自项目已有 Lucide 库，ISC 许可保存在 `assets/icons/lucide-LICENSE`。
- `assets/icons/sun.svg`、`moon.svg`：官方 Phosphor Light 图标；MIT 许可在 `assets/icons/LICENSE`。
- 本地预览：`python3 -m http.server 4173 --bind 127.0.0.1`，打开 http://localhost:4173/ 。
- 只更新首页时发布 `index.html`、`styles.css`、`main.js` 和新增的 `assets` 文件，保持目录结构。现有 LumiPilot、TP-outdoor-lighting、LUMINA 和 vietnamese-learning 项目目录由原仓库保留，游戏运行资源位于 `wanchao/`。
- `.preview/live-backup` 保留此前本地首页；`.preview/current-live` 是本次修改采用的发布源码快照。预览文件不提交到仓库。

## LUMINA 发布

`LUMINA/` 为仅供交互演示的静态网页，使用内置样品与浏览器保存，不连接实体设备、不上传访问者数据。支持产品模型与 IES 导入、浏览器内 CAD 转换、报告导出和含资产的方案打包。不提供应用安装包或完整源码包。

更新演示时，在本机应用目录运行 `npm run check`、`npm test`、`npm run build:public`，将 `dist-public/` 的运行资源复制到 `LUMINA/`，保留预览图、许可和发布说明。删除旧的构建资源以免保留过期功能。所有资源使用相对路径，分析 Worker 可在 GitHub Pages 子目录中运行。仅发布在线演示运行文件，排除完整应用源码、安装包、`data/`、依赖目录和本机调试资料。

## 万朝逐鹿发布

`wanchao/` 提供无需安装或构建的静态游戏页面。GitHub Pages 可以直接运行浏览器内的单人练兵，并展示完整地图、六朝阵营与玩法说明；GitHub Pages 本身不提供联机房间或实时通信服务。朋友联机需要另行部署游戏服务器，并在游戏的“设置 → 联机高级设置”中配置服务地址，不代表本作品集已提供公开联机服务器。

首页第五张项目卡片使用 `./wanchao/assets/wanchao-epic-cover-v1.png` 相对路径并延迟加载封面。策略分类、搜索与项目数量沿用现有逻辑；进入游戏时保留首页语言，链接为 `./wanchao/?lang=zh` 或 `./wanchao/?lang=en`。发布时保留 `wanchao/` 及其相对资源目录，同时保留仓库根目录的 `.nojekyll`。

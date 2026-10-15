# DC Web

本作品集提供七个项目入口：

- [LumiPilot 照明研发决策工作台](./LumiPilot/)：公开浏览照明研发、工程知识与已保存分析。
- [LUMINA 照明场景演示与 IES 分析](./LUMINA/)：体验三维场景、排布、IES 配光和模拟控制，仅供在线演示。
- [TOSPO Outdoor Lighting · 户外照明展示](https://dayang1847-arch.github.io/TP-outdoor-lighting/)：公司介绍、户外产品与工程案例；需使用网站账号和密码登录访问。
- [越语冒险 · 越南语闯关学习](./vietnamese-learning/)：个人学习项目，包含 14 单元、42 课、420 道互动题与 96 个日常词条；提供发音拆解、音标、词源说明和间隔复习。

- [万朝逐鹿 · 跨朝代实时战略](./wanchao/)：秦、汉、唐、宋、元、明六朝阵营，500 座真实地名城池；单人练兵立即可用，朋友联机需另行部署并配置服务器。
- [照明市场工作台 · Lighting Market Console](./market-console/)：可在线操作样例采集、CSV 导入、浏览器内规格计算、同市场商品对比、问卷与规则推品建议，并导出 CSV / Markdown。
- [PDF 转 CAD · 图纸工坊](./pdf-to-cad/?lang=zh)：在浏览器内将矢量或扫描 PDF 转成 DWG / DXF，支持 PDF / RAR / ZIP 导入、比例设置与按格式批量下载；图纸不上传，不展示历史记录。

作品集使用 GitHub Pages 静态托管。LumiPilot 公开页保留已有资料与结果，支持浏览和检索；资料更新通过重新发布快照完成。完整服务的登录、编辑、上传和外部来源刷新需要后端。

TOSPO 在作品集中展示项目简介和登录入口。点击 TOSPO 项目先进入带返回按钮的项目入口，再在新标签页打开独立网站账号登录页；产品资料在登录后查看。

照明市场工作台的公开交互演示位于 `market-console/`，无需安装、账号或接口密钥。演示使用明确标注的样例数据，也支持导入 CSV 并在当前浏览器内计算规格、筛选和对比；问卷生成可解释的规则建议与外观提示词，结果可导出 CSV / Markdown。实时采集和 DeepSeek 调用由本机或服务器上的完整 Python 工作台提供，公开演示不调用这些服务。

发布内容不包含运行数据库、上传原件或账号与接口凭据。

越语冒险是无需后端的手机优先网页，学习进度保存在访问者的浏览器，可通过支持 PWA 的手机浏览器添加到主屏幕。课程资源在首次访问后缓存；大部分发音使用设备提供的越南语语音，真人录音及外部词源来源链接需要网络。`vietnamese-learning/` 只包含运行网页所需的课程和界面文件。

## 首页使用说明

项目列表之后仅保留统一的“DC Web 使用说明书”，默认收起。说明书覆盖整站浏览方法、七个项目的使用与访问方式、浏览器记录和资料范围。页头“使用说明”和页脚“整站使用说明”均定位并展开该说明书；不再设置单一项目的底部快捷入口。

## 首页维护

网站名称与浏览器标题统一为 DC Web，首页以项目作品为主。Dayang.Cao 的身份和英文个人介绍放在页面最底部的“About Dayang”内，点击展开；获奖记录置于其“A few milestones”折叠详情内，默认收起。个人介绍在中文和英文界面中都保持英文。作品入口及发布统计来自现有项目和 LumiPilot 数据快照。

- `index.html`：项目卡片与页面结构；`styles.css`：响应式网格和首页样式；`main.js`：中英文字典、分类搜索、主题与语言切换、按需加载的发布统计。
- 卡片在电脑端显示三列、平板端两列、手机端一列。分类、关键词搜索和数量由现有卡片自动计算；项目详情默认收起。手机端使用小缩略图、标题、访问状态与操作按钮；搜索通过按钮展开，详细介绍与访问说明在详情内。
- 增加项目时沿用 `.project-card`，填写唯一 ID、`data-category` 和 `data-keywords`，在两套字典中补齐内容与图片说明。增加分类时同步添加 `data-filter` 按钮。
- 照明市场工作台卡片使用 `#market-console`，分类为“市场分析 / Market research”，演示入口为 `./market-console/?lang=zh` 或 `./market-console/?lang=en`，随首页语言切换。维护演示时同步更新 `market-console/` 的页面、计算逻辑、样例和测试；Python 后端、业务数据库、采集输出与 API 凭据保留在独立运行环境，不随 GitHub Pages 发布。
- 图纸工坊卡片使用 `#pdf-cad`，归入“研发工具 / R&D tools”，入口为 `./pdf-to-cad/?lang=zh` 或 `./pdf-to-cad/?lang=en`，随首页语言切换。`assets/pdf-cad-preview.svg` 是原创合成蓝图，未使用真实业务图纸或转换记录。
- `assets/lumipilot-preview.webp` 来自实际工作台截图；`assets/lumina-preview.webp` 来自已发布项目预览。TOSPO 使用品牌与内容主题排版。
- `assets/icons/search.svg` 来自项目已有 Lucide 库，ISC 许可保存在 `assets/icons/lucide-LICENSE`。
- `assets/icons/sun.svg`、`moon.svg`：官方 Phosphor Light 图标；MIT 许可在 `assets/icons/LICENSE`。
- 本地预览：`python3 -m http.server 4173 --bind 127.0.0.1`，打开 http://localhost:4173/ 。
- 只更新首页时发布 `index.html`、`styles.css`、`main.js` 和新增的 `assets` 文件，保持目录结构。现有 LumiPilot、TP-outdoor-lighting、LUMINA 和 vietnamese-learning 项目目录由原仓库保留，游戏运行资源位于 `wanchao/`，照明市场工作台演示位于 `market-console/`，图纸工坊位于 `pdf-to-cad/`。
- `.preview/live-backup` 保留此前本地首页；`.preview/current-live` 是本次修改采用的发布源码快照。预览文件不提交到仓库。

## PDF 转 CAD · 图纸工坊发布

`pdf-to-cad/` 是由 GitHub Pages 静态托管的中英文浏览器应用，使用浏览器内的转换引擎，无需转换服务器。支持导入矢量或扫描 PDF，以及包含 PDF 的 RAR / ZIP；选择转换模式、设置比例后输出 DWG / DXF，可逐页或按格式批量打包下载。

图纸与转换结果仅在当前浏览器会话内处理，不上传、不展示历史记录，刷新后清空任务。扫描件转换为可编辑轮廓，文字与工程尺寸需要人工校正；应用前应复核转换比例与几何尺寸。公开发布只包含运行网页、转换引擎和必要许可，不包含个人图纸、旧转换任务、结果文件或本机运行日志。首次使用需加载转换引擎。

发布时复制完整 `pdf-to-cad/` 目录及根目录首页与合成封面资源，保留 `.nojekyll`。检查中英文入口、PDF / 压缩包导入、矢量与扫描转换、比例设置、逐页及按格式打包下载、刷新清空任务，并确认所有相对资源路径在项目子目录中可用。

## 照明市场工作台发布

`market-console/` 是可直接由 GitHub Pages 托管的中英文浏览器应用，使用相对资源路径，无需构建步骤。样例采集仅演示任务配置、进度、暂停与继续；导入 CSV 后的筛选、规格计算、同市场同币种比较和规则建议在浏览器内执行，导入内容不上传。导出文件来自当前数据与选择，不代表实时市场统计或已验证的产品方案。

维护时保留样例标记、未知字段与客户基线缺失提示，避免将样例或缺失值当成真实经营数据。公开版本不设置 API Key 输入，也不携带私有数据库、采集原件、运行日志或完整服务的配置。发布时复制完整 `market-console/` 目录，并保留根目录的 `.nojekyll`。

校验首页脚本：`node --check main.js`。运行计算引擎测试：`node --test market-console/tests/engine.test.cjs`。通过根目录静态服务访问 `/market-console/?lang=zh` 和 `/market-console/?lang=en`，检查样例采集与暂停恢复、CSV 导入、空结果、规格与价格口径、问卷和导出，以及手机布局、主题切换与资源 HTTP 200。

## LUMINA 发布

`LUMINA/` 为仅供交互演示的静态网页，使用内置样品与浏览器保存，不连接实体设备、不上传访问者数据。支持产品模型与 IES 导入、浏览器内 CAD 转换、报告导出和含资产的方案打包。不提供应用安装包或完整源码包。

更新演示时，在本机应用目录运行 `npm run check`、`npm test`、`npm run build:public`，将 `dist-public/` 的运行资源复制到 `LUMINA/`，保留预览图、许可和发布说明。删除旧的构建资源以免保留过期功能。所有资源使用相对路径，分析 Worker 可在 GitHub Pages 子目录中运行。仅发布在线演示运行文件，排除完整应用源码、安装包、`data/`、依赖目录和本机调试资料。

## 万朝逐鹿发布

`wanchao/` 提供无需安装或构建的静态游戏页面。GitHub Pages 可以直接运行浏览器内的单人练兵，并展示完整地图、六朝阵营与玩法说明；GitHub Pages 本身不提供联机房间或实时通信服务。朋友联机需要另行部署游戏服务器，并在游戏的“设置 → 联机高级设置”中配置服务地址，不代表本作品集已提供公开联机服务器。

首页第六张项目卡片使用 `./wanchao/assets/wanchao-epic-cover-v1.png` 相对路径并延迟加载封面。策略分类、搜索与项目数量沿用现有逻辑；进入游戏时保留首页语言，链接为 `./wanchao/?lang=zh` 或 `./wanchao/?lang=en`。发布时保留 `wanchao/` 及其相对资源目录，同时保留仓库根目录的 `.nojekyll`。

## 项目返回导航

七个项目的页头均提供“返回上一页 / Go back”。同标签页已有可返回记录时调用浏览器返回；直接打开或新标签页没有上一页时，返回带当前界面语言的 DC Web 作品列表。修饰键与鼠标中键仍可正常打开作品列表。TOSPO 通过本地项目入口保留返回按钮，独立账号登录页在新标签页打开。

共享样式和脚本位于 `assets/project-navigation.css`、`assets/project-navigation.js`，各项目使用相对路径引用。越语冒险的离线缓存也包含这两个文件。更新共享文件版本时，同步更新各页引用和 `vietnamese-learning/service-worker.js` 的缓存版本与资源列表。

重新发布 LUMINA 构建产物时，保留其 `index.html` 中位于 React 根节点外的 `.dc-project-navigation`、`body.dc-viewport-project` 及共享文件引用；这些元素为返回按钮留出独立空间，不需要修改构建后的脚本。

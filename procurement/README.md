# 采衡采购协同工作台

采购业务交互 Demo，全部供应商、物料、项目、价格、证书与行情为虚构数据。演示页面展示采购总览、物料选型、需求聚合、成本情景、询报价、供应商管理和任务结果回填。

打开页面右上角的“演示指南”，按五步完成选型、报价比较、需求归并、成本测算与议价回填。演示为中文界面，记录只保存在当前浏览器，支持重置与 CSV 导出。

连接设置提供需自行配置与实测的本机 IMAP 只读邮箱和 DeepSeek API 后台；OA、ERP、企业微信、实时行情及工商接口未接入。报价导入支持 `sample-quotes.csv` 所示的标准 CSV；关键词匹配不等于完整语义理解。模拟研发确认不代表真实技术批准，目标收益不等于已实现降本。

页面为原生 HTML、CSS、JavaScript，演示页面无构建步骤和预置密钥；可选本机 Python 后台用于邮箱和 DeepSeek。根站点由 GitHub Pages 发布，页面内可返回 DC Web 作品集。

## 访问入口

- [采购工作台演示](https://dayang1847-arch.github.io/procurement/)
- [DC Web 作品集](https://dayang1847-arch.github.io/#procurement)

GitHub Pages 直接发布仓库 main 分支根目录。此目录不包含真实采购资料、原始需求文档、接口凭据或账号数据。

## 本机连接后台

在线连接设置可下载 `local-service.zip`，Mac 双击“启动采购后台.command”，打开 http://127.0.0.1:8923/?view=settings 。授权码和 API Key 只保存在本机用户目录，不返回到前端或写入 GitHub。支持 IMAP 只读邮件、EML 导入和经确认的 DeepSeek 文本提取；无 SMTP 外发、自动采购或自动审批。详见“本地后台使用说明.md”。

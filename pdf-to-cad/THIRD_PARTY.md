# 第三方组件、源码与授权

本项目复用已有开源 PDF、轮廓追踪和 CAD 引擎。第三方代码没有被重新声明为本项目所有；各组件保留其原始版权及许可。应用自有源码见 [公开仓库](https://github.com/dayang1847-arch/dayang1847-arch.github.io/tree/main/pdf-to-cad)，适用 AGPL-3.0-or-later。Rust 桥接模块单独适用 MPL-2.0。

## 已分发组件

| 组件 | 版本与作用 | 上游源码 | 许可正文 |
| --- | --- | --- | --- |
| MuPDF / Artifex Software | 1.28.1；PDF 解析、页面渲染、路径及文字读取 | [对应 NPM gitHead 的完整源码](https://github.com/ArtifexSoftware/mupdf/tree/20061bd45183f5a2bff8f43675e4da91e5ac2901)，JavaScript / WASM 入口位于 `platform/wasm/` | [AGPL-3.0-or-later](licenses/MuPDF-AGPL-3.0.txt) |
| esm-potrace-wasm / Thomas Steiner，Potrace / Peter Selinger | 0.5.1；在浏览器中把黑白位图追踪为 SVG | [0.5.1 对应完整源码](https://github.com/tomayac/esm-potrace-wasm/tree/6e09291c5808435830a8d1c519057fd6bfcc2050) | [GPLv2 正文](licenses/Potrace-GPL-2.0.txt)、[wrapper 明确的 GPL-2.0-or-later 授权](licenses/Potrace-wrapper-notice.txt)、[原版 Potrace 1.16 README](licenses/Potrace-core-README.txt) |
| acadrust / Hakan AK | 0.5.5；读取 DXF、写入原生二进制 DWG、读取 DWG 验证 | [v0.5.5 源码](https://github.com/hakanaktt/acadrust/tree/v0.5.5)，作为未修改的 Cargo 依赖使用 | [MPL-2.0](vendor/cad/LICENSE-acadrust.txt) |
| 本项目 CAD WASM 桥接模块 | 0.1.0；`dxf_to_dwg` / `inspect_dwg` | [完整 Rust 源码与 Cargo.lock](wasm-engine/) | [MPL-2.0](wasm-engine/LICENSE) |
| @tarikjabiri/dxf / EL JABIRI Tarik | 2.9.0；写入 DXF | [版本对应源码](https://github.com/dxfjs/writer/tree/1c502c8e60c159d366443329e801cc2c38980d8c) | [MIT](licenses/DXF-writer-MIT.txt) |
| Paper.js / Jürg Lehni、Jonathan Puckey | 0.12.18；解析 Potrace 的 SVG path 数据 | [版本对应源码](https://github.com/paperjs/paper.js/tree/04aab80eaca972fa611431c4536f03d4fca16f8c) | [MIT](licenses/Paper-MIT.txt) |
| fflate / Arjun Barrett | 0.8.3；ZIP 解压和按格式打包下载 | [上游源码](https://github.com/101arrowz/fflate)、[精确发布包](https://registry.npmjs.org/fflate/-/fflate-0.8.3.tgz) | [MIT](licenses/fflate-MIT.txt) |
| node-unrar-js / Jianrong Yu | 2.0.2；RAR 读取接口和 WASM 运行胶水 | [版本对应源码](https://github.com/YuJianrong/node-unrar.js/tree/b8a26b187d03a33506af778fa8c8e0adc60b7755) | [wrapper MIT](licenses/Unrar-MIT.txt)；底层许可见下文 |
| UnRAR / Alexander Roshal | node-unrar-js 使用的 UnRAR 解压库；上游构建脚本下载 6.1.7 | [官方 6.1.7 源码包](https://www.rarlab.com/rar/unrarsrc-6.1.7.tar.gz) | [源码使用与分发条款](licenses/Unrar-source-license.txt)、[上游 DLL 文档许可](licenses/Unrar-upstream-license.txt) |

WASM Rust 依赖的版本和源码见 [Cargo.lock](wasm-engine/Cargo.lock)、[依赖列表](vendor/cad/NOTICE.md) 及 [完整依赖许可证文本](vendor/cad/THIRD-PARTY-LICENSES.txt)。`wasm-bindgen` 使用 MIT / Apache-2.0；构建工具 esbuild 0.28.2 使用 MIT，不作为转换服务器运行。

## Potrace 的版本选择依据

NPM `esm-potrace-wasm@0.5.1` 的 `gitHead` 是 `6e09291c5808435830a8d1c519057fd6bfcc2050`。该提交的 [src/potrace.js](https://github.com/tomayac/esm-potrace-wasm/blob/6e09291c5808435830a8d1c519057fd6bfcc2050/src/potrace.js) 明确允许 GPL 第 2 版或任何更新版本，并带 `SPDX-License-Identifier: GPL-2.0-or-later`。这项依据来自实际源码中的授权，而不是 GPL 模板末尾的示例文字。

Potrace 官方 1.16 源码包的 README 版权段也明确允许第 2 版或任何更新版本。本目录保留了该 README、[COPYING](licenses/Potrace-core-COPYING.txt) 和 wrapper 授权。组合发布时选择 GPL 第 3 版的条件；应用和 MuPDF 部分继续按 AGPL 第 3 版条件提供。保留原始 `GPL-2.0` NPM 元数据，并不删除或改写上游许可证。

## UnRAR 的独立条款

node-unrar-js 的 JavaScript / TypeScript wrapper 是 MIT。底层 UnRAR 源码允许免费在其他软件中读取 RAR，但禁止用它开发兼容 RAR 的压缩器或重新实现专有的 RAR 压缩算法；其完整条款在 [Unrar-source-license.txt](licenses/Unrar-source-license.txt)。本应用只解压用户提供的 RAR，不创建 RAR 压缩包。不能将整个 UnRAR WASM 一概归为 MIT 或 AGPL。

## 对应源码与重建

所有上游链接指向版权方仓库、固定提交或官方发布包；`package.json` 固定浏览器依赖版本，`Cargo.lock` 固定 Rust 依赖。应用自己的 Worker、界面、几何适配、测试和构建脚本以未压缩源码公开。没有私有转换接口或必须提供的密钥。

正常重建直接按 [README](README.md) 执行 `npm install`、`npm test`、`npm run build`；这会重新打包自己的 JavaScript，并复制未修改的上游发布版 WASM。重新编译自己的 CAD WASM 则使用 `wasm-engine/` 中的 Rust 源码和锁文件。

需要修改上游引擎时，取得上表对应源码，保留上游子模块与版权声明，并使用其仓库内的构建脚本：

- **MuPDF**：检出固定提交并初始化其递归子模块；在 `platform/wasm/` 安装开发依赖，按 `tools/build.sh` 构建。该脚本使用 Emscripten 4.0.8，并要求 `EMSDK` 指向 Emscripten SDK。脚本完整保留在上表固定提交中。发布版默认关闭 SVG handler，因此本应用使用 Paper 解析扫描 SVG path。
- **esm-potrace-wasm**：检出固定提交，安装 Emscripten 和开发依赖，执行上游 `npm run build`。`build.sh` 编译 `wasm/*.c`，使用 `src/potrace.js` 胶水并将 WASM 嵌入 ESM 发布文件。本应用未修改其算法源码。
- **acadrust**：通过本项目 `Cargo.lock` 下载 0.5.5，无需复制或修改其代码；`wasm-engine/` 中的构建命令生成公开的 `vendor/cad/pdf_cad_wasm_bg.wasm`。
- **node-unrar-js**：检出固定提交，其 `downloadUnrarSrc` 脚本指定官方 UnRAR 6.1.7 源码；按上游说明准备 Emscripten，运行源码下载脚本和 `npm run build:release`。分发底层源码时同时保留 UnRAR 条款。

上游引擎的独立重编译步骤在此列出以便修改源代码；本项目测试过应用构建和 CAD WASM 构建，没有在本次发布中重新编译 MuPDF、Potrace 或 UnRAR 上游二进制。

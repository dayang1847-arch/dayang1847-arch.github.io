# PDF → CAD 在线转换

[在线使用](https://dayang1847-arch.github.io/pdf-to-cad/) · [完整应用源码](https://github.com/dayang1847-arch/dayang1847-arch.github.io/tree/main/pdf-to-cad) · [第三方来源与许可](THIRD_PARTY.md)

在浏览器中将矢量 PDF 或扫描 PDF 转为可编辑 DXF，以及真正的二进制 DWG。DWG 输出版本为 AutoCAD 2013 / `AC1027`。页面可以直接部署在 GitHub Pages，无需转换服务器或本机 CAD 软件。

## 使用

1. 选择 PDF，或包含 PDF 的 ZIP / RAR 压缩包。
2. 选择自动、矢量或扫描模式。扫描模式可调 DPI 和黑白阈值。
3. 对需要工程尺寸的页面，在源图预览中选取一个已知尺寸的两端，再填写标注的毫米值。每页独立校准。
4. 开始转换，按页下载 DWG / DXF，或按格式下载全部结果。

输出按线分开：直线为独立 `LINE`，曲线为独立三次 `SPLINE`。矢量 PDF 能解码的文字保留为 `TEXT`。不将整页放进一个图块，也不把整条轮廓合成一个填充或闭合多段线。

### 零件外轮廓汇总：框选、校准、导出

1. 上传 PDF 后，在“零件轮廓汇总”工作区选择文件和页码。
2. 在源图上拖动框选单个零件的主视图，尽量避开尺寸数字、尺寸线、图框和其他视图。
3. 点击提取，检查生成的独立闭合外形。扫描图会先识别框内主体，再取外边界；内孔和内部结构线不进入外形。
4. 在提取后的轮廓上点选一个已知尺寸的两个端点，填写标注的毫米值并确认校准。每个型号单独校准，也可重新校准。
5. 为轮廓填写型号并勾选，汇总导出一个 DWG、DXF 或 PDF。未校准的轮廓无法导出。

汇总 CAD 采用毫米单位，按实际校准比例排列各型号，外形线段可分别编辑。PDF 使用横向 A4 网格、整批统一显示比例排版，可自动分页；不同型号保留实际相对大小，每项标明包络尺寸和显示比例。实际尺寸以标注和 CAD 为准。横向视图可在校准前后旋转 90°，保持几何尺寸和参考距离。

框选提取依赖原稿清晰度和外边界的闭合程度。轮廓与尺寸辅助线相连、边界缺失、选区含多个主体或切断产品时，可能需要重新框选并检查预览。提取不会用凸包代替零件的凹形和台阶。两点校准只验证所选参考距离；扫描畸变和其他尺寸仍需复核。

### 整页描线

“一键描轮廓”直接提取当前选择页面的图形边界。矢量模式会跳过原生 PDF 文字，只输出可分别编辑的直线和曲线；如果文字在原 PDF 中已经转成图形，这些字形仍会被视为路径保留。普通转换继续保留可解码的原生文字。

扫描模式使用 Potrace 追踪位图中的全部边界，其中也包括扫描文字和尺寸数字，无法自动只留下产品外形。粗线可能保留双边轮廓。描轮廓使用与普通转换相同的本页尺寸校准和冻结参考线；提取轮廓不会自动验证其他工程尺寸。

扫描图中的粗线通常会得到双边轮廓；本软件没有把扫描轮廓自动识别为工程中心线，也没有将扫描文字恢复为原生文字。原 PDF 的尺寸标注不会自动变为关联式 CAD `DIMENSION`。矢量文字使用 CAD 本机字体，需核对字符宽度和特殊符号。包含复杂裁剪、渐变或透明蒙版的 PDF 会给出相应提醒。

校准会生成冻结且锁定的 `CALIBRATION_REFERENCE` 图层，包含所选参考段。转换结果报告这条参考线的长度及误差。它只能验证这两个点之间的尺寸；扫描畸变、其他尺寸、字体和图纸比例仍需在 CAD 中核对。未校准的页面明确标记尺寸未验证。页面中的结果预览是源图参考，下载 CAD 后应检查实际图元。

## 文件与隐私

文件在本页的 Web Worker 内存中处理，不上传到转换服务器，不写入转换历史。刷新、关闭页面或清空工作区后，需要重新选择源文件。GitHub Pages 仅提供 HTML、JavaScript、字体及 WASM 等静态程序资源。

当前限制：每份 PDF 60 MiB；每批 50 份 PDF、100 页、总计 200 MiB；扫描渲染每页最多 3000 万像素；默认每页最多 25 万个独立图元。超限时降低 DPI 或分批处理。浏览器内存也会影响可处理的图纸复杂度。

## 本地运行与构建

使用带 WebAssembly、ES modules、Web Worker 和 OffscreenCanvas 支持的现代浏览器。开发环境建议 Node.js 22 或更新版本。

```sh
git clone https://github.com/dayang1847-arch/dayang1847-arch.github.io.git
cd dayang1847-arch.github.io/pdf-to-cad
npm install
npm test
npm run build
python3 -m http.server 8080
```

访问 `http://127.0.0.1:8080/`。不能直接双击 HTML 以 `file://` 打开，因为浏览器需要从 HTTP(S) 加载 Worker 和 WASM。

`npm run build` 使用已固定版本的 NPM 依赖，生成 `worker.js` 并复制 MuPDF、RAR 及 ZIP 运行资源。现成的 `vendor/cad/` 包含 DWG 引擎；修改 Rust 源码时按下一节重建。构建和测试不需要任何客户图纸或私有文件。

## 重建 DWG WASM

引擎源代码和锁定的 Rust 依赖位于 [wasm-engine/](wasm-engine/)。已发布产物使用 Rust 1.99.0、`wasm-bindgen` 0.2.129 和未修改的 acadrust 0.5.5 构建。

```sh
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.129 --locked
cargo test --manifest-path wasm-engine/Cargo.toml --locked
cargo build --manifest-path wasm-engine/Cargo.toml --locked --release --target wasm32-unknown-unknown
wasm-bindgen wasm-engine/target/wasm32-unknown-unknown/release/pdf_cad_wasm.wasm --target web --out-dir vendor/cad --out-name pdf_cad_wasm
node wasm-engine/smoke-test.mjs
npm test
npm run build
```

`dxf_to_dwg` 在内存中读取 DXF，并调用 acadrust 的 `DwgWriter::write_to_vec` 写入 DWG。`inspect_dwg` 再通过 DWG 读取器解析输出，核对版本、毫米单位和图元数量。该回读检查能发现错误或丢失图元，但不能代替在目标 CAD 软件中的兼容性检查。

## 测试

`npm test` 执行 `tests/` 中的几何、零件轮廓、校准状态、汇总 PDF 和完整 Worker 流程测试，使用完全合成的 PDF / SVG / 位图，验证：

- 矩形的四条独立直线、圆环内外边界的八段独立曲线，以及填充 / 描边去重。
- SVG 像素到纸面毫米的换算、Potrace 翻转矩阵和 PDF 的 0° / 90° 页面旋转。
- 可编辑文字、160 mm 校准参考线、冻结 / 锁定图层和错误比例拒绝。
- 一键描轮廓跳过填充及描边原生文字，同时保留独立图元、尺寸校准和扫描文字限制提醒。
- 真 DWG 签名、DWG 解析回读、图元数量、单位以及不合法输入和复杂度限制。
- 单一外边界、内部线和孔排除、台阶保留、选区错误拒绝及合并 CAD 不改变各型号比例。
- 每个轮廓独立两点校准、重新校准和旋转；未校准项目禁止汇总导出，删除和清空后无法恢复。
- 中文矢量 PDF、整批和跨页统一比例、实际 Worker 提取到 DWG / DXF / PDF 导出全流程。

MuPDF 的图形矩阵采用浮点数；几何测试使用 0.00001 mm 数值容差。这是合成数据的计算检查，不能推导为扫描图纸的实际精度。

## 源码与许可

本项目自有应用源码以 **GNU AGPL-3.0-or-later** 发布，见 [LICENSE](LICENSE)。在线版本的完整应用源码、构建脚本和测试可从上方公开仓库获取。修改或再部署时保留源码入口和适用的许可证声明。

第三方组件保留各自许可证；Rust CAD 桥接模块以 MPL-2.0 发布。Potrace 源码明确允许 GPL-2.0-or-later，本应用组合使用其 GPLv3 选项；旧 NPM 元数据中的 `GPL-2.0` 不用于覆盖源码中的明确授权。RAR 解压引擎还有上游 UnRAR 使用条款，不能把它一概标为 MIT。精确源码版本、版权声明、重建入口和许可证正文见 [THIRD_PARTY.md](THIRD_PARTY.md) 及 [licenses/](licenses/)。

本目录只包含应用源码、合成测试及公开依赖。发布静态网站时排除 `node_modules/`、`.build/` 和 `wasm-engine/target/`，不要将用户图纸或转换结果复制到公开仓库。

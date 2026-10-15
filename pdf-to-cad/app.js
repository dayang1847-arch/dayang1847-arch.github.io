import { zipSync } from './vendor/fflate/index.js';

// All drawings, previews and conversion results live only in this tab's memory.
const language = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'zh';
const en = {
  brand:'Drawing Workshop', workspace:'Workspace', drawingConversion:'Drawing conversion', browserLocal:'Processed in your browser', notUploaded:'Drawing files are never uploaded',
  engineLoading:'Loading conversion engine', engineReady:'Conversion engine ready', engineFailed:'Engine unavailable', eyebrow:'From drawings to editable designs', workbench:'Workbench', intro:'Load drawings, choose a mode, and export DWG and DXF.',
  privacyTitle:'Convert in your browser. Your files stay on your device.', privacyText:'Files and results exist only in this page. Refresh, close, or clear to remove them. No history is displayed.',
  loadFiles:'Source files', clearFiles:'Clear this session', dropTitle:'Drop your drawings here', dropDescription:'Multiple PDFs and RAR / ZIP archives containing PDFs', chooseFiles:'Choose files', noFiles:'No files loaded', temporaryOnly:'Only in this page',
  settings:'Conversion settings', settingsHint:'Choose for your drawing', conversionMode:'Conversion mode', auto:'Automatic', recommended:'Best', autoHint:'Detect the content of each page', vector:'Vector PDF', vectorHint:'Extract existing paths and text', scan:'Scanned PDF', scanHint:'Trace image outlines into paths',
  outputScale:'Output scale', scaleDescription:'Paper millimetres by default; calibrate against a known dimension.', scaleHint:'For a drawing at 1:2, enter 2 to restore its actual size.', scanParameters:'Scan settings', precision:'Threshold and quality', threshold:'Black / white threshold', thresholdHint:'Increase to include lighter lines', resolution:'Scan resolution', resolutionHint:'Higher quality needs more time',
  outputFiles:'Output files', cancelClear:'Cancel and clear', startConversion:'Start conversion', converting:'Converting…', inspecting:'Reading files…', drawingPreview:'Drawing preview', waiting:'Waiting for files', previewPlaceholder:'Preview your drawings here', previewHint:'Load a file, then select it to preview', nothingSelected:'No file selected',
  qualityTitle:'Before you convert', qualityText:'Vector PDFs preserve editable geometry where possible. Scans generate outlines; text and dimensions are not restored as native CAD objects.', qualityCheck:'The preview does not prove manufacturing accuracy. Calibrate the scale and verify dimensions and curves before design or production.',
  results:'Conversion results', downloadDwg:'Download all DWG ↓', downloadDxf:'Download all DXF ↓', downloadBoth:'Download both formats ↓', preparing:'Preparing conversion', waitingForResults:'Waiting for the conversion engine…', credits:'MuPDF · Potrace · acadrust', sourceCode:'Source code',
  filesSummary:'{files} files · {pages} pages', pageSummary:'{pages} pages', mixed:'Mixed content', vectorKind:'Vector', scanKind:'Scanned', sourcePreview:'Source · page 1', resultPreview:'Source reference · download CAD to inspect', pageLabel:'Page {page}', entities:'{count} entities', preview:'Preview',
  loadProgress:'Reading {current} / {total}: {name}', convertProgress:'Converting {current} / {total}: {name}', complete:'Finished {total} pages · {success} succeeded · {failed} failed', loaded:'Loaded {files} files. Files stay in this page only.',
  invalidFile:'Unsupported file: {name}. Choose PDF, ZIP, or RAR.', loadFailed:'Could not read {name}: {error}', conversionFailed:'Conversion failed: {error}', emptyArchive:'No PDF files were found in {name}.',
  invalidScale:'Enter an output scale between 0.000001 and 1000.', invalidThreshold:'Enter a whole-number threshold between 40 and 240.', clearDone:'This session has been cleared.', engineError:'The engine could not load. Refresh the page to retry. {error}',
  noPreview:'Preview unavailable', engineEmpty:'The engine returned an empty CAD file.', downloadError:'Could not package the download: {error}', archiveReport:'Conversion report', reportNote:'Files were converted locally in the browser. Check scale, dimensions and curves before use. Scanned text is traced as outlines.',
};
const zh = {
  engineReady:'转换引擎已就绪', engineFailed:'转换引擎不可用', converting:'正在转换…', inspecting:'正在读取文件…',
  filesSummary:'{files} 个文件 · {pages} 页', pageSummary:'{pages} 页', mixed:'混合图纸', vectorKind:'矢量图纸', scanKind:'扫描图纸', sourcePreview:'源图 · 第 1 页', resultPreview:'源图参考 · 下载 CAD 核验线条', pageLabel:'第 {page} 页', entities:'{count} 个图元', preview:'预览',
  loadProgress:'正在读取 {current} / {total}：{name}', convertProgress:'正在转换 {current} / {total}：{name}', complete:'已完成 {total} 页 · 成功 {success} 页 · 失败 {failed} 页', loaded:'已载入 {files} 个文件。文件仅保留在本次页面中。',
  invalidFile:'不支持此文件：{name}。请选择 PDF、ZIP 或 RAR。', loadFailed:'无法读取 {name}：{error}', conversionFailed:'转换失败：{error}', emptyArchive:'{name} 中没有找到 PDF 文件。',
  invalidScale:'请输入 0.000001 至 1000 之间的输出比例。', invalidThreshold:'请输入 40 至 240 之间的整数黑白阈值。', clearDone:'已清空本次文件与转换结果。', engineError:'转换引擎加载失败，请刷新页面重试。{error}',
  noPreview:'暂无预览', engineEmpty:'转换引擎返回了空 CAD 文件。', downloadError:'打包下载失败：{error}', archiveReport:'转换报告', reportNote:'文件在浏览器本地转换。使用前请校正比例，核对尺寸和曲线。扫描件中的文字仅转换为轮廓。',
};
Object.assign(en, {
  outputScale:'Manual scale for uncalibrated pages', scaleDescription:'Calibrated pages use their measured scale. This value applies only to unverified pages.', scaleHint:'For a 1:2 drawing, you can enter 2 manually. Manual input does not verify its dimensions.',
  allowUnverified:'Allow uncalibrated pages at paper / manual scale (dimensions unverified)', calibrationTitle:'Calibrate against a dimension', file:'File', page:'Page',
  calibrationInstruction:'Click the two extension-line endpoints of one dimension in the source image, then enter its stated length in millimetres.', calibrationNoPoints:'No endpoints selected', dimensionValue:'Stated length (mm)', applyCalibration:'Apply to this page', resetPoints:'Select points again', showSource:'Show source',
  notCalibrated:'This page is not calibrated', calibrationLimitation:'Calibration verifies only the selected reference length. Views at different scales must be handled separately; one calibration cannot automatically verify every stated dimension.',
  calibratedCount:'{done} / {total} pages calibrated', pointSummary:'{count} / 2 endpoints selected{detail}', calibrationApplied:'Reference {value} mm · scale × {scale}', calibrationResult:'Reference check: {value} mm{error}',
  calibrationInvalid:'Select two distinct dimension endpoints and enter a positive length (scale must be at most 1000).', calibrationMissing:'{count} pages have no calibration. Calibrate each page, or explicitly allow unverified dimensions before converting.', unverifiedWarning:'Dimensions unverified: exported at paper / manual scale.', calibrationSource:'Show the source image to select calibration endpoints.', calibrationLoading:'Loading page preview…', calibrationPreviewError:'Could not load this page preview: {error}',
  separateLines:'Independent entities: select each line or curve separately.', scanOutline:'Scans produce two-sided outlines, not automatically reconstructed centre lines.',
  outlineTitle:'Need just the outlines?', outlineHint:'Vector text objects are omitted. Scanned text remains as outlines and needs manual cleanup. Uses the current mode and each page’s calibration.', traceOutlines:'One-click outlines', tracingOutlines:'Tracing outlines…', outlineMode:'Outlines',
  outlineProgress:'Tracing outlines {current} / {total}: {name}', outlineVectorWarning:'Outline mode: vector text objects are omitted; inspect the remaining drawing boundaries.', outlineScanWarning:'Outline mode: scanned text remains as image outlines and needs manual cleanup.',
});
Object.assign(zh, {
  calibratedCount:'已校准 {done} / {total} 页', pointSummary:'已选 {count} / 2 个端点{detail}', calibrationApplied:'参考长度 {value} mm · 本页比例 × {scale}', calibrationResult:'参考长度复核：{value} mm{error}',
  calibrationInvalid:'请选取间距足够的两个尺寸端点，并输入正数标注长度（比例不超过 1000）。', calibrationMissing:'还有 {count} 页未校准。请逐页按标注校准，或明确勾选允许尺寸未核实的导出后再转换。', unverifiedWarning:'尺寸未核实：按纸面 / 手动比例导出。', calibrationSource:'请回到源图后选择校准端点。', calibrationLoading:'正在载入本页预览…', calibrationPreviewError:'本页预览载入失败：{error}',
  separateLines:'独立线段输出，直线 / 曲线可单独选择。', scanOutline:'扫描件生成双边轮廓，不会自动恢复为中心线。',
  traceOutlines:'一键描轮廓', tracingOutlines:'正在描轮廓…', outlineMode:'轮廓模式', outlineProgress:'正在描轮廓 {current} / {total}：{name}', outlineVectorWarning:'轮廓模式：矢量文字对象不输出，请核对保留的图形边界。', outlineScanWarning:'轮廓模式：扫描文字仍为图像轮廓，需人工清理。',
});
Object.assign(en, {
  outlineTitle:'Trace a whole page', traceOutlines:'Trace whole page',
  contourJump:'Lamp-cup profiles: select a region → calibrate dimensions → export one CAD / PDF',
  contourRotate:'Rotate 90°', contourWorkspace:'Part contour collection', contourTag:'One part · one calibration',
  contourIntro:'Select a lamp-cup front view, extract its outer contour, then calibrate against a stated dimension. Collect multiple models in one CAD at actual millimetre scale, or in a PDF with a shared display scale.',
  contourStep1:'1. Select a part', contourStep2:'2. Calibrate its contour', contourStep3:'3. Export the collection',
  contourSelectTitle:'Select the part to extract', contourSelectHelp:'Drag a rectangle around a single part in the source below. Avoid dimensions, hatching and drawing borders where possible. Touch dragging is supported.',
  contourLoadFirst:'Load PDF drawings above first', contourRegionEmpty:'No region selected', contourResetRegion:'Select again', contourExtract:'Extract selected outer contour', contourExtracting:'Extracting contour…',
  contourDimensionTitle:'Calibrate the extracted contour', contourDimensionHelp:'Click the two contour endpoints A and B of a known dimension, then enter the stated length in millimetres. Clicks snap to nearby contour edges.',
  contourExtractFirst:'The extracted part contour appears here', contourNoPoints:'No dimension endpoints selected', contourModel:'Model / name', contourApplyCalibration:'Calibrate this part', contourResetCalibration:'Reset calibration',
  contourNeedsCalibration:'Each extracted part must be calibrated before export.', contourDimensionLimitation:'Calibration scales this part uniformly and verifies only the selected reference. Check other dimensions, scan distortion and shape details separately. Connected lines in the crop can affect extraction; inspect the contour preview first.',
  contourCollection:'Parts to collect', contourCollectionEmpty:'Extract parts from different files and pages. Everything stays in the current page only.', contourExportEmpty:'Extract and calibrate at least one part.',
  contourExportDwg:'Collect as DWG ↓', contourExportDxf:'Collect as DXF ↓', contourExportPdf:'Collect as PDF ↓',
  contourRegionReady:'Region selected · {width}% × {height}% of page', contourRegionSmall:'Drag a larger region around the complete part.',
  contourExtractSuccess:'Contour extracted. Select two endpoints on the contour and enter a stated dimension to calibrate it.',
  contourError:'Contour operation failed: {error}', contourPointCount:'{count} / 2 endpoints selected{distance}',
  contourMeasured:' · current distance {value} mm', contourInvalidCalibration:'Select two distinct contour endpoints and enter a positive stated length.',
  contourCalibrationDone:'Reference {value} mm · measured {measurement} mm · scale × {scale}', contourUncalibrated:'Needs calibration', contourCalibrated:'Calibrated',
  contourSize:'Width {width} mm · height {height} mm', contourSelectedCount:'{selected} selected / {total} parts', contourExportMissing:'{count} selected parts still need calibration.',
  contourExportReady:'{count} calibrated parts. CAD uses 1:1 scale; PDF fits the sheet at one shared display scale.', contourExporting:'Preparing {format} collection…', contourExported:'Downloaded {count} parts as one {format} file.',
  contourRemove:'Remove', contourEdit:'Edit contour', contourInclude:'Include {name} in collection', contourClickNear:'Click near the contour edge to choose a dimension endpoint.', contourCalibrationReset:'Calibration reset. Select the dimension endpoints again.',
  contourPreviewLoading:'Loading source preview…', contourLoadingFailed:'Could not load the source preview: {error}', contourSourceName:'{name} · page {page}',
});
Object.assign(zh, {
  traceOutlines:'整页描轮廓', contourExtracting:'正在提取轮廓…',
  contourRegionReady:'已框选 · 占本页 {width}% × {height}%', contourRegionSmall:'请框选更大的区域，包含完整零件。',
  contourExtractSuccess:'已提取外轮廓。请在轮廓上选择两个尺寸端点，并输入标注长度完成校准。',
  contourError:'轮廓操作失败：{error}', contourPointCount:'已选 {count} / 2 个端点{distance}', contourMeasured:' · 当前间距 {value} mm',
  contourInvalidCalibration:'请选两个不同的轮廓端点，并输入正数标注长度。',
  contourCalibrationDone:'标注 {value} mm · 复核 {measurement} mm · 比例 × {scale}', contourUncalibrated:'待校准', contourCalibrated:'已校准',
  contourSize:'宽 {width} mm · 高 {height} mm', contourSelectedCount:'已选 {selected} / {total} 个零件', contourExportMissing:'还有 {count} 个选中零件未校准，完成后可导出。',
  contourExportReady:'汇总 {count} 个已校准零件：CAD 保留 1:1 实际比例；PDF 按统一比例适配版面。', contourExporting:'正在生成 {format} 汇总文件…', contourExported:'已将 {count} 个零件汇总下载为一个 {format} 文件。',
  contourRemove:'移除', contourEdit:'编辑轮廓', contourInclude:'将 {name} 加入汇总', contourClickNear:'请点击靠近轮廓边线的位置，选择尺寸端点。', contourCalibrationReset:'已重置校准，请重新选择尺寸端点。',
  contourPreviewLoading:'正在载入源图…', contourLoadingFailed:'源图预览载入失败：{error}', contourSourceName:'{name} · 第 {page} 页',
});
// Keep the authored Chinese text as the source of truth for static labels.
document.querySelectorAll('[data-i18n]').forEach(node => { zh[node.dataset.i18n] ??= node.textContent; });
const t = (key, values = {}) => String((language === 'en' ? en[key] : zh[key]) ?? key).replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ''));
document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
if (language === 'en') {
  document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
  document.querySelector('h1').firstChild.nodeValue = 'PDF to CAD';
  document.title = 'PDF to CAD · Drawing Workshop';
  document.querySelector('#dimension-value').placeholder = 'e.g. 100';
  document.querySelector('#contour-dimension').placeholder = 'e.g. 60';
  document.querySelector('meta[name="description"]').content = 'Convert vector or scanned PDF to DWG and DXF locally in your browser. Files are not uploaded and results last only for the current page.';
  document.querySelector('#dropzone').setAttribute('aria-label', 'Select or drop PDF, RAR, or ZIP files');
  document.querySelector('#bulk-downloads').setAttribute('aria-label', 'Download archives by format');
  document.querySelector('#progress-bar').setAttribute('aria-label', 'Conversion progress');
}
const switchLink = document.querySelector('#language-switch');
switchLink.textContent = language === 'en' ? '中文' : 'EN';
switchLink.href = language === 'en' ? '?lang=zh' : '?lang=en';
switchLink.lang = language === 'en' ? 'zh-CN' : 'en';

const $ = id => document.getElementById(id);
const state = { documents: [], results: [], urls: new Set(), worker: null, ready: false, busy: '', conversionOutline: false, generation: 0, pending: new Map(), selected: null, selectedPage: 0, previewContext: null, previewRequest: 0, failed: 0, contours: [], activeContour: null, contourDocId: null, contourPage: 0, contourRegions: new Map(), contourPreviewRequest: 0, contourDrag: null };
const errorText = error => error instanceof Error ? error.message : String(error);
function notice(message, isError = false) { $('notice').textContent = message; $('notice').classList.toggle('error', isError); $('notice').hidden = !message; }
function objectUrl(bytes, type) { const url = URL.createObjectURL(new Blob([bytes], { type })); state.urls.add(url); return url; }
function revoke(url) { if (url) { URL.revokeObjectURL(url); state.urls.delete(url); } }
function setEngine(label, status = '') { $('engine-label').textContent = label; $('engine-status').className = `engine-status ${status}`; }
function updateControls() {
  const disabled = !state.ready || Boolean(state.busy);
  $('file-input').disabled = disabled;
  $('dropzone').classList.toggle('loading', disabled);
  $('dropzone').setAttribute('aria-disabled', String(disabled));
  $('convert-button').disabled = disabled || state.documents.length === 0;
  $('outline-button').disabled = disabled || state.documents.length === 0;
  $('clear-button').disabled = Boolean(state.busy) || state.documents.length === 0;
  $('cancel-button').hidden = !state.busy || state.busy === 'clear';
  $('convert-label').textContent = state.busy === 'convert' ? t('converting') : state.busy === 'inspect' ? t('inspecting') : t('startConversion');
  $('outline-label').textContent = state.busy === 'convert' && state.conversionOutline ? t('tracingOutlines') : t('traceOutlines');
  document.body.classList.toggle('busy', Boolean(state.busy));
  document.querySelectorAll('.settings-card input,.settings-card select').forEach(node => { node.disabled = Boolean(state.busy); });
  document.querySelectorAll('.source-file').forEach(node => { node.disabled = Boolean(state.busy); });
  document.querySelectorAll('.preview-link').forEach(node => { node.disabled = Boolean(state.busy); });
  updateCalibrationControls();
  updateContourControls();
}
function setBusy(value) { state.busy = value; updateControls(); }
function rejectPending(message) { for (const entry of state.pending.values()) entry.reject(new Error(message)); state.pending.clear(); }
function startWorker() {
  state.ready = false;
  setEngine(t('engineLoading'));
  updateControls();
  const worker = new Worker(new URL('./worker.js?v=20261015-parts-1', import.meta.url), { type: 'module' });
  state.worker = worker;
  function fail(message) {
    if (state.worker !== worker) return;
    state.ready = false;
    rejectPending(message);
    setEngine(t('engineFailed'), 'error');
    notice(t('engineError', { error: message }), true);
    updateControls();
  }
  worker.addEventListener('message', ({ data }) => {
    if (state.worker !== worker) return;
    if (data.type === 'ready') { state.ready = true; setEngine(t('engineReady'), 'ready'); updateControls(); return; }
    if (data.type === 'fatal') { fail(data.error || 'Worker initialization failed'); return; }
    const entry = state.pending.get(data.id);
    if (!entry) return;
    state.pending.delete(data.id);
    if (data.ok) entry.resolve(data.result); else entry.reject(new Error(data.error || 'Conversion engine error'));
  });
  worker.addEventListener('error', event => fail(event.message || 'Worker failed to load'));
  worker.addEventListener('messageerror', () => fail('Could not read the conversion engine response'));
}
function rpc(type, payload, transfer = []) {
  return new Promise((resolve, reject) => {
    if (!state.ready || !state.worker) { reject(new Error(t('engineFailed'))); return; }
    const id = crypto.randomUUID();
    state.pending.set(id, { resolve, reject });
    try { state.worker.postMessage({ id, type, payload }, transfer); }
    catch (error) { state.pending.delete(id); reject(error); }
  });
}
function kindLabel(kind) { return t(kind === 'scan' ? 'scanKind' : kind === 'mixed' ? 'mixed' : 'vectorKind'); }
function newNode(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
const initialPreview = $('preview-area').innerHTML;
function showPreview(url, name, kind, detail = '') {
  state.previewContext = null;
  $('preview-area').classList.remove('calibrating');
  $('preview-area').replaceChildren();
  if (url) { const image = new Image(); image.src = url; image.alt = name; $('preview-area').append(image); }
  else $('preview-area').append(newNode('div', 'preview-placeholder', t('noPreview')));
  $('preview-name').textContent = name;
  $('preview-kind').textContent = kind;
  $('preview-detail').textContent = detail;
  updateCalibrationControls();
}
function selectedDocument() { return state.documents.find(doc => doc.id === state.selected); }
function currentMeasurement(create = false) {
  const doc = selectedDocument(); if (!doc) return null;
  doc.measurements ??= {};
  if (create) doc.measurements[state.selectedPage] ??= { points: [], valueMm: null };
  return doc.measurements[state.selectedPage] || null;
}
function updateCalibrationControls() {
  const doc = selectedDocument(), measurement = currentMeasurement(), busy = Boolean(state.busy);
  const isSource = state.previewContext?.docId === state.selected && state.previewContext?.pageIndex === state.selectedPage;
  $('calibration-file').disabled = busy || !state.documents.length;
  $('calibration-page').disabled = busy || !doc;
  $('dimension-value').disabled = busy || !doc || !isSource;
  $('calibrate-button').disabled = busy || !doc || !isSource || measurement?.points?.length !== 2;
  $('reset-points').disabled = busy || !doc;
  $('show-source').disabled = busy || !doc;
  const total = state.documents.reduce((sum, item) => sum + item.pageCount, 0);
  const done = state.documents.reduce((sum, item) => sum + Object.values(item.measurements || {}).filter(entry => entry.calibration).length, 0);
  $('calibration-count').textContent = t('calibratedCount', { done, total });
  const points = measurement?.points || [];
  $('calibration-points').textContent = points.length ? t('pointSummary', { count: points.length, detail: ' · ' + points.map((point, i) => `${i === 0 ? 'A' : 'B'} (${(point[0] * 100).toFixed(1)}%, ${(point[1] * 100).toFixed(1)}%)`).join(' → ') }) : t('calibrationNoPoints');
  $('calibration-status').textContent = measurement?.calibration ? t('calibrationApplied', { value: measurement.calibration.valueMm, scale: Number(measurement.calibration.scale.toPrecision(7)) }) : t('notCalibrated');
  $('calibration-status').classList.toggle('verified', Boolean(measurement?.calibration));
  for (const option of $('calibration-page').options) {
    if (!doc || !/^\d+$/.test(option.value)) continue;
    const pageIndex = Number(option.value); option.textContent = `${pageIndex + 1}${doc.measurements?.[pageIndex]?.calibration ? ' ✓' : ''}`;
  }
}
function drawCalibrationOverlay() {
  $('preview-area').querySelector('.calibration-overlay')?.remove();
  const context = state.previewContext;
  if (!context || context.docId !== state.selected || context.pageIndex !== state.selectedPage) return;
  const image = $('preview-area').querySelector('img'), points = currentMeasurement()?.points || [];
  if (!image?.complete || !image.naturalWidth || !points.length) return;
  const imageRect = image.getBoundingClientRect(), areaRect = $('preview-area').getBoundingClientRect();
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('calibration-overlay'); svg.setAttribute('aria-hidden', 'true');
  svg.style.left = `${imageRect.left - areaRect.left}px`; svg.style.top = `${imageRect.top - areaRect.top}px`; svg.style.width = `${imageRect.width}px`; svg.style.height = `${imageRect.height}px`;
  svg.setAttribute('viewBox', `0 0 ${imageRect.width} ${imageRect.height}`);
  if (points.length === 2) {
    const line = document.createElementNS(svg.namespaceURI, 'line');
    for (const [key, value] of Object.entries({ x1: points[0][0] * imageRect.width, y1: points[0][1] * imageRect.height, x2: points[1][0] * imageRect.width, y2: points[1][1] * imageRect.height, stroke: '#2263e6', 'stroke-width': 2, 'stroke-dasharray': '5 3' })) line.setAttribute(key, String(value));
    svg.append(line);
  }
  points.forEach((point, index) => {
    const circle = document.createElementNS(svg.namespaceURI, 'circle');
    for (const [key, value] of Object.entries({ cx: point[0] * imageRect.width, cy: point[1] * imageRect.height, r: 5, fill: index ? '#36a477' : '#2263e6', stroke: '#fff', 'stroke-width': 2 })) circle.setAttribute(key, String(value));
    const text = document.createElementNS(svg.namespaceURI, 'text'); text.setAttribute('x', String(point[0] * imageRect.width + 8)); text.setAttribute('y', String(Math.max(13, point[1] * imageRect.height - 8))); text.setAttribute('fill', '#2263e6'); text.setAttribute('font-size', '12'); text.setAttribute('font-weight', '700'); text.setAttribute('paint-order', 'stroke'); text.setAttribute('stroke', '#fff'); text.setAttribute('stroke-width', '3'); text.textContent = index ? 'B' : 'A'; svg.append(circle, text);
  });
  $('preview-area').append(svg);
}
async function selectDocument(doc, pageIndex = 0) {
  const request = ++state.previewRequest, generation = state.generation;
  state.selected = doc.id;
  state.selectedPage = pageIndex;
  document.querySelectorAll('.source-file').forEach(node => { node.classList.toggle('selected', node.dataset.id === doc.id); });
  $('calibration-file').value = doc.id;
  $('calibration-page').replaceChildren(...Array.from({ length: doc.pageCount }, (_, index) => { const option = newNode('option', '', String(index + 1)); option.value = String(index); return option; }));
  $('calibration-page').value = String(pageIndex);
  $('dimension-value').value = currentMeasurement()?.valueMm || '';
  updateCalibrationControls();
  doc.previews ??= { 0: doc.previewUrl };
  let url = doc.previews[pageIndex];
  if (!url) {
    showPreview(null, doc.name, kindLabel(doc.pages?.[pageIndex]?.kind), t('calibrationLoading'));
    try {
      const result = await rpc('preview', { documentId: doc.id, pageIndex });
      if (state.generation !== generation || request !== state.previewRequest || !state.documents.some(item => item.id === doc.id)) return;
      url = doc.previews[pageIndex] = result.preview?.byteLength ? objectUrl(result.preview, 'image/png') : null;
    } catch (error) { if (request === state.previewRequest && state.generation === generation) notice(t('calibrationPreviewError', { error: errorText(error) }), true); return; }
  }
  if (request !== state.previewRequest || state.generation !== generation) return;
  showPreview(url, `${doc.name} · ${t('pageLabel', { page: pageIndex + 1 })}`, kindLabel(doc.pages?.[pageIndex]?.kind), language === 'en' ? 'Source image' : '源图');
  state.previewContext = { docId: doc.id, pageIndex };
  $('preview-area').classList.add('calibrating');
  updateCalibrationControls();
  $('preview-area').querySelector('img')?.addEventListener('load', drawCalibrationOverlay);
  drawCalibrationOverlay();
}
function renderSources() {
  const list = $('source-list'); list.replaceChildren(); list.hidden = state.documents.length === 0;
  for (const doc of state.documents) {
    const button = newNode('button', 'source-file'); button.type = 'button'; button.dataset.id = doc.id; button.disabled = Boolean(state.busy);
    button.append(newNode('span', 'file-icon', 'PDF'));
    const copy = newNode('span', 'file-copy'); copy.append(newNode('span', 'file-name', doc.name), newNode('span', 'file-meta', t('pageSummary', { pages: doc.pageCount })));
    button.append(copy, newNode('span', 'kind-tag', kindLabel(doc.pages?.[0]?.kind)), newNode('span', 'file-select-arrow', '›'));
    button.classList.toggle('selected', state.selected === doc.id);
    button.addEventListener('click', () => { if (!state.busy) void selectDocument(doc); }); list.append(button);
  }
  $('file-counter').textContent = state.documents.length ? t('filesSummary', { files: state.documents.length, pages: state.documents.reduce((sum, doc) => sum + doc.pageCount, 0) }) : t('noFiles');
  $('calibration-file').replaceChildren(...state.documents.map(doc => { const option = newNode('option', '', doc.name); option.value = doc.id; return option; }));
  if (state.selected) $('calibration-file').value = state.selected;
  updateCalibrationControls();
  syncContourSources();
}
function clearResults() {
  for (const result of state.results) { revoke(result.dwgUrl); revoke(result.dxfUrl); revoke(result.previewUrl); }
  state.results = []; state.failed = 0;
  $('result-list').replaceChildren(); $('result-count').textContent = '0'; $('results-card').hidden = true; $('results-card').classList.remove('done', 'failed'); $('bulk-downloads').hidden = true; $('result-empty').hidden = false;
}
function resetUi() {
  clearResults();
  resetContourUi();
  for (const url of state.urls) URL.revokeObjectURL(url);
  state.urls.clear(); state.documents = []; state.selected = null; state.selectedPage = 0; state.previewContext = null; state.previewRequest++; state.conversionOutline = false;
  renderSources(); $('file-input').value = ''; $('preview-area').innerHTML = initialPreview;
  $('preview-area').classList.remove('calibrating'); $('calibration-page').replaceChildren(newNode('option', '', '—')); $('dimension-value').value = ''; $('allow-unverified').checked = false;
  $('preview-name').textContent = t('nothingSelected'); $('preview-kind').textContent = t('waiting'); $('preview-detail').textContent = '';
  updateControls();
}
async function loadFiles(files) {
  if (!state.ready || state.busy || !files.length) return;
  const generation = state.generation;
  setBusy('inspect'); notice('');
  const errors = [];
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!/\.(pdf|zip|rar)$/i.test(file.name)) { errors.push(t('invalidFile', { name: file.name })); continue; }
      notice(t('loadProgress', { current: i + 1, total: files.length, name: file.name }));
      try {
        const bytes = await file.arrayBuffer();
        if (state.generation !== generation) return;
        const result = await rpc('inspect', { name: file.name, bytes }, [bytes]);
        if (state.generation !== generation) return;
        if (!result.documents?.length) { errors.push(t('emptyArchive', { name: file.name })); continue; }
        for (const doc of result.documents) {
          doc.previewUrl = doc.preview?.byteLength ? objectUrl(doc.preview, 'image/png') : null;
          delete doc.preview;
          state.documents.push(doc);
        }
        renderSources();
        if (!state.selected) selectDocument(state.documents[0]);
      } catch (error) { if (state.generation !== generation) return; errors.push(t('loadFailed', { name: file.name, error: errorText(error) })); }
    }
    notice(errors.length ? errors.join('\n') : t('loaded', { files: state.documents.length }), errors.length > 0);
  } finally { if (state.generation === generation) { $('file-input').value = ''; setBusy(''); } }
}
function progress(completed, total, message) {
  const value = Math.round(completed / Math.max(1, total) * 100);
  $('progress-message').textContent = message; $('progress-value').textContent = `${value}%`; $('progress-bar').style.width = `${value}%`; $('progress-bar').setAttribute('aria-valuenow', String(value));
}
function safeName(name) { return name.split(/[\\/]/).pop().replace(/\.pdf$/i, '').replace(/[<>:"|?*\x00-\x1F]/g, '_').trim().slice(0, 140) || 'drawing'; }
function downloadLink(url, name, label) { const link = newNode('a', 'download-link', label); link.href = url; link.download = name; return link; }
function addResultRow(result, error = null) {
  $('result-empty').hidden = true;
  const row = newNode('div', `result-row${error ? ' failed' : ''}`); row.append(newNode('span', 'result-symbol', error ? '!' : '✓'));
  const copy = newNode('div', 'result-copy'); copy.append(newNode('div', 'result-name', result.label));
  if (error) copy.append(newNode('div', 'result-warnings', error));
  else {
    const meta = newNode('div', 'result-meta'); meta.append(newNode('span', '', kindLabel(result.mode)), newNode('span', '', t('entities', { count: Number(result.entityCount || 0).toLocaleString(language === 'en' ? 'en-US' : 'zh-CN') })), newNode('span', '', 'DWG + DXF'));
    if (result.outline) meta.append(newNode('span', 'result-outline-tag', t('outlineMode')));
    copy.append(meta);
    if (Number.isFinite(result.measurementMm)) copy.append(newNode('div', 'result-meta', t('calibrationResult', { value: Number(result.measurementMm.toFixed(6)), error: Number.isFinite(result.measurementErrorMm) ? ` · Δ ${result.measurementErrorMm.toExponential(2)} mm` : '' })));
    const warnings = Array.isArray(result.warnings) ? result.warnings : result.warnings ? [result.warnings] : [];
    if (warnings.length) copy.append(newNode('div', 'result-warnings', warnings.join(' · ')));
  }
  row.append(copy);
  if (!error) {
    const links = newNode('div', 'result-downloads');
    if (result.previewUrl) { const preview = newNode('button', 'preview-link', t('preview')); preview.type = 'button'; preview.addEventListener('click', () => { void showResultPreview(result); }); links.append(preview); }
    links.append(downloadLink(result.dwgUrl, `${result.stem}.dwg`, 'DWG ↓'), downloadLink(result.dxfUrl, `${result.stem}.dxf`, 'DXF ↓')); row.append(links);
  }
  $('result-list').append(row);
  $('result-count').textContent = String(state.results.length);
  $('bulk-downloads').hidden = state.results.length === 0;
}
async function showResultPreview(result, allowBusy = false) {
  if (state.busy && !allowBusy) return;
  const doc = state.documents.find(item => item.id === result.documentId), generation = state.generation;
  if (doc) await selectDocument(doc, result.pageIndex);
  if (generation !== state.generation || !state.results.includes(result)) return;
  state.previewRequest++;
  showPreview(result.previewUrl, result.label, kindLabel(result.mode), t('resultPreview'));
}
async function convert({ outline = false } = {}) {
  if (!state.ready || state.busy || !state.documents.length) return;
  const scale = Number($('scale').value), threshold = Number($('threshold').value);
  if (!Number.isFinite(scale) || scale < 0.000001 || scale > 1000) { notice(t('invalidScale'), true); $('scale').focus(); return; }
  if (!Number.isInteger(threshold) || threshold < 40 || threshold > 240) { notice(t('invalidThreshold'), true); $('threshold').focus(); return; }
  const missing = state.documents.reduce((sum, doc) => sum + doc.pageCount - Object.values(doc.measurements || {}).filter(entry => entry.calibration).length, 0);
  if (missing && !$('allow-unverified').checked) { notice(t('calibrationMissing', { count: missing }), true); $('calibration-panel').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  const options = { mode: document.querySelector('input[name="mode"]:checked').value, scale, threshold, dpi: Number($('dpi').value), outline };
  const generation = state.generation;
  // Return the preview to a source before invalidating previous result URLs.
  selectDocument(state.documents.find(doc => doc.id === state.selected) || state.documents[0]);
  clearResults(); $('results-card').hidden = false; state.conversionOutline = outline; setBusy('convert'); notice('');
  const total = state.documents.reduce((sum, doc) => sum + doc.pageCount, 0); let completed = 0;
  const stems = new Set();
  try {
    for (const doc of state.documents) {
      for (let pageIndex = 0; pageIndex < doc.pageCount; pageIndex++) {
        if (state.generation !== generation) return;
        const label = `${doc.name} · ${t('pageLabel', { page: pageIndex + 1 })}`;
        let stem = `${safeName(doc.name)}_p${String(pageIndex + 1).padStart(2, '0')}${outline ? '_outline' : ''}`, suffix = 2;
        const baseStem = stem; while (stems.has(stem)) stem = `${baseStem}_${suffix++}`; stems.add(stem);
        progress(completed, total, t(outline ? 'outlineProgress' : 'convertProgress', { current: completed + 1, total, name: label }));
        try {
          const calibration = doc.measurements?.[pageIndex]?.calibration;
          const pageOptions = { ...options, scale: calibration?.scale ?? options.scale };
          if (calibration) pageOptions.calibration = calibration;
          const output = await rpc('convert', { documentId: doc.id, pageIndex, options: pageOptions });
          if (state.generation !== generation) return;
          if (!output.dwg?.byteLength || !output.dxf?.byteLength) throw new Error(t('engineEmpty'));
          const warnings = Array.isArray(output.warnings) ? [...output.warnings] : output.warnings ? [String(output.warnings)] : [];
          if (!calibration && !warnings.includes(t('unverifiedWarning'))) warnings.push(t('unverifiedWarning'));
          if (outline) { const warning = t(output.mode === 'scan' ? 'outlineScanWarning' : 'outlineVectorWarning'); if (!warnings.includes(warning)) warnings.push(warning); }
          const result = { ...output, outline, warnings, label, stem, documentId: doc.id, pageIndex, dwgUrl: objectUrl(output.dwg, 'application/acad'), dxfUrl: objectUrl(output.dxf, 'application/dxf'), previewUrl: output.preview?.byteLength ? objectUrl(output.preview, 'image/png') : null };
          delete result.preview;
          state.results.push(result); addResultRow(result);
        } catch (error) { if (state.generation !== generation) return; state.failed++; addResultRow({ label }, t('conversionFailed', { error: errorText(error) })); }
        completed++;
        progress(completed, total, t(outline ? 'outlineProgress' : 'convertProgress', { current: completed, total, name: label }));
        if (!state.ready) break;
      }
      if (!state.ready) break;
    }
    progress(completed, total, t('complete', { total: completed, success: state.results.length, failed: state.failed }));
    $('results-card').classList.add(state.failed ? 'failed' : 'done');
    if (state.results[0]?.previewUrl) await showResultPreview(state.results[0], true);
  } finally { if (state.generation === generation) { state.conversionOutline = false; setBusy(''); } }
}
function downloadArchive(format) {
  if (!state.results.length) return;
  const buttons = [...document.querySelectorAll('.bulk-downloads button')]; buttons.forEach(button => { button.disabled = true; });
  try {
    const entries = Object.create(null);
    for (const result of state.results) {
      if (format !== 'dxf') entries[`${result.stem}.dwg`] = result.dwg;
      if (format !== 'dwg') entries[`${result.stem}.dxf`] = result.dxf;
    }
    if (format === 'both') {
      const report = [t('archiveReport'), t('reportNote'), '', ...state.results.map(result => `${result.stem}: ${result.entityCount || 0} entities; ${result.mode}; ${(result.warnings || []).join?.(' · ') || result.warnings || ''}`)].join('\n');
      entries['conversion-report.txt'] = new TextEncoder().encode(report);
    }
    const bytes = zipSync(entries, { level: 1 });
    const url = objectUrl(bytes, 'application/zip');
    const link = document.createElement('a'); link.href = url; link.download = `PDF-to-CAD_${format === 'both' ? 'DWG-DXF' : format.toUpperCase()}.zip`; document.body.append(link); link.click(); link.remove();
    // Allow the browser to consume the generated download before releasing it.
    setTimeout(() => revoke(url), 30_000);
  } catch (error) { notice(t('downloadError', { error: errorText(error) }), true); }
  finally { buttons.forEach(button => { button.disabled = false; }); }
}
// Part collection: selections, measurements and geometry are kept in memory only.
const SVG_NS = 'http://www.w3.org/2000/svg';
const contourNumber = value => Number.isFinite(Number(value)) ? Number(Number(value).toFixed(4)) : '—';
function contourNotice(message, error = false) {
  $('contour-notice').textContent = message;
  $('contour-notice').hidden = !message;
  $('contour-notice').classList.toggle('error', error);
}
function contourDocument() { return state.documents.find(doc => doc.id === state.contourDocId); }
function activeContour() { return state.contours.find(item => item.contourId === state.activeContour); }
function contourRegionKey() { return `${state.contourDocId}:${state.contourPage}`; }
function contourRegion() { return state.contourRegions.get(contourRegionKey()); }
function selectedContours() { return state.contours.filter(item => item.included); }
function updateContourControls() {
  const disabled = !state.ready || Boolean(state.busy), doc = contourDocument(), item = activeContour();
  const hasPreview = Boolean($('contour-source-stage').querySelector('img')?.naturalWidth);
  $('contour-file').disabled = disabled || !state.documents.length;
  $('contour-page').disabled = disabled || !doc;
  $('contour-reset-region').disabled = disabled || !contourRegion();
  $('contour-extract').disabled = disabled || !doc || !hasPreview || !contourRegion();
  $('contour-extract-label').textContent = t(state.busy === 'contour-extract' ? 'contourExtracting' : 'contourExtract');
  $('contour-label').disabled = disabled || !item;
  $('contour-dimension').disabled = disabled || !item;
  $('contour-calibrate').disabled = disabled || !item || item.dimensionPoints?.length !== 2;
  $('contour-reset-calibration').disabled = disabled || !item;
  $('contour-rotate').disabled = disabled || !item;
  $('contour-source-stage').classList.toggle('disabled', disabled || !doc);
  $('contour-shape-stage').classList.toggle('disabled', disabled || !item);
  $('contour-workspace').setAttribute('aria-busy', String(Boolean(state.busy?.startsWith('contour-'))));
  const selected = selectedContours(), missing = selected.filter(part => !part.calibrated).length;
  for (const format of ['dwg', 'dxf', 'pdf']) $('contour-' + format).disabled = disabled || !selected.length || missing > 0;
  $('contour-export-status').textContent = !selected.length ? t('contourExportEmpty') : missing ? t('contourExportMissing', { count: missing }) : t('contourExportReady', { count: selected.length });
  $('contour-count').textContent = t('contourSelectedCount', { selected: selected.length, total: state.contours.length });
  $('contour-list').querySelectorAll('button,input').forEach(input => { input.disabled = disabled; });
  const region = contourRegion();
  $('contour-region-status').textContent = region ? t('contourRegionReady', { width: Math.round(region.width * 100), height: Math.round(region.height * 100) }) : t('contourRegionEmpty');
}
function syncContourSources() {
  const doc = contourDocument();
  if (!doc) { state.contourDocId = state.documents[0]?.id || null; state.contourPage = 0; }
  $('contour-file').replaceChildren(...state.documents.map(item => {
    const option = newNode('option', '', item.name); option.value = item.id; return option;
  }));
  if (state.contourDocId) $('contour-file').value = state.contourDocId;
  syncContourPages();
  if (!doc && state.contourDocId) void showContourSource();
  updateContourControls();
}
function syncContourPages() {
  const doc = contourDocument();
  $('contour-page').replaceChildren(...Array.from({ length: doc?.pageCount || 0 }, (_, page) => {
    const option = newNode('option', '', String(page + 1)); option.value = String(page); return option;
  }));
  $('contour-page').value = String(state.contourPage);
}
async function showContourSource() {
  const doc = contourDocument(), pageIndex = state.contourPage, generation = state.generation, request = ++state.contourPreviewRequest;
  state.contourDrag = null;
  const stage = $('contour-source-stage');
  stage.replaceChildren(newNode('p', 'contour-empty', t(doc ? 'contourPreviewLoading' : 'contourLoadFirst')));
  updateContourControls();
  if (!doc) return;
  try {
    doc.previews ??= { 0: doc.previewUrl };
    let url = doc.previews[pageIndex];
    if (!url) {
      const response = await rpc('preview', { documentId: doc.id, pageIndex });
      if (generation !== state.generation || request !== state.contourPreviewRequest || !state.documents.includes(doc)) return;
      if (!response.preview?.byteLength) throw new Error(t('noPreview'));
      url = doc.previews[pageIndex] = objectUrl(response.preview, 'image/png');
    }
    if (generation !== state.generation || request !== state.contourPreviewRequest) return;
    const image = new Image(); image.alt = t('contourSourceName', { name: doc.name, page: pageIndex + 1 }); image.draggable = false;
    image.addEventListener('load', () => { if (request === state.contourPreviewRequest) { drawContourRegion(); updateContourControls(); } });
    image.src = url; stage.replaceChildren(image); drawContourRegion();
  } catch (error) {
    if (generation === state.generation && request === state.contourPreviewRequest) {
      stage.replaceChildren(newNode('p', 'contour-empty', t('noPreview')));
      contourNotice(t('contourLoadingFailed', { error: errorText(error) }), true);
    }
  }
  updateContourControls();
}
function drawContourRegion() {
  const stage = $('contour-source-stage'); stage.querySelector('.contour-region-overlay')?.remove();
  const image = stage.querySelector('img'), region = state.contourDrag?.region || contourRegion();
  if (!image?.naturalWidth || !region) return;
  const rect = image.getBoundingClientRect(), outer = stage.getBoundingClientRect();
  const overlay = document.createElementNS(SVG_NS, 'svg'); overlay.classList.add('contour-region-overlay'); overlay.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('viewBox', '0 0 1000 1000'); overlay.setAttribute('preserveAspectRatio', 'none');
  overlay.style.left = `${rect.left - outer.left}px`; overlay.style.top = `${rect.top - outer.top}px`; overlay.style.width = `${rect.width}px`; overlay.style.height = `${rect.height}px`;
  const area = document.createElementNS(SVG_NS, 'rect');
  for (const [key, value] of Object.entries({ x: region.x * 1000, y: region.y * 1000, width: region.width * 1000, height: region.height * 1000, fill: '#208b6430', stroke: '#16885e', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' })) area.setAttribute(key, String(value));
  overlay.append(area); stage.append(overlay);
}
function sourcePointer(event, clamp = false) {
  const image = $('contour-source-stage').querySelector('img'); if (!image?.naturalWidth) return null;
  const rect = image.getBoundingClientRect(); if (!rect.width || !rect.height) return null;
  let x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height;
  if (!clamp && (x < 0 || y < 0 || x > 1 || y > 1)) return null;
  return [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))];
}
function setContourDrag(event) {
  const drag = state.contourDrag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  const point = sourcePointer(event, true); if (!point) return;
  drag.region = { x: Math.min(drag.start[0], point[0]), y: Math.min(drag.start[1], point[1]), width: Math.abs(point[0] - drag.start[0]), height: Math.abs(point[1] - drag.start[1]) };
  drawContourRegion();
}
async function extractSelectedContour() {
  if (state.busy || !state.ready || !contourRegion() || !contourDocument()) return;
  const threshold = Number($('threshold').value);
  if (!Number.isInteger(threshold) || threshold < 40 || threshold > 240) { contourNotice(t('invalidThreshold'), true); return; }
  const generation = state.generation, docId = state.contourDocId, pageIndex = state.contourPage;
  const region = { ...contourRegion() };
  setBusy('contour-extract'); contourNotice(t('contourExtracting'));
  try {
    const result = await rpc('extractContour', { docId, pageIndex, region, threshold, dpi: Number($('dpi').value) });
    if (generation !== state.generation) return;
    if (!result?.contourId || !Array.isArray(result.pointsMm) || result.pointsMm.length < 3) throw new Error(t('engineEmpty'));
    const item = { ...result, label: safeName(result.sourceName || contourDocument()?.name || 'part'), included: true, dimensionPoints: [], dimensionValue: '', calibrated: false };
    state.contours.push(item); state.activeContour = item.contourId;
    renderContourCollection(); renderActiveContour();
    contourNotice(t('contourExtractSuccess'));
    $('contour-shape-stage').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) { if (generation === state.generation) contourNotice(t('contourError', { error: errorText(error) }), true); }
  finally { if (generation === state.generation) setBusy(''); }
}
function svgElement(tag, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}
function contourSvg(item, miniature = false) {
  const points = item.pointsMm;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const point of points) { minX = Math.min(minX, point[0]); maxX = Math.max(maxX, point[0]); minY = Math.min(minY, point[1]); maxY = Math.max(maxY, point[1]); }
  const span = Math.max(maxX - minX, maxY - minY, 0.001), padding = span * 0.13;
  const svg = svgElement('svg', { viewBox: `${minX - padding} ${-maxY - padding} ${Math.max(maxX - minX, 0.001) + padding * 2} ${Math.max(maxY - minY, 0.001) + padding * 2}`, preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': item.label });
  const path = svgElement('path', { d: points.map((point, i) => `${i ? 'L' : 'M'}${point[0]},${-point[1]}`).join(' ') + 'Z', fill: miniature ? 'none' : '#f6faf8', stroke: miniature ? '#457c6a' : '#243c34', 'stroke-width': miniature ? 1.4 : 1.7, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' });
  svg.append(path);
  if (!miniature) {
    svg.id = 'contour-shape-svg';
    const selected = item.dimensionPoints || [];
    if (selected.length === 2) svg.append(svgElement('line', { x1: selected[0][0], y1: -selected[0][1], x2: selected[1][0], y2: -selected[1][1], stroke: '#246ae7', 'stroke-width': 1.5, 'stroke-dasharray': '5 3', 'vector-effect': 'non-scaling-stroke' }));
    selected.forEach((point, index) => {
      svg.append(svgElement('circle', { cx: point[0], cy: -point[1], r: span * .012, fill: index ? '#16885e' : '#246ae7', stroke: '#fff', 'stroke-width': 1.5, 'vector-effect': 'non-scaling-stroke' }));
      const label = svgElement('text', { x: point[0] + span * .024, y: -point[1] - span * .018, fill: '#246ae7', 'font-size': span * .05, 'font-family': 'Arial, sans-serif', 'font-weight': 600 }); label.textContent = index ? 'B' : 'A'; svg.append(label);
    });
  }
  return svg;
}
function renderActiveContour() {
  const item = activeContour(), stage = $('contour-shape-stage');
  stage.replaceChildren(item ? contourSvg(item) : newNode('p', 'contour-empty', t('contourExtractFirst')));
  $('contour-label').value = item?.label || '';
  $('contour-dimension').value = item?.dimensionValue ?? '';
  updateContourMeasurement(); updateContourControls();
}
function updateContourMeasurement() {
  const item = activeContour(), points = item?.dimensionPoints || [];
  const distance = points.length === 2 ? Math.hypot(points[1][0] - points[0][0], points[1][1] - points[0][1]) : null;
  $('contour-measurement').textContent = !points.length ? t('contourNoPoints') : t('contourPointCount', { count: points.length, distance: distance === null ? '' : t('contourMeasured', { value: contourNumber(distance) }) });
  const calibration = item?.calibration;
  $('contour-calibration-status').textContent = item?.calibrated ? t('contourCalibrationDone', { value: contourNumber(calibration?.valueMm ?? item.dimensionValue), measurement: contourNumber(item.measurementMm ?? calibration?.measurementMm ?? distance), scale: contourNumber(item.scale) }) : t(item ? 'contourUncalibrated' : 'contourNeedsCalibration');
  $('contour-calibration-status').classList.toggle('verified', Boolean(item?.calibrated));
}
function renderContourCollection() {
  const list = $('contour-list'); list.replaceChildren();
  if (!state.contours.length) list.append(newNode('p', 'contour-empty', t('contourCollectionEmpty')));
  for (const item of state.contours) {
    const row = newNode('div', 'contour-item'); row.classList.toggle('active', item.contourId === state.activeContour);
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = item.included; checkbox.setAttribute('aria-label', t('contourInclude', { name: item.label })); checkbox.addEventListener('change', () => { item.included = checkbox.checked; updateContourControls(); });
    const thumb = newNode('button', 'contour-thumbnail'); thumb.type = 'button'; thumb.setAttribute('aria-label', `${t('contourEdit')}: ${item.label}`); thumb.append(contourSvg(item, true));
    const copy = newNode('div', 'contour-item-copy'); copy.append(newNode('strong', '', item.label));
    copy.append(newNode('span', '', t('contourSourceName', { name: item.sourceName || '', page: (item.pageIndex || 0) + 1 })));
    copy.append(newNode('span', '', t('contourSize', { width: contourNumber(item.widthMm), height: contourNumber(item.heightMm) })));
    const badge = newNode('span', `contour-item-status${item.calibrated ? ' verified' : ''}`, t(item.calibrated ? 'contourCalibrated' : 'contourUncalibrated'));
    const actions = newNode('div', 'contour-item-actions');
    const edit = newNode('button', 'text-button', t('contourEdit')); edit.type = 'button';
    const selectItem = () => { if (state.busy) return; state.activeContour = item.contourId; renderActiveContour(); renderContourCollection(); contourNotice(''); };
    thumb.addEventListener('click', selectItem); edit.addEventListener('click', selectItem);
    const remove = newNode('button', 'text-button contour-remove', t('contourRemove')); remove.type = 'button'; remove.addEventListener('click', () => { void removeContour(item); });
    actions.append(edit, remove); row.append(checkbox, thumb, copy, badge, actions); list.append(row);
  }
  const item = activeContour();
  if (item?.warnings?.length) {
    const warnings = newNode('p', 'contour-item-warnings', item.warnings.join(' · ')); list.append(warnings);
  }
  updateContourControls();
}
function snapContourPoint(event) {
  const item = activeContour(), svg = $('contour-shape-svg'); if (!item || !svg) return null;
  const transform = svg.getScreenCTM(); if (!transform) return null;
  const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
  const point = [local.x, -local.y], points = item.pointsMm;
  const screenDistance = candidate => { const pixel = new DOMPoint(candidate[0], -candidate[1]).matrixTransform(transform); return Math.hypot(pixel.x - event.clientX, pixel.y - event.clientY); };
  let nearestVertex = null, vertexDistance = Infinity, nearestEdge = null, edgeDistance = Infinity;
  for (let index = 0; index < points.length; index++) {
    const a = points[index], b = points[(index + 1) % points.length], vertex = screenDistance(a);
    if (vertex < vertexDistance) { nearestVertex = a; vertexDistance = vertex; }
    const dx = b[0] - a[0], dy = b[1] - a[1], lengthSquared = dx * dx + dy * dy;
    const amount = lengthSquared ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lengthSquared)) : 0;
    const projection = [a[0] + amount * dx, a[1] + amount * dy], distance = screenDistance(projection);
    if (distance < edgeDistance) { nearestEdge = projection; edgeDistance = distance; }
  }
  return vertexDistance <= 8 ? [...nearestVertex] : edgeDistance <= (event.pointerType === 'touch' ? 22 : 14) ? nearestEdge : null;
}
async function applyContourCalibration() {
  const item = activeContour(); if (!item || state.busy || !state.ready) return;
  const valueMm = Number($('contour-dimension').value), points = item.dimensionPoints || [];
  const distance = points.length === 2 ? Math.hypot(points[1][0] - points[0][0], points[1][1] - points[0][1]) : 0;
  if (!Number.isFinite(valueMm) || valueMm <= 0 || distance < 0.001 || valueMm / distance > 1000) { contourNotice(t('contourInvalidCalibration'), true); return; }
  const generation = state.generation; setBusy('contour-calibrate'); contourNotice('');
  try {
    const result = await rpc('calibrateContour', { contourId: item.contourId, point1: points[0], point2: points[1], valueMm });
    if (generation !== state.generation || !state.contours.includes(item)) return;
    const factor = valueMm / distance;
    Object.assign(item, result, { dimensionValue: valueMm, dimensionPoints: points.map(point => point.map(value => value * factor)), calibrated: true });
    renderActiveContour(); renderContourCollection();
  } catch (error) { if (generation === state.generation) contourNotice(t('contourError', { error: errorText(error) }), true); }
  finally { if (generation === state.generation) setBusy(''); }
}
async function resetContourCalibration() {
  const item = activeContour(); if (!item || state.busy || !state.ready) return;
  const generation = state.generation; setBusy('contour-reset');
  try {
    const result = await rpc('resetContourCalibration', { contourId: item.contourId });
    if (generation !== state.generation || !state.contours.includes(item)) return;
    Object.assign(item, result, { dimensionPoints: [], dimensionValue: '', calibrated: false });
    renderActiveContour(); renderContourCollection(); contourNotice(t('contourCalibrationReset'));
  } catch (error) { if (generation === state.generation) contourNotice(t('contourError', { error: errorText(error) }), true); }
  finally { if (generation === state.generation) setBusy(''); }
}
async function rotateActiveContour() {
  const item = activeContour(); if (!item || state.busy || !state.ready) return;
  const generation = state.generation; setBusy('contour-rotate');
  try {
    const result = await rpc('rotateContour', { contourId: item.contourId });
    if (generation !== state.generation || !state.contours.includes(item)) return;
    // A rotation preserves dimensions; unsaved endpoint edits still require calibration.
    const calibrated = item.calibrated;
    Object.assign(item, result, { dimensionPoints: [], calibrated: calibrated && result.calibrated });
    renderActiveContour(); renderContourCollection(); contourNotice('');
  } catch (error) { if (generation === state.generation) contourNotice(t('contourError', { error: errorText(error) }), true); }
  finally { if (generation === state.generation) setBusy(''); }
}
async function removeContour(item) {
  if (state.busy || !state.ready) return;
  const generation = state.generation; setBusy('contour-remove');
  try {
    await rpc('removeContour', { contourId: item.contourId });
    if (generation !== state.generation) return;
    state.contours = state.contours.filter(part => part !== item);
    if (state.activeContour === item.contourId) state.activeContour = state.contours[0]?.contourId || null;
    renderActiveContour(); renderContourCollection(); contourNotice('');
  } catch (error) { if (generation === state.generation) contourNotice(t('contourError', { error: errorText(error) }), true); }
  finally { if (generation === state.generation) setBusy(''); }
}
async function exportContourCollection(format) {
  const selected = selectedContours(); if (state.busy || !state.ready || !selected.length) return;
  if (selected.some(item => !item.calibrated)) { updateContourControls(); return; }
  const generation = state.generation; setBusy('contour-export'); contourNotice(t('contourExporting', { format: format.toUpperCase() }));
  try {
    const result = await rpc('exportContours', { items: selected.map(item => ({ contourId: item.contourId, label: item.label })), format, language });
    if (generation !== state.generation) return;
    if (!result.bytes?.byteLength) throw new Error(t('engineEmpty'));
    const url = objectUrl(result.bytes, result.mime || (format === 'pdf' ? 'application/pdf' : 'application/octet-stream'));
    const link = document.createElement('a'); link.href = url; link.download = result.filename || `part-contours.${format}`; document.body.append(link); link.click(); link.remove();
    setTimeout(() => revoke(url), 30_000);
    contourNotice(t('contourExported', { count: result.count ?? selected.length, format: format.toUpperCase() }));
  } catch (error) { if (generation === state.generation) contourNotice(t('contourError', { error: errorText(error) }), true); }
  finally { if (generation === state.generation) setBusy(''); }
}
function resetContourUi() {
  state.contours = []; state.activeContour = null; state.contourDocId = null; state.contourPage = 0; state.contourRegions.clear(); state.contourPreviewRequest++; state.contourDrag = null;
  $('contour-source-stage').replaceChildren(newNode('p', 'contour-empty', t('contourLoadFirst')));
  $('contour-shape-stage').replaceChildren(newNode('p', 'contour-empty', t('contourExtractFirst')));
  $('contour-label').value = ''; $('contour-dimension').value = ''; contourNotice('');
  renderContourCollection(); updateContourMeasurement();
}
$('contour-file').addEventListener('change', event => { if (state.busy) return; state.contourDocId = event.target.value; state.contourPage = 0; syncContourPages(); void showContourSource(); });
$('contour-page').addEventListener('change', event => { if (state.busy) return; state.contourPage = Number(event.target.value); void showContourSource(); });
$('contour-reset-region').addEventListener('click', () => { if (state.busy) return; state.contourRegions.delete(contourRegionKey()); drawContourRegion(); updateContourControls(); });
$('contour-source-stage').addEventListener('pointerdown', event => {
  if (state.busy || !state.ready || event.button !== 0) return;
  const start = sourcePointer(event); if (!start) return;
  event.preventDefault(); state.contourDrag = { start, pointerId: event.pointerId, key: contourRegionKey(), region: { x: start[0], y: start[1], width: 0, height: 0 } };
  $('contour-source-stage').setPointerCapture(event.pointerId); drawContourRegion();
});
$('contour-source-stage').addEventListener('pointermove', event => { if (state.contourDrag) { event.preventDefault(); setContourDrag(event); } });
$('contour-source-stage').addEventListener('pointerup', event => {
  const drag = state.contourDrag; if (!drag || drag.pointerId !== event.pointerId) return;
  setContourDrag(event); state.contourDrag = null;
  if ($('contour-source-stage').hasPointerCapture(event.pointerId)) $('contour-source-stage').releasePointerCapture(event.pointerId);
  if (drag.region.width >= 0.005 && drag.region.height >= 0.005) { state.contourRegions.set(drag.key, drag.region); contourNotice(''); }
  else contourNotice(t('contourRegionSmall'), true);
  drawContourRegion(); updateContourControls();
});
$('contour-source-stage').addEventListener('pointercancel', () => { state.contourDrag = null; drawContourRegion(); updateContourControls(); });
$('contour-shape-stage').addEventListener('pointerup', event => {
  const item = activeContour(); if (!item || state.busy || !state.ready || event.button !== 0) return;
  const point = snapContourPoint(event);
  if (!point) { contourNotice(t('contourClickNear'), true); return; }
  if (item.dimensionPoints.length >= 2) item.dimensionPoints = [];
  item.dimensionPoints.push(point); item.calibrated = false;
  renderActiveContour(); renderContourCollection(); contourNotice('');
});
$('contour-label').addEventListener('input', event => { const item = activeContour(); if (!item || state.busy) return; item.label = event.target.value.trim() || safeName(item.sourceName || 'part'); $('contour-shape-svg')?.setAttribute('aria-label', item.label); renderContourCollection(); });
$('contour-dimension').addEventListener('input', event => { const item = activeContour(); if (!item || state.busy) return; item.dimensionValue = event.target.value; item.calibrated = false; updateContourMeasurement(); renderContourCollection(); });
$('contour-rotate').addEventListener('click', () => { void rotateActiveContour(); });
$('contour-extract').addEventListener('click', () => { void extractSelectedContour(); });
$('contour-calibrate').addEventListener('click', () => { void applyContourCalibration(); });
$('contour-reset-calibration').addEventListener('click', () => { void resetContourCalibration(); });
for (const format of ['dwg', 'dxf', 'pdf']) $('contour-' + format).addEventListener('click', () => { void exportContourCollection(format); });
new ResizeObserver(drawContourRegion).observe($('contour-source-stage'));

$('file-input').addEventListener('change', event => { void loadFiles([...event.target.files]); });
$('dropzone').addEventListener('click', () => { if (state.ready && !state.busy) $('file-input').click(); });
$('dropzone').addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (state.ready && !state.busy) $('file-input').click(); } });
for (const name of ['dragenter', 'dragover']) $('dropzone').addEventListener(name, event => { event.preventDefault(); if (state.ready && !state.busy) $('dropzone').classList.add('dragover'); });
for (const name of ['dragleave', 'drop']) $('dropzone').addEventListener(name, event => { event.preventDefault(); $('dropzone').classList.remove('dragover'); });
$('dropzone').addEventListener('drop', event => { void loadFiles([...event.dataTransfer.files]); });
// Prevent dropped drawings outside the target from navigating away from the tab.
window.addEventListener('dragover', event => event.preventDefault()); window.addEventListener('drop', event => event.preventDefault());
$('convert-button').addEventListener('click', () => { void convert(); });
$('outline-button').addEventListener('click', () => { void convert({ outline: true }); });
$('clear-button').addEventListener('click', () => {
  if (state.busy) return;
  state.generation++; state.worker?.terminate(); rejectPending('Session cleared');
  resetUi(); setBusy(''); notice(t('clearDone')); startWorker();
});
$('cancel-button').addEventListener('click', () => {
  state.generation++; state.worker?.terminate(); rejectPending('Conversion cancelled'); resetUi(); setBusy(''); notice(t('clearDone')); startWorker();
});
$('dwg-download').addEventListener('click', () => downloadArchive('dwg'));
$('dxf-download').addEventListener('click', () => downloadArchive('dxf'));
$('zip-download').addEventListener('click', () => downloadArchive('both'));
$('calibration-file').addEventListener('change', event => { const doc = state.documents.find(item => item.id === event.target.value); if (doc && !state.busy) void selectDocument(doc); });
$('calibration-page').addEventListener('change', event => { const doc = selectedDocument(); if (doc && !state.busy) void selectDocument(doc, Number(event.target.value)); });
$('show-source').addEventListener('click', () => { const doc = selectedDocument(); if (doc && !state.busy) void selectDocument(doc, state.selectedPage); });
$('preview-area').addEventListener('click', event => {
  if (state.busy || !state.previewContext) return;
  const image = $('preview-area').querySelector('img'); if (!image?.complete || !image.naturalWidth) return;
  const rect = image.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height;
  if (x < 0 || x > 1 || y < 0 || y > 1) return;
  const record = currentMeasurement(true); if (!record) return;
  if (record.points.length >= 2) record.points = [];
  record.points.push([x, y]); delete record.calibration;
  clearResults(); updateCalibrationControls(); drawCalibrationOverlay();
});
$('dimension-value').addEventListener('input', event => {
  const record = currentMeasurement(true); if (!record) return;
  record.valueMm = Number(event.target.value); delete record.calibration;
  clearResults(); updateCalibrationControls();
});
$('reset-points').addEventListener('click', () => {
  if (state.busy) return;
  const record = currentMeasurement(true); if (!record) return;
  record.points = []; delete record.calibration; clearResults(); updateCalibrationControls(); drawCalibrationOverlay();
  const doc = selectedDocument(); if (doc && !state.previewContext) void selectDocument(doc, state.selectedPage);
});
$('calibrate-button').addEventListener('click', () => {
  if (state.busy) return;
  const record = currentMeasurement(), doc = selectedDocument(), page = doc?.pages?.[state.selectedPage];
  const valueMm = Number($('dimension-value').value), points = record?.points || [];
  const distance = points.length === 2 ? Math.hypot((points[1][0] - points[0][0]) * page?.widthMm, (points[1][1] - points[0][1]) * page?.heightMm) : 0;
  if (!Number.isFinite(valueMm) || valueMm <= 0 || !Number.isFinite(distance) || distance < 0.001 || valueMm / distance > 1000) { notice(t('calibrationInvalid'), true); return; }
  record.valueMm = valueMm;
  record.calibration = { pointA: [...points[0]], pointB: [...points[1]], valueMm, scale: valueMm / distance };
  clearResults(); notice(''); updateCalibrationControls(); drawCalibrationOverlay();
});
new ResizeObserver(drawCalibrationOverlay).observe($('preview-area'));
window.addEventListener('pagehide', () => { state.generation++; state.worker?.terminate(); rejectPending('Page closed'); resetUi(); state.ready = false; state.busy = ''; });
window.addEventListener('pageshow', event => { if (event.persisted) { notice(''); startWorker(); } });
// No server endpoints, cookies, browser storage, job URL parameters, or history.
startWorker();

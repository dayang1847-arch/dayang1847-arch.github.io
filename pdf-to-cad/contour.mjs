// SPDX-License-Identifier: AGPL-3.0-or-later
// User-selected, local bitmap silhouette extraction. No convex hull or OCR.
import { DxfWriter, Units, point3d } from '@tarikjabiri/dxf';

function finitePositive(value, name) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name}必须大于 0`);
  return value;
}

function morphology(input, width, height, radius, dilate) {
  if (!radius) return input.slice();
  const temp = new Uint8Array(input.length), out = new Uint8Array(input.length);
  const size = radius * 2 + 1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let count = 0;
    for (let x = -radius; x < width; x++) {
      if (x + radius < width) count += input[row + x + radius];
      if (x - radius - 1 >= 0) count -= input[row + x - radius - 1];
      if (x >= 0) temp[row + x] = dilate ? Number(count > 0) : Number(count === size);
    }
  }
  for (let x = 0; x < width; x++) {
    let count = 0;
    for (let y = -radius; y < height; y++) {
      if (y + radius < height) count += temp[(y + radius) * width + x];
      if (y - radius - 1 >= 0) count -= temp[(y - radius - 1) * width + x];
      if (y >= 0) out[y * width + x] = dilate ? Number(count > 0) : Number(count === size);
    }
  }
  return out;
}

function exterior(mask, width, height) {
  const seen = new Uint8Array(mask.length), queue = new Int32Array(mask.length);
  let head = 0, tail = 0;
  function seed(i) { if (!mask[i] && !seen[i]) { seen[i] = 1; queue[tail++] = i; } }
  for (let x = 0; x < width; x++) { seed(x); seed((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { seed(y * width); seed(y * width + width - 1); }
  while (head < tail) {
    const i = queue[head++], x = i % width;
    if (x) seed(i - 1);
    if (x + 1 < width) seed(i + 1);
    if (i >= width) seed(i - width);
    if (i + width < mask.length) seed(i + width);
  }
  return seen;
}

function components(mask, width, height) {
  const labels = new Int32Array(mask.length), queue = new Int32Array(mask.length), found = [];
  let id = 0;
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || labels[start]) continue;
    id++;
    let head = 0, tail = 1, minX = width, minY = height, maxX = -1, maxY = -1;
    queue[0] = start; labels[start] = id;
    while (head < tail) {
      const i = queue[head++], x = i % width, y = Math.floor(i / width);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      for (const next of [x ? i - 1 : -1, x + 1 < width ? i + 1 : -1, y ? i - width : -1, y + 1 < height ? i + width : -1]) {
        if (next >= 0 && mask[next] && !labels[next]) { labels[next] = id; queue[tail++] = next; }
      }
    }
    found.push({ id, area: tail, minX, minY, maxX, maxY });
  }
  found.sort((a, b) => b.area - a.area);
  return { labels, found };
}

function area(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return sum / 2;
}

// Trace the outside edge of the filled component, rather than tracing both
// sides of the source scan's line width. Interior lines and holes are absent.
function boundary(mask, width, height) {
  const stride = width + 1, edges = new Map();
  let edgeCount = 0;
  function add(a, b) { if (!edges.has(a)) edges.set(a, []); edges.get(a).push(b); edgeCount++; }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x;
    if (!mask[i]) continue;
    const a = y * stride + x, b = a + 1, d = a + stride, c = d + 1;
    if (!y || !mask[i - width]) add(a, b);
    if (x + 1 === width || !mask[i + 1]) add(b, c);
    if (y + 1 === height || !mask[i + width]) add(c, d);
    if (!x || !mask[i - 1]) add(d, a);
  }
  if (edgeCount > 1500000) throw new Error('轮廓过于复杂，请缩小框选范围或降低分辨率');
  const loops = [];
  while (edges.size) {
    const first = edges.keys().next().value;
    const loop = [];
    let current = first, previous = null, steps = 0;
    do {
      loop.push([current % stride, Math.floor(current / stride)]);
      const choices = edges.get(current);
      if (!choices?.length) throw new Error('轮廓未能闭合，请重新框选完整灯杯');
      let index = 0;
      if (choices.length > 1 && previous !== null) {
        const incoming = current - previous;
        // Keep filled pixels on the right at diagonal contacts.
        const right = incoming === 1 ? stride : incoming === stride ? -1 : incoming === -1 ? -stride : 1;
        const preferred = choices.findIndex(next => next - current === right);
        if (preferred >= 0) index = preferred;
      }
      const next = choices.splice(index, 1)[0];
      if (!choices.length) edges.delete(current);
      previous = current; current = next;
      if (++steps > edgeCount + 1) throw new Error('轮廓追踪失败，请重新选择零件区域');
    } while (current !== first);
    if (loop.length >= 4) loops.push(loop);
  }
  loops.sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
  if (!loops.length) throw new Error('没有找到闭合外边界');
  return loops[0];
}

function segmentDistanceSquared(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = dx || dy ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy))) : 0;
  return (p[0] - a[0] - t * dx) ** 2 + (p[1] - a[1] - t * dy) ** 2;
}

function simplifyOpen(points, tolerance) {
  const keep = new Uint8Array(points.length), stack = [[0, points.length - 1]];
  keep[0] = keep[points.length - 1] = 1;
  while (stack.length) {
    const [start, end] = stack.pop();
    let max = tolerance ** 2, split = -1;
    for (let i = start + 1; i < end; i++) {
      const distance = segmentDistanceSquared(points[i], points[start], points[end]);
      if (distance > max) { max = distance; split = i; }
    }
    if (split >= 0) { keep[split] = 1; stack.push([start, split], [split, end]); }
  }
  return points.filter((_, i) => keep[i]);
}

function simplifyClosed(points, tolerance) {
  let farthest = 1, max = 0;
  for (let i = 1; i < points.length; i++) {
    const d = (points[i][0] - points[0][0]) ** 2 + (points[i][1] - points[0][1]) ** 2;
    if (d > max) { max = d; farthest = i; }
  }
  const first = simplifyOpen(points.slice(0, farthest + 1), tolerance);
  const second = simplifyOpen([...points.slice(farthest), points[0]], tolerance);
  return [...first.slice(0, -1), ...second.slice(0, -1)];
}

export function contourPreviewSvg(pointsMm, widthMm, heightMm) {
  const padding = Math.max(widthMm, heightMm) * 0.04;
  const coords = pointsMm.map(([x, y]) => `${x.toFixed(5)},${(heightMm - y).toFixed(5)}`).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-padding} ${-padding} ${widthMm + padding * 2} ${heightMm + padding * 2}"><polyline points="${coords}" fill="none" stroke="#e76f2e" stroke-width="${Math.max(widthMm, heightMm) / 350}" stroke-linejoin="round"/></svg>`;
}

export function extractContour({ rgba, width, height, region, pageWidthMm, pageHeightMm, scale = 1, threshold = 160 }) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 4 || height < 4 || width * height > 40000000) throw new Error('位图尺寸无效或过大');
  if (!rgba || rgba.length !== width * height * 4) throw new Error('需要完整的 RGBA 位图数据');
  finitePositive(pageWidthMm, '页面宽度'); finitePositive(pageHeightMm, '页面高度'); finitePositive(scale, '尺寸比例');
  if (!Number.isFinite(threshold) || threshold < 1 || threshold > 254) throw new Error('黑白阈值应为 1 至 254');
  if (!region || ![region.x, region.y, region.width, region.height].every(Number.isFinite) || region.x < 0 || region.y < 0 || region.width <= 0 || region.height <= 0 || region.x + region.width > 1.000001 || region.y + region.height > 1.000001) throw new Error('请在预览图内框选一个完整灯杯');
  const left = Math.floor(region.x * width), top = Math.floor(region.y * height);
  const cropWidth = Math.min(width, Math.ceil((region.x + region.width) * width)) - left;
  const cropHeight = Math.min(height, Math.ceil((region.y + region.height) * height)) - top;
  if (cropWidth < 16 || cropHeight < 16) throw new Error('框选范围太小，请放大或重新框选完整零件');
  if (cropWidth * cropHeight > 4000000) throw new Error('框选超过 400 万像素，请只选择一个零件或降低分辨率');
  const repairRadius = Math.max(1, Math.min(3, Math.round(Math.min(cropWidth, cropHeight) / 260)));
  const cleanupRadius = Math.max(1, Math.min(3, Math.round(Math.min(cropWidth, cropHeight) / 180)));
  const pad = repairRadius + cleanupRadius + 3, w = cropWidth + pad * 2, h = cropHeight + pad * 2;
  const ink = new Uint8Array(w * h);
  for (let y = 0; y < cropHeight; y++) for (let x = 0; x < cropWidth; x++) {
    const i = ((y + top) * width + x + left) * 4;
    const alpha = rgba[i + 3] / 255;
    const gray = (rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114) * alpha + 255 * (1 - alpha);
    ink[(y + pad) * w + x + pad] = Number(gray < threshold);
  }
  const closed = morphology(morphology(ink, w, h, repairRadius, true), w, h, repairRadius, false);
  const outside = exterior(closed, w, h), filled = new Uint8Array(closed.length);
  for (let i = 0; i < filled.length; i++) filled[i] = Number(!outside[i]);
  const cleaned = morphology(morphology(filled, w, h, cleanupRadius, false), w, h, cleanupRadius, true);
  const { labels, found } = components(cleaned, w, h);
  const main = found[0];
  if (!main || main.area < 150) throw new Error('没有找到完整封闭的零件轮廓；请避开文字并重新框选');
  if (found[1]?.area > main.area * 0.4) throw new Error('选区包含多个较大的封闭图形，请只框选一个灯杯视图');
  if (main.minX <= pad + 1 || main.minY <= pad + 1 || main.maxX >= pad + cropWidth - 2 || main.maxY >= pad + cropHeight - 2) throw new Error('零件或尺寸线触及框选边缘，请给完整零件留少量白边并避开尺寸标注');
  const selected = new Uint8Array(cleaned.length);
  let enclosedPixels = 0;
  for (let i = 0; i < selected.length; i++) if (labels[i] === main.id) {
    selected[i] = 1;
    if (!closed[i]) enclosedPixels++;
  }
  const enclosedFraction = enclosedPixels / main.area;
  if (enclosedFraction < 0.18) throw new Error('检测到的主要是细线或未闭合线段，请框选完整闭合的零件外形');
  const mainOutside = exterior(selected, w, h);
  for (let i = 0; i < selected.length; i++) selected[i] = Number(!mainOutside[i]);
  const raw = boundary(selected, w, h), simplified = simplifyClosed(raw, 0.65);
  if (simplified.length < 4 || simplified.length > 20000) throw new Error('无法得到稳定的主轮廓，请重新框选或调整黑白阈值');
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of simplified) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  const bboxArea = (maxX - minX) * (maxY - minY);
  if (region.width * region.height > 0.25 && main.area / bboxArea > 0.96) throw new Error('选区主体像图框或大矩形，请缩小到灯杯零件本身');
  const pixelMmX = pageWidthMm / width * scale, pixelMmY = pageHeightMm / height * scale;
  const pointsMm = simplified.map(([x, y]) => [(x - minX) * pixelMmX, (maxY - y) * pixelMmY]);
  pointsMm.push([...pointsMm[0]]);
  const widthMm = (maxX - minX) * pixelMmX, heightMm = (maxY - minY) * pixelMmY;
  const warnings = ['提取的是框选区域的单一主外边界，内部线和孔已忽略；请在预览中核对台阶、凹形和尺寸。', '与外形连成封闭区域的尺寸辅助线无法可靠自动区分；若预览带入标注，请缩小或重新框选。'];
  if (repairRadius) warnings.push(`已在 ${repairRadius} 像素范围闭合小断口，并清理 ${cleanupRadius} 像素宽的细线；细小结构可能需要人工校正。`);
  return {
    pointsMm, widthMm, heightMm, scale,
    boundsNormalized: { x: (left + minX - pad) / width, y: (top + minY - pad) / height, width: (maxX - minX) / width, height: (maxY - minY) / height },
    regionNormalized: { ...region },
    previewSvg: contourPreviewSvg(pointsMm, widthMm, heightMm),
    quality: { status: 'review', componentAreaPx: main.area, enclosedFraction, repairRadiusPixels: repairRadius, cleanupRadiusPixels: cleanupRadius, discardedComponents: found.length - 1, rawBoundaryPoints: raw.length, outputSegments: pointsMm.length - 1, nominalCleanupRangeMm: (repairRadius + cleanupRadius + 0.65) * Math.max(pixelMmX, pixelMmY), cleanupRangeNote: '仅说明局部像素处理范围，不是对真实零件或长细特征的严格误差上界。', pixelSizeMm: { x: pixelMmX, y: pixelMmY } },
    warnings,
  };
}

/** Place multiple silhouettes on one millimetre drawing; translate, never scale. */
export function exportContoursDxf(items) {
  if (!Array.isArray(items) || !items.length || items.length > 100) throw new Error('请先提取 1 至 100 个零件外轮廓');
  const prepared = items.map((item, index) => {
    if (!Array.isArray(item.pointsMm) || item.pointsMm.length < 4 || item.pointsMm.length > 20001 || item.pointsMm.some(p => !Array.isArray(p) || p.length !== 2 || p.some(v => !Number.isFinite(v)))) throw new Error(`第 ${index + 1} 个零件的轮廓坐标无效`);
    const xs = item.pointsMm.map(p => p[0]), ys = item.pointsMm.map(p => p[1]);
    const minX = Math.min(...xs), minY = Math.min(...ys), widthMm = Math.max(...xs) - minX, heightMm = Math.max(...ys) - minY;
    finitePositive(widthMm, '轮廓宽度'); finitePositive(heightMm, '轮廓高度');
    for (const [actual, stated] of [[widthMm, item.widthMm], [heightMm, item.heightMm]]) if (stated !== undefined && Math.abs(actual - stated) > Math.max(1, actual) * 1e-5) throw new Error('轮廓坐标与宽高不一致；合并不会自动缩放零件');
    const pointsMm = item.pointsMm.map(([x, y]) => [x - minX, y - minY]);
    if (pointsMm.at(-1)[0] !== pointsMm[0][0] || pointsMm.at(-1)[1] !== pointsMm[0][1]) pointsMm.push([...pointsMm[0]]);
    return { ...item, pointsMm, widthMm, heightMm, label: String(item.label || `Part ${index + 1}`).replace(/[\r\n\x00-\x1f]/g, ' ').slice(0, 100) };
  });
  const writer = new DxfWriter(); writer.setUnits(Units.Millimeters);
  writer.addLayer('PART_OUTLINES', 7); writer.addLayer('PART_LABELS', 3);
  const columns = Math.ceil(Math.sqrt(prepared.length)), rows = Math.ceil(prepared.length / columns);
  const gap = 20, labelHeight = 3.5, labelSpace = 13;
  const cellWidth = Math.max(...prepared.map(p => p.widthMm)) + gap;
  const cellHeight = Math.max(...prepared.map(p => p.heightMm)) + gap + labelSpace;
  const placements = [];
  let entityCount = 0;
  prepared.forEach((item, index) => {
    const xMm = index % columns * cellWidth, yMm = (rows - 1 - Math.floor(index / columns)) * cellHeight + labelSpace;
    for (let i = 1; i < item.pointsMm.length; i++) {
      const a = item.pointsMm[i - 1], b = item.pointsMm[i];
      if (a[0] === b[0] && a[1] === b[1]) continue;
      writer.addLine(point3d(a[0] + xMm, a[1] + yMm), point3d(b[0] + xMm, b[1] + yMm), { layerName: 'PART_OUTLINES' });
      entityCount++;
    }
    const title = item.label.slice(0, 32);
    const labelWidth = Math.min(cellWidth - 4, Math.max(item.widthMm, 25));
    writer.addText(point3d(xMm, yMm - 6), labelHeight, title, { layerName: 'PART_LABELS', relativeXScaleFactor: Math.min(1, labelWidth / Math.max(1, Array.from(title).length * labelHeight * 0.65)) }); entityCount++;
    const status = item.calibrated ? 'REFERENCE CALIBRATED / mm' : 'SIZE UNVERIFIED / mm';
    writer.addText(point3d(xMm, yMm - 10), 2.2, status, { layerName: 'PART_LABELS', relativeXScaleFactor: Math.min(1, labelWidth / (status.length * 2.2 * 0.65)) }); entityCount++;
    placements.push({ index, label: item.label, xMm, yMm, widthMm: item.widthMm, heightMm: item.heightMm, calibrated: Boolean(item.calibrated), pointsMm: item.pointsMm.map(([x, y]) => [x + xMm, y + yMm]) });
  });
  return { dxf: new TextEncoder().encode(writer.stringify()), placements, entityCount, units: 'mm', columns, rows, widthMm: columns * cellWidth - gap, heightMm: rows * cellHeight - gap, warnings: prepared.some(item => !item.calibrated) ? ['部分零件尚未校准，已标记 SIZE UNVERIFIED；合并仅平移排版，不改变各自比例。'] : [] };
}

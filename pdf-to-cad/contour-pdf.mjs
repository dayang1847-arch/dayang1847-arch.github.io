/** Vector contact sheets for isolated part contours. No uploads or new dependencies. */
import * as mupdf from 'mupdf';

const PT_PER_MM = 72 / 25.4;
const PAGE_WIDTH = 297 * PT_PER_MM;
const PAGE_HEIGHT = 210 * PT_PER_MM;
const IDENTITY = [1, 0, 0, 1, 0, 0];
const MAX_ITEMS = 100;
const MAX_POINTS = 500000;

function finitePositive(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive finite number`);
  return value;
}

function normalizeItem(item, index) {
  if (!item || !Array.isArray(item.pointsMm) || item.pointsMm.length < 3) throw new Error(`Contour ${index + 1} needs at least three points`);
  if (item.pointsMm.length > MAX_POINTS) throw new Error(`Contour ${index + 1} is too complex`);
  const widthMm = finitePositive(item.widthMm, 'widthMm');
  const heightMm = finitePositive(item.heightMm, 'heightMm');
  if (typeof item.label !== 'string') throw new Error('Contour label must be a string');
  if (typeof item.calibrated !== 'boolean') throw new Error('Contour calibrated must be a boolean');
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const points = item.pointsMm.map(point => {
    if (!Array.isArray(point) || point.length !== 2 || point.some(value => typeof value !== 'number' || !Number.isFinite(value))) throw new Error(`Contour ${index + 1} has invalid coordinates`);
    const [x, y] = point;
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    return [x, y];
  });
  const actualWidth = maxX - minX, actualHeight = maxY - minY;
  if (actualWidth <= 0 || actualHeight <= 0) throw new Error(`Contour ${index + 1} has zero area`);
  if (Math.abs(widthMm - actualWidth) > Math.max(0.05, widthMm * 0.001) || Math.abs(heightMm - actualHeight) > Math.max(0.05, heightMm * 0.001)) throw new Error(`Contour ${index + 1} dimensions do not match its coordinates`);
  let doubleArea = 0;
  points.forEach(([x, y], i) => { const next = points[(i + 1) % points.length]; doubleArea += x * next[1] - next[0] * y; });
  if (Math.abs(doubleArea) < 1e-9) throw new Error(`Contour ${index + 1} has zero area`);
  return { ...item, index, label: item.label.replace(/[\u0000-\u001f\u007f]/g, ' ').trim() || `Part ${index + 1}`, widthMm, heightMm, pointsMm: points.map(([x, y]) => [x - minX, y - minY]) };
}

/** Pure layout API: the entire batch shares one display scale; source points are never mutated. */
export function layoutContourPdf(items, options = {}) {
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) throw new Error(`Supply between 1 and ${MAX_ITEMS} contours`);
  if (items.reduce((n, item) => n + (item?.pointsMm?.length || 0), 0) > MAX_POINTS) throw new Error('Contours are too complex');
  const normalized = items.map(normalizeItem);
  const margin = 28, gap = 12, top = 70, bottom = 34;
  const columns = 3, rows = 2;
  const cellWidth = (PAGE_WIDTH - margin * 2 - gap * (columns - 1)) / columns;
  const cellHeight = (PAGE_HEIGHT - top - bottom - gap * (rows - 1)) / rows;
  // One scale across every cell and page preserves relative model sizes.
  const maximumWidthMm = Math.max(...normalized.map(item => item.widthMm));
  const maximumHeightMm = Math.max(...normalized.map(item => item.heightMm));
  const pointsPerMm = Math.min((cellWidth - 32) / maximumWidthMm, (cellHeight - 94) / maximumHeightMm);
  const pages = [];
  normalized.forEach((item, index) => {
    const pageIndex = Math.floor(index / 6), cellIndex = index % 6;
    if (!pages[pageIndex]) pages[pageIndex] = { widthPt: PAGE_WIDTH, heightPt: PAGE_HEIGHT, items: [] };
    const x = margin + (cellIndex % columns) * (cellWidth + gap);
    const y = top + Math.floor(cellIndex / columns) * (cellHeight + gap);
    const shape = { x: x + 16, y: y + 46, width: cellWidth - 32, height: cellHeight - 94 };
    const drawWidth = item.widthMm * pointsPerMm, drawHeight = item.heightMm * pointsPerMm;
    const originX = shape.x + (shape.width - drawWidth) / 2;
    const originY = shape.y + (shape.height + drawHeight) / 2;
    pages[pageIndex].items.push({ ...item, cell: { x, y, width: cellWidth, height: cellHeight }, pointsPerMm, displayScale: pointsPerMm / PT_PER_MM, pointsPt: item.pointsMm.map(([px, py]) => [originX + px * pointsPerMm, originY - py * pointsPerMm]) });
  });
  return { pages, itemCount: normalized.length, language: options.language === 'en' ? 'en' : 'zh' };
}

function numberText(value) { return Number(value.toFixed(3)).toString(); }
function textWidth(font, text, size) {
  let width = 0;
  for (const char of text) width += font.advanceGlyph(font.encodeCharacter(char.codePointAt(0))) * size;
  return width;
}
function wrapLabel(text, font, size, width, maxLines = 2) {
  const chars = Array.from(text), lines = [];
  let line = '';
  for (let i = 0; i < chars.length; i++) {
    const next = line + chars[i];
    if (textWidth(font, next, size) > width && line) {
      lines.push(line); line = '';
      if (lines.length === maxLines) {
        let last = lines.pop();
        while (last && textWidth(font, last + '…', size) > width) last = Array.from(last).slice(0, -1).join('');
        lines.push(last + '…');
        return lines;
      }
    }
    line += chars[i];
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

/**
 * Build a real vector PDF as an owned Uint8Array.
 * items: { pointsMm: [number,number][], label, widthMm, heightMm, calibrated }[]
 * Geometry uses millimetres and Y-up. The complete batch shares one PDF display scale.
 * This never modifies CAD geometry, saves files, persists data, or performs networking.
 */
export function createContourPdf(items, options = {}) {
  const plan = layoutContourPdf(items, options);
  const en = plan.language === 'en';
  const title = typeof options.title === 'string' && options.title.trim() ? options.title.trim() : (en ? 'Part outline collection' : '零件外形轮廓合集');
  const font = new mupdf.Font('zh-Hans');
  const buffer = new mupdf.Buffer();
  const writer = new mupdf.DocumentWriter(buffer, 'pdf', 'compress=yes');
  const stroke = new mupdf.StrokeState({ lineCap: 'Round', lineJoin: 'Round', lineWidth: 0.8, miterLimit: 4 });
  const borderStroke = new mupdf.StrokeState({ lineCap: 'Butt', lineJoin: 'Miter', lineWidth: 0.4, miterLimit: 4 });
  let device = null;
  const drawText = (text, x, y, size = 9, color = [0.12, 0.16, 0.2]) => {
    const value = new mupdf.Text();
    try {
      value.showString(font, [size, 0, 0, -size, x, y], text);
      device.fillText(value, IDENTITY, mupdf.ColorSpace.DeviceRGB, color, 1);
    } finally { value.destroy(); }
  };
  const drawPath = (points, color, style) => {
    const path = new mupdf.Path();
    try {
      path.moveTo(...points[0]);
      for (const point of points.slice(1)) path.lineTo(...point);
      path.closePath();
      device.strokePath(path, style, IDENTITY, mupdf.ColorSpace.DeviceRGB, color, 1);
    } finally { path.destroy(); }
  };
  try {
    for (let pageIndex = 0; pageIndex < plan.pages.length; pageIndex++) {
      const page = plan.pages[pageIndex];
      device = writer.beginPage([0, 0, page.widthPt, page.heightPt]);
      drawText(title, 28, 30, 17);
      drawText(en ? 'This batch uses one common display scale. Refer to stated dimensions / CAD for actual size.' : '本批轮廓按同一比例排版，实际尺寸以标注 / CAD 为准。', 28, 47, 9);
      drawText(en ? 'CAD keeps 1:1 coordinate units; uncalibrated parts still need a known dimension.' : 'CAD 按 1:1 坐标保存；未校准零件仍需按已知标注尺寸校准。', 28, 60, 9);
      for (const item of page.items) {
        const { x, y, width, height } = item.cell;
        drawPath([[x,y],[x+width,y],[x+width,y+height],[x,y+height]], [0.78,0.82,0.85], borderStroke);
        const label = `${String(item.index + 1).padStart(2,'0')}  ${item.label}`;
        wrapLabel(label, font, 10, width - 24).forEach((line, i) => drawText(line, x + 12, y + 17 + i * 12, 10));
        drawPath(item.pointsPt, [0,0,0], stroke);
        drawText(`${en ? 'Bounds' : '包络'}: ${numberText(item.widthMm)} × ${numberText(item.heightMm)} mm`, x + 12, y + height - 28, 8.5);
        const state = item.calibrated ? (en ? 'Reference calibrated' : '已按参考尺寸校准') : (en ? 'UNCALIBRATED - reference values' : '未校准 - 当前为参考数值');
        drawText(state, x + 12, y + height - 15, 8.5, item.calibrated ? [0.13,0.35,0.3] : [0.6,0.28,0.08]);
        const scale = `${en ? 'Display' : '显示比例'} ${Number(item.displayScale.toPrecision(4)).toString()}:1`;
        drawText(scale, x + width - 12 - textWidth(font, scale, 7.5), y + height - 3, 7.5, [0.35,0.4,0.44]);
      }
      drawText(`${plan.itemCount} ${en ? 'parts' : '个轮廓'}  ·  ${en ? 'Page' : '第'} ${pageIndex+1} / ${plan.pages.length} ${en ? '' : '页'}`, 28, page.heightPt - 15, 8);
      writer.endPage(); device.destroy(); device = null;
    }
    writer.close();
    return new Uint8Array(buffer.asUint8Array());
  } finally {
    if (device) device.destroy();
    writer.destroy(); buffer.destroy(); stroke.destroy(); borderStroke.destroy(); font.destroy();
  }
}

import * as mupdf from 'mupdf';
import { DxfWriter, Units, LayerFlags, SplineFlags, point3d } from '@tarikjabiri/dxf';
import paper from 'paper/dist/paper-core.js';

const MM_PER_PT = 25.4 / 72;
const IDENTITY = [1, 0, 0, 1, 0, 0];
const REFERENCE_LAYER = 'CALIBRATION_REFERENCE';

function positive(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${name}必须是大于 0 的有限数值`);
  return number;
}

function normalizedPoint(value, name) {
  if (!Array.isArray(value) || value.length !== 2 || value.some(v => !Number.isFinite(v) || v < 0 || v > 1)) {
    throw new Error(`${name}必须是在预览图内选取的两个归一化坐标`);
  }
  return [...value];
}

/** Calibration points use preview coordinates: [0,0] is the upper left. */
export function resolveScale(widthPt, heightPt, options = {}) {
  const paperWidthMm = positive(widthPt, '页面宽度') * MM_PER_PT;
  const paperHeightMm = positive(heightPt, '页面高度') * MM_PER_PT;
  const requestedScale = options.scale === undefined ? null : positive(options.scale, '比例');
  if (!options.calibration) {
    return {
      scale: requestedScale ?? 1,
      calibration: null,
      paperWidthMm,
      paperHeightMm,
      warnings: ['尚未用已知尺寸校准；当前按纸面尺寸及所选比例换算，不能据此确认工程尺寸正确。'],
    };
  }
  const source = options.calibration;
  const pointA = normalizedPoint(source.pointA, '校准起点');
  const pointB = normalizedPoint(source.pointB, '校准终点');
  const targetMm = positive(source.valueMm, '参考尺寸');
  const paperDistanceMm = Math.hypot(
    (pointB[0] - pointA[0]) * paperWidthMm,
    (pointB[1] - pointA[1]) * paperHeightMm,
  );
  if (paperDistanceMm < 0.001) throw new Error('两个校准点距离过近，请重新选择尺寸线的两个端点');
  const scale = targetMm / paperDistanceMm;
  for (const candidate of [source.scale, requestedScale]) {
    if (candidate === null || candidate === undefined) continue;
    if (Math.abs(positive(candidate, '校准比例') - scale) > Math.max(1, scale) * 1e-5) {
      throw new Error('校准点和已知尺寸算出的比例与转换比例不一致，请重新确认校准');
    }
  }
  const outputA = [pointA[0] * paperWidthMm * scale, (1 - pointA[1]) * paperHeightMm * scale];
  const outputB = [pointB[0] * paperWidthMm * scale, (1 - pointB[1]) * paperHeightMm * scale];
  const measurementMm = Math.hypot(outputB[0] - outputA[0], outputB[1] - outputA[1]);
  return {
    scale,
    paperWidthMm,
    paperHeightMm,
    calibration: {
      pointA, pointB, outputA, outputB, targetMm, measurementMm,
      errorMm: measurementMm - targetMm, paperDistanceMm, scale,
      referenceLayer: REFERENCE_LAYER,
      scope: '仅验证所选两点之间的参考尺寸；其他尺寸仍需逐项核对。',
    },
    warnings: ['已按所选参考尺寸统一缩放；校准仅验证该参考段，不能保证扫描畸变或图中其他尺寸一致。'],
  };
}

function multiply(first, second) {
  return [
    first[0] * second[0] + first[1] * second[2],
    first[0] * second[1] + first[1] * second[3],
    first[2] * second[0] + first[3] * second[2],
    first[2] * second[1] + first[3] * second[3],
    first[4] * second[0] + first[5] * second[2] + second[4],
    first[4] * second[1] + first[5] * second[3] + second[5],
  ];
}

function colorOptions(color, colorspace) {
  if (!color || !color.length) return { colorNumber: 7 };
  let rgb;
  if (color.length === 1) rgb = [color[0], color[0], color[0]];
  else if (color.length === 4) {
    rgb = [1 - Math.min(1, color[0] + color[3]), 1 - Math.min(1, color[1] + color[3]), 1 - Math.min(1, color[2] + color[3])];
  } else rgb = color.slice(0, 3);
  if (rgb.every(v => v < 0.025)) return { colorNumber: 7 };
  return { trueColor: rgb.map(v => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('') };
}

function samePoint(a, b) {
  return Math.abs(a.x - b.x) < 1e-10 && Math.abs(a.y - b.y) < 1e-10;
}

function keyPoint(p) {
  return `${p.x.toPrecision(12)},${p.y.toPrecision(12)}`;
}

function convertPage(page, widthPt, heightPt, options = {}, sourceBounds = page.getBounds()) {
  const resolved = resolveScale(widthPt, heightPt, options);
  const warnings = new Set(resolved.warnings);
  const outline = options.outline === true;
  if (outline) warnings.add(options.scan
    ? '一键描轮廓会追踪扫描图中的全部边界，包括扫描文字；无法自动区分文字与产品轮廓，粗线可能保留双边。'
    : '一键描轮廓仅保留图形路径，已跳过原生 PDF 文字；已转为图形的文字仍会保留为轮廓。');
  const writer = new DxfWriter();
  writer.setUnits(Units.Millimeters);
  const baseLayer = options.scan ? 'SCAN_BOUNDARY' : 'PDF_GEOMETRY';
  writer.addLayer(baseLayer, 7);
  writer.addLayer('PDF_TEXT', 7);
  const layers = new Set([baseLayer, 'PDF_TEXT']);
  const layerStack = [baseLayer];
  const sourceWidth = positive(sourceBounds[2] - sourceBounds[0], '源页面宽度');
  const sourceHeight = positive(sourceBounds[3] - sourceBounds[1], '源页面高度');
  const factorX = widthPt / sourceWidth * MM_PER_PT * resolved.scale;
  const factorY = heightPt / sourceHeight * MM_PER_PT * resolved.scale;
  const outputHeight = heightPt * MM_PER_PT * resolved.scale;
  const outputWidth = widthPt * MM_PER_PT * resolved.scale;
  const maxEntities = Math.min(1000000, positive(options.maxEntities ?? 250000, '实体数量上限'));
  const unique = new Set();
  const stats = { LINE: 0, SPLINE: 0, TEXT: 0 };
  let entityCount = 0;
  let removedDuplicates = 0;
  let imageCount = 0;

  function convertPoint(x, y, matrix) {
    const worldX = x * matrix[0] + y * matrix[2] + matrix[4];
    const worldY = x * matrix[1] + y * matrix[3] + matrix[5];
    const p = point3d((worldX - sourceBounds[0]) * factorX, outputHeight - (worldY - sourceBounds[1]) * factorY, 0);
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new Error('图纸包含无法转换的坐标');
    return p;
  }

  function register(key, type) {
    if (unique.has(key)) { removedDuplicates++; return false; }
    if (entityCount >= maxEntities) throw new Error(`单页超过 ${maxEntities.toLocaleString()} 个独立图元，请降低扫描精细度后重试`);
    unique.add(key);
    entityCount++;
    stats[type]++;
    return true;
  }

  function addLine(a, b, style) {
    if (samePoint(a, b)) return;
    const keys = [keyPoint(a), keyPoint(b)].sort();
    if (register(`L:${keys.join(';')}`, 'LINE')) writer.addLine(a, b, style);
  }

  function addCurve(points, style) {
    if (points.every(p => samePoint(p, points[0]))) return;
    const forward = points.map(keyPoint).join(';');
    const backward = [...points].reverse().map(keyPoint).join(';');
    if (!register(`S:${forward < backward ? forward : backward}`, 'SPLINE')) return;
    writer.addSpline({
      degreeCurve: 3, controlPoints: points, knots: [0, 0, 0, 0, 1, 1, 1, 1], flags: SplineFlags.Planar,
    }, style);
  }

  // No HATCH, grouped polyline or INSERT is emitted: each source edge is a
  // separate selectable LINE or exact cubic SPLINE in CAD model space.
  function walkPath(path, matrix, style, fill) {
    let current = null;
    let start = null;
    const segments = [];
    function push(segment) {
      if (segments.length >= maxEntities * 2) throw new Error('单条路径过于复杂，请降低扫描精细度');
      segments.push(segment);
    }
    function close() {
      if (current && start && !samePoint(current, start)) push([current, start]);
      current = start;
    }
    path.walk({
      moveTo(x, y) {
        if (fill) close();
        start = current = convertPoint(x, y, matrix);
      },
      lineTo(x, y) {
        const next = convertPoint(x, y, matrix);
        if (current) push([current, next]);
        current = next;
      },
      curveTo(x1, y1, x2, y2, x3, y3) {
        const next = convertPoint(x3, y3, matrix);
        if (current) push([current, convertPoint(x1, y1, matrix), convertPoint(x2, y2, matrix), next]);
        current = next;
      },
      closePath: close,
    });
    if (fill) close();
    // Do not turn a page-sized white background rectangle into CAD geometry.
    if (fill && style.trueColor === 'ffffff' && segments.length === 4 && segments.every(s => s.length === 2)) {
      const points = segments.flat();
      const xs = points.map(p => p.x), ys = points.map(p => p.y);
      if (Math.min(...xs) < 0.001 && Math.min(...ys) < 0.001 &&
          Math.max(...xs) > outputWidth - 0.001 && Math.max(...ys) > outputHeight - 0.001) return;
    }
    for (const segment of segments) {
      if (segment.length === 2) addLine(segment[0], segment[1], style);
      else addCurve(segment, style);
    }
  }

  function pathStyle(color, colorspace) {
    return { layerName: layerStack[layerStack.length - 1], ...colorOptions(color, colorspace) };
  }

  function textToCad(text, matrix, colorspace, color, alpha) {
    if (alpha <= 0) return;
    warnings.add('PDF 文字已保留为独立 TEXT；CAD 使用本机字体，字形、字符宽度和特殊符号需核对。');
    let activeFont;
    try { text.walk({
      beginSpan(font) { activeFont = font; },
      endSpan() { activeFont?.destroy(); activeFont = null; },
      showGlyph(font, trm, gid, ucs) {
        const combined = multiply(trm, matrix);
        if (!Number.isInteger(ucs) || ucs < 32 || ucs > 0x10ffff) {
          if (ucs !== 32 && ucs !== 9) warnings.add('部分字体缺少 Unicode 映射，无法恢复的字符需人工补充。');
          return;
        }
        const value = String.fromCodePoint(ucs);
        if (value.trim() === '') return;
        const origin = convertPoint(0, 0, combined);
        const right = convertPoint(1, 0, combined);
        const up = convertPoint(0, 1, combined);
        const dx = right.x - origin.x, dy = right.y - origin.y;
        const ux = up.x - origin.x, uy = up.y - origin.y;
        const em = Math.hypot(ux, uy), horizontal = Math.hypot(dx, dy);
        if (em < 1e-8 || horizontal < 1e-8) return;
        const height = em * (options.textHeightFactor ?? 0.72);
        const rotation = Math.atan2(dy, dx) * 180 / Math.PI;
        const key = `T:${value}:${keyPoint(origin)}:${rotation.toPrecision(10)}:${height.toPrecision(10)}`;
        if (!register(key, 'TEXT')) return;
        writer.addText(origin, height, value, {
          layerName: 'PDF_TEXT', rotation,
          relativeXScaleFactor: horizontal / em,
          generationFlags: dx * uy - dy * ux < 0 ? 4 : 0,
          ...colorOptions(color, colorspace),
        });
      },
    }); } finally { activeFont?.destroy(); }
  }

  const device = new mupdf.Device({
    fillPath(path, evenOdd, matrix, colorspace, color, alpha) {
      try {
        if (alpha <= 0) return;
        warnings.add('填充区域已拆为独立边界线，未输出整片填充；扫描粗线可能保留双边轮廓。');
        walkPath(path, matrix, pathStyle(color, colorspace), true);
      } finally { path.destroy(); colorspace.destroy(); }
    },
    strokePath(path, stroke, matrix, colorspace, color, alpha) {
      try { if (alpha > 0) walkPath(path, matrix, pathStyle(color, colorspace), false); }
      finally { path.destroy(); stroke.destroy(); colorspace.destroy(); }
    },
    fillText(text, matrix, colorspace, color, alpha) {
      try { if (!outline) textToCad(text, matrix, colorspace, color, alpha); }
      finally { text.destroy(); colorspace.destroy(); }
    },
    strokeText(text, stroke, matrix, colorspace, color, alpha) {
      try { if (!outline) textToCad(text, matrix, colorspace, color, alpha); }
      finally { text.destroy(); stroke.destroy(); colorspace.destroy(); }
    },
    fillImage(image) { imageCount++; image.destroy(); },
    fillImageMask(image, matrix, colorspace) { imageCount++; image.destroy(); colorspace.destroy(); },
    fillShade() { warnings.add('渐变着色没有对应的独立 CAD 线条，未导出渐变。'); },
    clipPath(path) { warnings.add('PDF 中存在裁剪路径，导出的原始边界可能需要局部修剪。'); path.destroy(); },
    clipStrokePath(path, stroke) { warnings.add('PDF 中存在描边裁剪，导出后需核对被裁剪区域。'); path.destroy(); stroke.destroy(); },
    clipText(text) { warnings.add('PDF 中存在文字裁剪，导出后需核对被裁剪区域。'); text.destroy(); },
    beginMask(area, luminosity, colorspace) { warnings.add('PDF 中存在透明蒙版，CAD 线条无法完全重现遮挡效果。'); colorspace.destroy(); },
    beginTile() { warnings.add('PDF 中存在重复图案，导出后需核对图案区域。'); return 0; },
    beginLayer(name) {
      const safeName = `PDF_${String(name).replace(/[<>/\\":;?*|=]/g, '_').slice(0, 100)}`;
      if (!layers.has(safeName)) { writer.addLayer(safeName, 7); layers.add(safeName); }
      layerStack.push(safeName);
    },
    endLayer() { if (layerStack.length > 1) layerStack.pop(); },
  });
  try {
    // MuPDF already applies PDF page rotation. Only the single upper-left to
    // lower-left coordinate conversion in convertPoint is applied here.
    page.run(device, IDENTITY);
  } finally { try { device.close(); } finally { device.destroy(); } }

  if (resolved.calibration) {
    writer.addLayer(REFERENCE_LAYER, 3, 'Continuous', LayerFlags.Frozen | LayerFlags.Locked);
    writer.addLine(point3d(...resolved.calibration.outputA), point3d(...resolved.calibration.outputB), { layerName: REFERENCE_LAYER });
    entityCount++;
    stats.LINE++;
  }
  if (imageCount) warnings.add(`本页包含 ${imageCount} 个位图对象；矢量模式只提取路径和文字，位图请使用扫描模式。`);
  if (!entityCount || (entityCount === 1 && resolved.calibration)) throw new Error('此页未提取到可编辑线条，请尝试扫描模式');
  return {
    dxf: new TextEncoder().encode(writer.stringify()), entityCount, entityStats: stats,
    warnings: [...warnings], calibration: resolved.calibration, scale: resolved.scale,
    widthMm: outputWidth, heightMm: outputHeight, imageCount, removedDuplicates,
    entityMode: 'independent', outline,
  };
}

export function vectorPageToDxf(page, options = {}) {
  const bounds = page.getBounds();
  return convertPage(page, bounds[2] - bounds[0], bounds[3] - bounds[1], options, bounds);
}

/** Map traced SVG pixels back to the PDF's paper size before applying scale. */
export function svgToDxf(svg, widthPt, heightPt, options = {}) {
  const source = typeof svg === 'string' ? svg : new TextDecoder().decode(svg);
  if (source.length > 64 * 1024 * 1024) throw new Error('扫描轮廓数据超过 64 MB，请降低扫描精细度');
  const root = source.match(/<svg\b([^>]*)>/i);
  if (!root) throw new Error('未收到有效的 SVG 轮廓');
  const rootAttrs = attributes(root[1]);
  const viewBox = rootAttrs.viewBox?.trim().split(/[\s,]+/).map(Number);
  const bounds = viewBox?.length === 4 && viewBox.every(Number.isFinite)
    ? [viewBox[0], viewBox[1], viewBox[0] + viewBox[2], viewBox[1] + viewBox[3]]
    : [0, 0, parseFloat(rootAttrs.width), parseFloat(rootAttrs.height)];
  if (bounds.some(v => !Number.isFinite(v)) || bounds[2] <= bounds[0] || bounds[3] <= bounds[1]) {
    throw new Error('SVG 缺少有效的像素尺寸或 viewBox');
  }
  const project = new paper.Project();
  try {
    // MuPDF's npm WASM omits the SVG document handler. Paper parses just the
    // path data (no DOM or SVG renderer), then MuPDF Path supplies the same
    // geometry walker as the vector-PDF conversion. The SVG token reader is
    // deliberately limited to the svg/g/path dialect emitted by Potrace.
    const page = {
      getBounds: () => bounds,
      run(device) {
        const stack = [{ matrix: IDENTITY, fill: '#000000', stroke: 'none' }];
        const tags = source.matchAll(/<(\/?)([A-Za-z_][\w:.-]*)\b([^<>]*)>/g);
        let pathCount = 0;
        for (const tag of tags) {
          const name = tag[2].toLowerCase();
          if (tag[1]) {
            if ((name === 'g' || name === 'svg') && stack.length > 1) stack.pop();
            continue;
          }
          const attrs = attributes(tag[3]);
          const parent = stack[stack.length - 1];
          const style = { ...parent, ...styleAttributes(attrs) };
          style.matrix = attrs.transform ? multiply(svgMatrix(attrs.transform), parent.matrix) : parent.matrix;
          if (name === 'svg' || name === 'g') {
            stack.push(style);
            if (/\/\s*$/.test(tag[3])) stack.pop();
            continue;
          }
          if (name !== 'path') {
            if (['rect', 'circle', 'ellipse', 'line', 'polygon', 'polyline', 'use', 'image'].includes(name)) {
              throw new Error('扫描 SVG 包含非 path 元素，请使用内置 Potrace 轮廓转换');
            }
            continue;
          }
          if (!attrs.d || (style.fill === 'none' && style.stroke === 'none')) continue;
          if (++pathCount > (options.maxEntities ?? 250000)) throw new Error('扫描轮廓过多，请降低扫描精细度');
          const compound = new paper.CompoundPath({ pathData: attrs.d, insert: false });
          const path = new mupdf.Path();
          try {
            for (const child of compound.children) {
              const first = child.firstSegment?.point;
              if (!first) continue;
              path.moveTo(first.x, first.y);
              for (const curve of child.curves) {
                const v = curve.values;
                if (curve.isStraight()) path.lineTo(v[6], v[7]);
                else path.curveTo(v[2], v[3], v[4], v[5], v[6], v[7]);
              }
              if (child.closed) path.closePath();
            }
            if (style.fill !== 'none') {
              device.fillPath(path, style['fill-rule'] === 'evenodd', style.matrix, mupdf.ColorSpace.DeviceRGB, svgColor(style.fill), 1);
            }
            if (style.stroke !== 'none') {
              const stroke = new mupdf.StrokeState({ lineWidth: 1, lineCap: 'Butt', lineJoin: 'Miter', miterLimit: 10 });
              try { device.strokePath(path, stroke, style.matrix, mupdf.ColorSpace.DeviceRGB, svgColor(style.stroke), 1); }
              finally { stroke.destroy(); }
            }
          } finally { path.destroy(); compound.remove(); }
        }
      },
    };
    return convertPage(page, widthPt, heightPt, { ...options, scan: true }, bounds);
  } finally { project.remove(); }
}

function attributes(source) {
  const result = {};
  for (const match of source.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) result[match[1]] = match[2] ?? match[3];
  return result;
}

function styleAttributes(attrs) {
  const result = {};
  if (attrs.style) {
    for (const item of attrs.style.split(';')) {
      const colon = item.indexOf(':');
      if (colon > 0) result[item.slice(0, colon).trim()] = item.slice(colon + 1).trim();
    }
  }
  for (const key of ['fill', 'stroke', 'fill-rule']) if (attrs[key] !== undefined) result[key] = attrs[key];
  return result;
}

function svgColor(value) {
  if (value === 'white') return [1, 1, 1];
  if (/^#[0-9a-f]{6}$/i.test(value)) return [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16) / 255);
  if (/^#[0-9a-f]{3}$/i.test(value)) return [1, 2, 3].map(i => parseInt(value[i] + value[i], 16) / 255);
  return [0, 0, 0];
}

function svgMatrix(source) {
  let matrix = IDENTITY;
  let consumed = '';
  for (const match of source.matchAll(/([A-Za-z]+)\s*\(([^)]*)\)/g)) {
    consumed += match[0];
    const args = match[2].trim().split(/[\s,]+/).map(Number);
    if (args.some(v => !Number.isFinite(v))) throw new Error('SVG 变换参数无效');
    let next;
    switch (match[1]) {
      case 'matrix': if (args.length === 6) next = args; break;
      case 'translate': if (args.length >= 1) next = [1, 0, 0, 1, args[0], args[1] ?? 0]; break;
      case 'scale': if (args.length >= 1) next = [args[0], 0, 0, args[1] ?? args[0], 0, 0]; break;
      case 'rotate': {
        const a = args[0] * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
        const x = args[1] ?? 0, y = args[2] ?? 0;
        next = [c, s, -s, c, x - c * x + s * y, y - s * x - c * y];
        break;
      }
      default: throw new Error(`暂不支持 SVG 变换 ${match[1]}`);
    }
    if (!next) throw new Error('SVG 变换参数数量无效');
    matrix = multiply(next, matrix);
  }
  if (!consumed && source.trim()) throw new Error('SVG 变换格式无效');
  return matrix;
}

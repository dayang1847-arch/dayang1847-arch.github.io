import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import * as mupdf from 'mupdf';
import { svgToDxf, vectorPageToDxf, resolveScale } from '../geometry.mjs';
import initCad, { dxf_to_dwg, inspect_dwg } from '../vendor/cad/pdf_cad_wasm.js';

// Every fixture is generated here. Tests never read customer drawings, home
// directories, conversion history, private paths, or network resources.
await initCad({ module_or_path: await readFile(new URL('../vendor/cad/pdf_cad_wasm_bg.wasm', import.meta.url)) });
const MM_PER_PT = 25.4 / 72;

// MuPDF's graphics matrices use float32. A 0.00001 mm bound is below the
// precision of source PDF/scanner geometry and accommodates that conversion.
function near(actual, expected, tolerance = 1e-5) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `Expected ${actual} to equal ${expected} ± ${tolerance}`);
}

function readDxfRecords(bytes, sectionName) {
  const lines = new TextDecoder().decode(bytes).replaceAll('\r', '').split('\n');
  const records = [];
  let section = null, current = null;
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = Number(lines[i].trim()), value = lines[i + 1].trim();
    if (code === 0 && value === 'SECTION') {
      section = lines[i + 3]?.trim();
      continue;
    }
    if (code === 0 && value === 'ENDSEC') { section = null; current = null; continue; }
    if (section !== sectionName) continue;
    if (code === 0) { current = { type: value, tags: new Map() }; records.push(current); }
    if (current) {
      if (!current.tags.has(code)) current.tags.set(code, []);
      current.tags.get(code).push(value);
    }
  }
  return records;
}

function value(record, code) { return record.tags.get(code)?.[0]; }
function numeric(record, code) { return Number(value(record, code)); }

function nativeDwg(result) {
  const dwg = dxf_to_dwg(result.dxf);
  assert.equal(new TextDecoder().decode(dwg.subarray(0, 6)), 'AC1027');
  assert.ok(dwg.length > 512);
  const manifest = JSON.parse(inspect_dwg(dwg));
  assert.equal(manifest.version, 'AC1027');
  assert.equal(manifest.entities, result.entityCount);
  assert.equal(manifest.units, 4);
  for (const type of ['HATCH', 'LWPOLYLINE', 'POLYLINE', 'INSERT']) assert.equal(manifest.types[type], undefined);
  return manifest;
}

function rectangleSvg(extraAttributes = '') {
  return `<svg width="200" height="100" viewBox="0 0 200 100"><path d="M20 10 H180 V90 H20 Z" fill="black" ${extraAttributes}/></svg>`;
}

function syntheticPdf(rotation = 0, textRenderingMode = 0) {
  const content = `20 10 160 80 re S\n30 30 m 30 60 70 60 70 30 c S\nBT /F1 12 Tf ${textRenderingMode} Tr 30 50 Td (ABC) Tj ET\n`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Rotate ${rotation} /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}endstream`,
  ];
  let pdf = '%PDF-1.7\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => String(n).padStart(10, '0') + ' 00000 n ').join('\n')}\n`;
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

test('closed SVG rectangle becomes four separately selectable LINE entities', () => {
  const result = svgToDxf(rectangleSvg(), 200, 100);
  assert.equal(result.entityCount, 4);
  assert.deepEqual(result.entityStats, { LINE: 4, SPLINE: 0, TEXT: 0 });
  assert.equal(result.entityMode, 'independent');
  assert.ok(result.warnings.some(w => w.includes('尚未') && w.includes('校准')));
  const records = readDxfRecords(result.dxf, 'ENTITIES');
  assert.equal(records.length, 4);
  assert.ok(records.every(e => e.type === 'LINE'));
  const manifest = nativeDwg(result);
  assert.deepEqual(manifest.types, { LINE: 4 });
  near(manifest.extents.min[0], 20 * MM_PER_PT);
  near(manifest.extents.min[1], 10 * MM_PER_PT);
  near(manifest.extents.max[0], 180 * MM_PER_PT);
  near(manifest.extents.max[1], 90 * MM_PER_PT);
});

test('duplicate fill and stroke edges are deduplicated, without joining edges', () => {
  const result = svgToDxf(rectangleSvg('stroke="black"'), 200, 100);
  assert.equal(result.entityCount, 4);
  assert.equal(result.removedDuplicates, 4);
  nativeDwg(result);
});

test('SVG ring preserves both boundaries as eight independent cubic SPLINE entities', () => {
  const svg = '<svg width="100" height="100" viewBox="0 0 100 100"><path d="M90 50 A40 40 0 1 0 10 50 A40 40 0 1 0 90 50 Z M70 50 A20 20 0 1 1 30 50 A20 20 0 1 1 70 50Z" fill-rule="evenodd"/></svg>';
  const result = svgToDxf(svg, 100, 100);
  assert.equal(result.entityCount, 8);
  assert.deepEqual(result.entityStats, { LINE: 0, SPLINE: 8, TEXT: 0 });
  const splines = readDxfRecords(result.dxf, 'ENTITIES');
  for (const spline of splines) {
    assert.equal(spline.type, 'SPLINE');
    assert.equal(numeric(spline, 71), 3);
    assert.equal(numeric(spline, 73), 4);
    assert.deepEqual(spline.tags.get(40).map(Number), [0, 0, 0, 0, 1, 1, 1, 1]);
  }
  assert.deepEqual(nativeDwg(result).types, { SPLINE: 8 });
});

test('Potrace translate/negative-scale transform maps back to paper dimensions once', () => {
  const svg = '<svg width="100" height="80" viewBox="0 0 100 80"><g transform="translate(0,80) scale(.1,-.1)" fill="none" stroke="black"><path d="M100 600L700 500"/></g></svg>';
  const result = svgToDxf(svg, 200, 160, { scale: 2 });
  const [line] = readDxfRecords(result.dxf, 'ENTITIES');
  assert.equal(result.entityCount, 1);
  near(numeric(line, 10), 20 * MM_PER_PT * 2);
  near(numeric(line, 20), 120 * MM_PER_PT * 2);
  near(numeric(line, 11), 140 * MM_PER_PT * 2);
  near(numeric(line, 21), 100 * MM_PER_PT * 2);
  nativeDwg(result);
});

test('calibration exports a frozen, locked reference whose measured length is 160 mm', () => {
  const calibration = { pointA: [0.1, 0.1], pointB: [0.9, 0.1], valueMm: 160 };
  const result = svgToDxf(rectangleSvg(), 200, 100, { calibration });
  assert.equal(result.entityCount, 5);
  near(result.calibration.measurementMm, 160);
  near(result.calibration.errorMm, 0);
  const records = readDxfRecords(result.dxf, 'ENTITIES');
  const reference = records.find(e => value(e, 8) === 'CALIBRATION_REFERENCE');
  assert.equal(reference.type, 'LINE');
  near(Math.hypot(numeric(reference, 11) - numeric(reference, 10), numeric(reference, 21) - numeric(reference, 20)), 160);
  const layer = readDxfRecords(result.dxf, 'TABLES').find(e => e.type === 'LAYER' && value(e, 2) === 'CALIBRATION_REFERENCE');
  assert.equal(numeric(layer, 70) & 1, 1, 'Reference layer must be frozen');
  assert.equal(numeric(layer, 70) & 4, 4, 'Reference layer must be locked');
  assert.ok(result.calibration.scope.includes('其他尺寸'));
  nativeDwg(result);
});

test('calibration rejects inconsistent scales, coincident points and invalid references', () => {
  const calibration = { pointA: [0.1, 0.1], pointB: [0.9, 0.1], valueMm: 160 };
  assert.throws(() => resolveScale(200, 100, { scale: 1, calibration }), /不一致/);
  assert.throws(() => resolveScale(200, 100, { calibration: { ...calibration, pointB: calibration.pointA } }), /过近/);
  assert.throws(() => resolveScale(200, 100, { calibration: { ...calibration, valueMm: -1 } }), /大于 0/);
  assert.throws(() => resolveScale(200, 100, { calibration: { ...calibration, pointA: [2, 0] } }), /归一化/);
});

for (const rotation of [0, 90]) {
  test(`real synthetic vector PDF retains lines, cubic curves and TEXT at page rotation ${rotation}°`, () => {
    const document = mupdf.Document.openDocument(syntheticPdf(rotation), 'application/pdf');
    const page = document.loadPage(0);
    try {
      const result = vectorPageToDxf(page);
      assert.deepEqual(result.entityStats, { LINE: 4, SPLINE: 1, TEXT: 3 });
      const records = readDxfRecords(result.dxf, 'ENTITIES');
      assert.equal(records.filter(e => e.type === 'TEXT').map(e => value(e, 1)).join(''), 'ABC');
      const manifest = nativeDwg(result);
      assert.deepEqual(manifest.types, { LINE: 4, SPLINE: 1, TEXT: 3 });
      near(manifest.extents.min[0], (rotation ? 10 : 20) * MM_PER_PT);
      near(manifest.extents.min[1], (rotation ? 20 : 10) * MM_PER_PT);
      near(result.widthMm, (rotation ? 100 : 200) * MM_PER_PT);
      near(result.heightMm, (rotation ? 200 : 100) * MM_PER_PT);
    } finally { page.destroy(); document.destroy(); }
  });
}

test('complexity limit and unsupported SVG shapes fail explicitly', () => {
  assert.throws(() => svgToDxf(rectangleSvg(), 200, 100, { maxEntities: 2 }), /超过/);
  assert.throws(() => svgToDxf('<svg width="100" height="100"><rect width="100" height="100"/></svg>', 100, 100), /非 path/);
  assert.throws(() => svgToDxf('<svg><path d="M0 0 L1 1"/></svg>', 100, 100), /像素尺寸/);
});

test('outline mode skips both filled and stroked PDF text, preserving independent geometry and calibration', () => {
  for (const textRenderingMode of [0, 1]) {
    const document = mupdf.Document.openDocument(syntheticPdf(0, textRenderingMode), 'application/pdf');
    const page = document.loadPage(0);
    try {
      const result = vectorPageToDxf(page, {
        outline: true,
        calibration: { pointA: [0.1, 0.1], pointB: [0.9, 0.1], valueMm: 160 },
      });
      assert.equal(result.outline, true);
      assert.equal(result.entityMode, 'independent');
      assert.deepEqual(result.entityStats, { LINE: 5, SPLINE: 1, TEXT: 0 });
      assert.ok(result.warnings.some(w => w.includes('跳过原生 PDF 文字')));
      assert.ok(!result.warnings.some(w => w.includes('文字已保留为独立 TEXT')));
      assert.ok(readDxfRecords(result.dxf, 'ENTITIES').every(e => e.type === 'LINE' || e.type === 'SPLINE'));
      near(result.calibration.measurementMm, 160);
      near(result.calibration.errorMm, 0);
      assert.deepEqual(nativeDwg(result).types, { LINE: 5, SPLINE: 1 });
    } finally { page.destroy(); document.destroy(); }
  }
});

test('outline mode retains traced SVG boundaries and explicitly warns that scanned text cannot be removed', () => {
  const result = svgToDxf(rectangleSvg(), 200, 100, { outline: true });
  assert.equal(result.outline, true);
  assert.deepEqual(result.entityStats, { LINE: 4, SPLINE: 0, TEXT: 0 });
  assert.ok(result.warnings.some(w => w.includes('包括扫描文字') && w.includes('无法自动区分')));
  assert.deepEqual(nativeDwg(result).types, { LINE: 4 });
  assert.equal(svgToDxf(rectangleSvg(), 200, 100).outline, false);
});

test('native binary DWG bridge rejects empty DXF and non-DWG inputs', () => {
  assert.throws(() => dxf_to_dwg(new Uint8Array()));
  assert.throws(() => inspect_dwg(new TextEncoder().encode('This is not a DWG')));
});

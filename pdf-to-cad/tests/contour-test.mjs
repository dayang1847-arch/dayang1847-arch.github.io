import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { extractContour, exportContoursDxf } from '../contour.mjs';
import initCad, { dxf_to_dwg, inspect_dwg } from '../vendor/cad/pdf_cad_wasm.js';

await initCad({ module_or_path: await readFile(new URL('../vendor/cad/pdf_cad_wasm_bg.wasm', import.meta.url)) });

// Entirely synthetic fixtures; no customer drawings or private file paths.
const shape = [[70, 50], [300, 50], [300, 75], [280, 75], [280, 120], [235, 140], [215, 180], [215, 240], [155, 240], [155, 180], [135, 140], [90, 120], [90, 75], [70, 75]];

function fixture({ details = true, gap = false, spur = false } = {}) {
  const width = 400, height = 300;
  const rgba = new Uint8ClampedArray(width * height * 4).fill(255);
  function dot(x, y, radius) {
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      const px = x + dx, py = y + dy;
      if (px < 0 || py < 0 || px >= width || py >= height) continue;
      const i = (py * width + px) * 4;
      rgba[i] = rgba[i + 1] = rgba[i + 2] = 0;
    }
  }
  function line(a, b, radius = 1) {
    const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
    for (let i = 0; i <= steps; i++) dot(Math.round(a[0] + (b[0] - a[0]) * i / steps), Math.round(a[1] + (b[1] - a[1]) * i / steps), radius);
  }
  for (let i = 0; i < shape.length; i++) line(shape[i], shape[(i + 1) % shape.length]);
  if (details) {
    line([95, 110], [275, 110]); line([155, 195], [215, 195]);
    for (let angle = 0; angle < 360; angle++) dot(Math.round(185 + Math.cos(angle * Math.PI / 180) * 12), Math.round(90 + Math.sin(angle * Math.PI / 180) * 12), 1);
  }
  if (spur) line([0, 120], [90, 120], 0);
  if (gap) for (let y = 48; y <= 52; y++) for (let x = 184; x <= 185; x++) {
    const i = (y * width + x) * 4; rgba[i] = rgba[i + 1] = rgba[i + 2] = 255;
  }
  return { rgba, width, height, region: { x: 0.1, y: 0.08, width: 0.75, height: 0.84 }, pageWidthMm: 40, pageHeightMm: 30, threshold: 160 };
}

function polygonArea(points) {
  let sum = 0;
  for (let i = 1; i < points.length; i++) sum += points[i - 1][0] * points[i][1] - points[i][0] * points[i - 1][1];
  return Math.abs(sum / 2);
}

function horizontalWidth(points, y) {
  const xs = [];
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]];
    if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
  }
  xs.sort((a, b) => a - b);
  return xs.length >= 2 ? xs.at(-1) - xs[0] : 0;
}

test('extract one filled exterior boundary rather than two scan-line edges', () => {
  const result = extractContour(fixture());
  assert.deepEqual(result.pointsMm[0], result.pointsMm.at(-1));
  assert.ok(result.pointsMm.length > 10 && result.pointsMm.length < 200);
  assert.ok(result.widthMm > 22.8 && result.widthMm < 23.5);
  assert.ok(result.heightMm > 18.8 && result.heightMm < 19.5);
  assert.ok(result.pointsMm.every(([x, y]) => x >= 0 && y >= 0));
  assert.equal(Math.min(...result.pointsMm.map(p => p[0])), 0);
  assert.equal(Math.min(...result.pointsMm.map(p => p[1])), 0);
  assert.ok(polygonArea(result.pointsMm) > result.widthMm * result.heightMm * 0.5);
  assert.ok(result.previewSvg.includes('<polyline'));
  assert.equal((result.previewSvg.match(/<polyline/g) || []).length, 1);
  assert.equal(result.quality.status, 'review');
});

test('interior circle and crossing lines do not create extra contours', () => {
  const plain = extractContour(fixture({ details: false }));
  const detailed = extractContour(fixture({ details: true }));
  assert.deepEqual(detailed.pointsMm, plain.pointsMm);
});

test('concave neck and stepped flange survive without a convex hull', () => {
  const result = extractContour(fixture());
  const neckWidth = horizontalWidth(result.pointsMm, 4);
  assert.ok(neckWidth > 5.8 && neckWidth < 6.7, `Neck width ${neckWidth} must remain narrow`);
  assert.ok(horizontalWidth(result.pointsMm, result.heightMm - 1) > 22);
  assert.ok(horizontalWidth(result.pointsMm, result.heightMm - 4) < 20);
});

test('small outline break is repaired and an attached one-pixel dimension spur is removed', () => {
  const plain = extractContour(fixture());
  const repaired = extractContour(fixture({ gap: true, spur: true }));
  assert.ok(Math.abs(plain.widthMm - repaired.widthMm) <= 0.2);
  assert.ok(Math.abs(plain.heightMm - repaired.heightMm) <= 0.2);
  assert.ok(repaired.boundsNormalized.x > 0.16);
  assert.ok(repaired.warnings.some(w => w.includes('断口')));
});

test('millimetre scale is applied once to points and output dimensions', () => {
  const a = extractContour(fixture());
  const b = extractContour({ ...fixture(), scale: 2 });
  assert.equal(b.widthMm, a.widthMm * 2);
  assert.equal(b.heightMm, a.heightMm * 2);
  assert.deepEqual(b.pointsMm, a.pointsMm.map(([x, y]) => [x * 2, y * 2]));
  assert.deepEqual(b.boundsNormalized, a.boundsNormalized);
});

test('multiple parts merge without scaling, blocks, polylines or hatches and native DWG reads back', () => {
  const a = extractContour(fixture()), b = extractContour({ ...fixture(), scale: 1.8 });
  const merged = exportContoursDxf([{ ...a, label: 'T50', calibrated: true }, { ...b, label: 'T70', calibrated: false }]);
  assert.equal(merged.placements.length, 2);
  assert.equal(merged.placements[0].widthMm, a.widthMm);
  assert.equal(merged.placements[1].heightMm, b.heightMm);
  for (let part = 0; part < 2; part++) {
    const original = [a, b][part], placed = merged.placements[part];
    for (let i = 0; i < original.pointsMm.length; i++) {
      assert.ok(Math.abs(placed.pointsMm[i][0] - placed.xMm - original.pointsMm[i][0]) < 1e-10);
      assert.ok(Math.abs(placed.pointsMm[i][1] - placed.yMm - original.pointsMm[i][1]) < 1e-10);
    }
  }
  const dwg = dxf_to_dwg(merged.dxf), manifest = JSON.parse(inspect_dwg(dwg));
  assert.equal(new TextDecoder().decode(dwg.subarray(0, 6)), 'AC1027');
  assert.equal(manifest.units, 4);
  assert.equal(manifest.entities, merged.entityCount);
  assert.equal(manifest.types.LINE, a.pointsMm.length + b.pointsMm.length - 2);
  assert.equal(manifest.types.TEXT, 4);
  for (const type of ['INSERT', 'LWPOLYLINE', 'POLYLINE', 'HATCH']) assert.equal(manifest.types[type], undefined);
  assert.ok(merged.warnings.some(w => w.includes('不改变各自比例')));
});

test('invalid and cut-off selections fail with instructions instead of inventing an outline', () => {
  const input = fixture();
  assert.throws(() => extractContour({ ...input, region: { x: -0.1, y: 0, width: 0.5, height: 0.5 } }), /框选/);
  assert.throws(() => extractContour({ ...input, region: { x: 0.1, y: 0.2, width: 0.75, height: 0.6 } }), /闭合|框选|细线/);
  assert.throws(() => extractContour({ ...input, rgba: new Uint8Array(1) }), /RGBA/);
  assert.throws(() => exportContoursDxf([]), /提取/);
  const contour = extractContour(input);
  assert.throws(() => exportContoursDxf([{ ...contour, widthMm: contour.widthMm * 2 }]), /不会自动缩放/);
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import init, { dxf_to_dwg, inspect_dwg } from '../vendor/cad/pdf_cad_wasm.js';

const wasm = await readFile(new URL('../vendor/cad/pdf_cad_wasm_bg.wasm', import.meta.url));
await init({ module_or_path: wasm });
const dxf = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1027
9
$INSUNITS
70
4
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
5
100
100
AcDbEntity
8
0
100
AcDbLine
10
1
20
2
30
0
11
40
21
80
31
0
0
LWPOLYLINE
5
101
100
AcDbEntity
8
0
100
AcDbPolyline
90
4
70
1
10
0
20
0
10
100
20
0
10
100
20
50
10
0
20
50
0
TEXT
5
102
100
AcDbEntity
8
0
100
AcDbText
10
5
20
10
30
0
40
3
1
PDF 转 CAD
50
0
7
STANDARD
0
ENDSEC
0
EOF
`;
const dwg = dxf_to_dwg(new TextEncoder().encode(dxf));
assert.equal(new TextDecoder().decode(dwg.subarray(0, 6)), 'AC1027');
assert.ok(dwg.byteLength > 512, 'Expected a complete DWG binary');
const manifest = JSON.parse(inspect_dwg(dwg));
assert.equal(manifest.version, 'AC1027');
assert.equal(manifest.entities, 3);
assert.equal(manifest.types.LINE, 1);
assert.equal(manifest.types.LWPOLYLINE, 1);
assert.equal(manifest.types.TEXT, 1);
assert.equal(manifest.units, 4);
assert.throws(() => dxf_to_dwg(new Uint8Array()));
assert.throws(() => inspect_dwg(new TextEncoder().encode('not a DWG')));
console.log(JSON.stringify({ passed: true, bytes: dwg.length, ...manifest }, null, 2));

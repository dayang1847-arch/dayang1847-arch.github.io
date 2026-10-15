# CAD WASM bridge

This small `wasm-bindgen` wrapper uses **unmodified acadrust 0.5.5** to parse DXF
bytes and write an actual binary AutoCAD R2013 DWG (`AC1027`). It uses in-memory
readers and writers, with no upload, file-system access or CAD installation.

Public API (both functions throw on failure):

```js
import init, { dxf_to_dwg, inspect_dwg } from './vendor/cad/pdf_cad_wasm.js';
await init();
const dwgBytes = dxf_to_dwg(dxfBytes); // Uint8Array → Uint8Array
const manifest = JSON.parse(inspect_dwg(dwgBytes));
```

`inspect_dwg` parses the DWG using acadrust's independent reader and returns its
file signature, entity counts by type, unit code and reported drawing extents.
The bridge rejects empty DXF drawings and inputs exceeding 128 MiB.

## Rebuild

Use a current Rust toolchain, `wasm32-unknown-unknown`, and a `wasm-bindgen` CLI
version matching the `wasm-bindgen` version in Cargo.lock. The bundled generated
files were built with Rust 1.99.0 and wasm-bindgen 0.2.129.

```sh
rustup target add wasm32-unknown-unknown
cargo test --manifest-path wasm-engine/Cargo.toml --locked
cargo build --manifest-path wasm-engine/Cargo.toml --locked --release --target wasm32-unknown-unknown
wasm-bindgen wasm-engine/target/wasm32-unknown-unknown/release/pdf_cad_wasm.wasm --target web --out-dir vendor/cad --out-name pdf_cad_wasm
node wasm-engine/smoke-test.mjs
```

The native test checks the actual line coordinates after a DXF → DWG → document
round trip. The Node test runs the generated **same browser WASM** and checks a
line, a closed polyline and a text entity, units, native DWG signature and invalid
input handling.

## License

Wrapper source: MPL-2.0. acadrust: MPL-2.0 (unmodified dependency),
[source at version v0.5.5](https://github.com/hakanaktt/acadrust/tree/v0.5.5).
Generated WASM also contains the Rust standard library, wasm-bindgen and the
locked dependencies listed in Cargo.lock. See `../vendor/cad/NOTICE.md`.

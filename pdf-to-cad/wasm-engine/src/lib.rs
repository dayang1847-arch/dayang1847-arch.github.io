//! Runs entirely in memory: DXF input and native binary DWG output.
//! acadrust is used as an unmodified MPL-2.0 dependency.

use acadrust::{DwgReader, DwgWriter, DxfReader, DxfVersion};
use serde_json::json;
use std::collections::BTreeMap;
use std::io::Cursor;
use wasm_bindgen::prelude::*;

const MAX_INPUT_BYTES: usize = 128 * 1024 * 1024;

fn convert(bytes: &[u8]) -> Result<Vec<u8>, String> {
    if bytes.is_empty() {
        return Err("DXF 数据为空".into());
    }
    if bytes.len() > MAX_INPUT_BYTES {
        return Err("单页 DXF 数据超过 128 MB，请降低扫描分辨率或减少曲线细节".into());
    }
    let mut doc = DxfReader::from_reader(Cursor::new(bytes.to_vec()))
        .map_err(|e| format!("DXF 读取失败：{e}"))?
        .read()
        .map_err(|e| format!("DXF 解析失败：{e}"))?;
    if doc.entities().next().is_none() {
        return Err("DXF 没有可转换的图形实体".into());
    }
    // The PDF conversion path uses 2D entities; R2013 supports Unicode,
    // true colours, line weights, splines and the chosen document units.
    doc.version = DxfVersion::AC1027;
    DwgWriter::write_to_vec(&doc).map_err(|e| format!("DWG 写入失败：{e}"))
}

/// Convert ASCII or binary DXF into a real AutoCAD R2013 binary DWG.
/// Returned bytes start with the AC1027 signature, never DXF text.
#[wasm_bindgen]
pub fn dxf_to_dwg(bytes: &[u8]) -> Result<Vec<u8>, JsValue> {
    convert(bytes).map_err(|error| JsValue::from_str(&error))
}

fn inspect(bytes: &[u8]) -> Result<String, String> {
    if bytes.len() < 6 || !bytes.starts_with(b"AC10") {
        return Err("数据不是 DWG 文件".into());
    }
    if bytes.len() > MAX_INPUT_BYTES {
        return Err("DWG 数据超过 128 MB".into());
    }
    let doc = DwgReader::from_stream(Cursor::new(bytes))
        .read()
        .map_err(|e| format!("DWG 读回失败：{e}"))?;
    let mut types: BTreeMap<String, usize> = BTreeMap::new();
    for entity in doc.entities() {
        *types.entry(entity.as_entity().entity_type().to_string()).or_default() += 1;
    }
    Ok(json!({
        "version": String::from_utf8_lossy(&bytes[..6]),
        "entities": doc.entities().count(),
        "types": types,
        "units": doc.header.insertion_units,
        "extents": {
            "min": [doc.header.model_space_extents_min.x, doc.header.model_space_extents_min.y],
            "max": [doc.header.model_space_extents_max.x, doc.header.model_space_extents_max.y]
        }
    }).to_string())
}

/// Independently parse the produced DWG and return a compact JSON manifest.
#[wasm_bindgen]
pub fn inspect_dwg(bytes: &[u8]) -> Result<String, JsValue> {
    inspect(bytes).map_err(|error| JsValue::from_str(&error))
}

#[cfg(test)]
mod tests {
    use super::*;
    use acadrust::{CadDocument, DxfWriter, EntityType, Line};

    #[test]
    fn writes_native_dwg_and_reads_geometry_back() {
        let mut doc = CadDocument::with_version(DxfVersion::AC1027);
        doc.header.insertion_units = 4;
        doc.add_entity(EntityType::Line(Line::from_coords(1., 2., 0., 40., 80., 0.))).unwrap();
        let dxf = DxfWriter::new(&doc).write_to_vec().unwrap();
        let dwg = convert(&dxf).unwrap();
        assert!(dwg.starts_with(b"AC1027"));
        let manifest: serde_json::Value = serde_json::from_str(&inspect(&dwg).unwrap()).unwrap();
        assert_eq!(manifest["version"], "AC1027");
        assert_eq!(manifest["entities"], 1);
        assert_eq!(manifest["types"]["LINE"], 1);
        assert_eq!(manifest["units"], 4);
        let loaded = DwgReader::from_stream(Cursor::new(&dwg)).read().unwrap();
        let EntityType::Line(line) = loaded.entities().next().unwrap() else { panic!("wrong geometry") };
        assert_eq!((line.start.x, line.start.y, line.end.x, line.end.y), (1., 2., 40., 80.));
    }

    #[test]
    fn rejects_empty_input() {
        assert!(convert(&[]).is_err());
        assert!(inspect(b"not a DWG").is_err());
    }
}

// Measurement state is owned by the worker, never trusted from export requests.
export function calibrateContourRecord(record, point1, point2, valueMm) {
  const points = [point1, point2];
  if (!points.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))) {
    throw new Error('请选择轮廓上两个有效的尺寸端点。');
  }
  if (points.some(([x,y]) => x < -0.001 || y < -0.001 || x > record.widthMm + 0.001 || y > record.heightMm + 0.001)) {
    throw new Error('尺寸端点超出轮廓范围，请重新选择。');
  }
  if (!Number.isFinite(valueMm) || valueMm <= 0 || valueMm > 1000000) {
    throw new Error('标注尺寸必须是大于 0 的毫米数值。');
  }
  const distance = Math.hypot(point2[0]-point1[0], point2[1]-point1[1]);
  if (distance < 0.001) throw new Error('两个尺寸端点距离过近，请重新选择。');
  const factor = valueMm / distance;
  const scale = (record.scale || 1) * factor;
  if (!Number.isFinite(scale) || scale < 0.000001 || scale > 1000) {
    throw new Error('校准比例超出范围，请检查端点和标注单位。');
  }
  const transform = ([x,y]) => [x*factor,y*factor];
  const reference = points.map(transform);
  const measurementMm = Math.hypot(reference[1][0]-reference[0][0], reference[1][1]-reference[0][1]);
  const errorMm = Math.abs(measurementMm-valueMm);
  if (errorMm > Math.max(1e-8,valueMm*1e-10)) throw new Error('校准基准校验失败。');
  const quality=record.quality ? {...record.quality} : undefined;
  if(Number.isFinite(quality?.nominalCleanupRangeMm))quality.nominalCleanupRangeMm*=factor;
  return {...record, quality, pointsMm:record.pointsMm.map(transform), widthMm:record.widthMm*factor,
    heightMm:record.heightMm*factor, scale, calibrated:true, measurementMm, errorMm,
    calibration:{point1:reference[0],point2:reference[1],valueMm,measurementMm,errorMm}};
}

export function rotateContourRecord(record) {
  const rotate=([x,y])=>[record.heightMm-y,x];
  const item={...record,pointsMm:record.pointsMm.map(rotate),widthMm:record.heightMm,heightMm:record.widthMm};
  if(record.basePoints){
    item.basePoints=record.basePoints.map(([x,y])=>[record.baseHeight-y,x]);
    item.baseWidth=record.baseHeight;item.baseHeight=record.baseWidth;
  }
  if(record.calibration)item.calibration={...record.calibration,
    point1:rotate(record.calibration.point1),point2:rotate(record.calibration.point2)};
  return item;
}

export function selectCalibratedContours(records, items) {
  if (!Array.isArray(items) || !items.length || items.length > 100) throw new Error('请选择 1–100 个已校准轮廓。');
  const seen = new Set();
  return items.map(item => {
    const record = records.get(item.contourId);
    if (!record || seen.has(item.contourId)) throw new Error('轮廓已清空或重复选择，请重新选择。');
    seen.add(item.contourId);
    if (!record.calibrated || !record.calibration) throw new Error('请先为每个选中的轮廓选择两个端点并校准尺寸。');
    const label = String(item.label || record.sourceName || 'Contour').replace(/[\x00-\x1f]/g,' ').trim().slice(0,100);
    return {...record,label};
  });
}

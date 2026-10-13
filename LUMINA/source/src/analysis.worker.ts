import { calculateAnalysis } from '../shared/photometry';
self.onmessage = e => {
  const { fixtures, products, plane, maintenance, revision } = e.data;
  try { self.postMessage({ result: calculateAnalysis(fixtures,products,plane,maintenance,revision) }); }
  catch (error) { self.postMessage({ error: error instanceof Error ? error.message : '计算失败', revision }); }
};

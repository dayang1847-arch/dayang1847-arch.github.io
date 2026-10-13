export type Vec3 = [number, number, number];
export type SceneType = 'indoor' | 'outdoor';
export type Category = '筒灯' | '射灯' | '线性灯' | '路灯' | '庭院灯' | '投光灯';
export type Mode = 'scene' | 'analysis' | 'devices';
export interface Photometry {
  version: string; labels: Record<string, string>; vertical: number[]; horizontal: number[];
  candela: number[][]; watts: number | null; lumens: number; absolute: boolean;
  dimensions: Vec3; units: 'meter'; peak: number; filename: string;
}
export interface Calibration {
  scale: number; origin: Vec3; rotation: Vec3; emitter: Vec3;
  direction: Vec3; c0: number; material: string; emissiveMeshes: string[];
}
export interface Product {
  id: string; version: number; name: string; model: string; category: Category;
  watts: number | null; cct: number; cctRange: [number, number] | null;
  sceneTypes: SceneType[]; status: 'draft' | 'ready'; sample: boolean;
  assetId?: string; modelFormat?: 'cad' | 'glb'; thumbnail?: string;
  photometry?: Photometry; calibration: Calibration; createdAt: string;
}
export interface Fixture {
  id: string; productId: string; productVersion: number; position: Vec3; rotation: Vec3;
  level: number; cct: number; group: string; slotId?: string;
}
export interface LightingPreset { id: string; name: string; values: { id: string; level: number; cct: number }[] }
export interface CameraPose { position: Vec3; target: Vec3 }
export interface ScenePlan {
  id: string; schemaVersion: 1; name: string; sceneType: SceneType; fixtures: Fixture[];
  presets: LightingPreset[]; environment: 'day' | 'dusk' | 'night'; camera?: CameraPose;
  revision: number; savedAt?: string;
}
export interface Slot { id: string; position: Vec3; rotation: Vec3; group: string; category: Category; label: string }
export interface AnalysisPlane { kind: 'work' | 'ground' | 'vertical'; width: number; depth: number; height: number; z: number; nx: number; ny: number }
export interface AnalysisResult { revision: number; plane: AnalysisPlane; values: number[]; min: number; max: number; avg: number; uniformity: number; duration: number; maintenance: number }
export type JobState = 'queued' | 'converting' | 'writing' | 'ready' | 'error' | 'cancelled';
export interface ConversionJob { id: string; assetId: string; filename: string; state: JobState; error?: string; meshCount?: number; triangles?: number; createdAt: string }
export interface DeviceCapability { dimming: boolean; cctRange: [number, number] | null; d4i: boolean }
export interface DeviceInfo {
  id: string; gateway: string; bus: number; address: number; name: string; online: boolean;
  level: number; cct: number; capability: DeviceCapability;
  luminaireData?: { model: string; manufacturer: string; ratedPower: number | null; luminousFlux: number; nominalCCT: number };
  telemetry: { power: number; energy: number; hours: number; temperature: number; fault: string | null };
}
export interface DeviceBinding { fixtureId: string; deviceId: string }
export interface DeviceState { simulated: true; connected: boolean; devices: DeviceInfo[]; bindings: DeviceBinding[]; behavior: 'normal' | 'timeout' | 'failure'; lastCommand?: { success: boolean; message: string; at: string } }
export interface ControlLog { id: string; operation: string; source: 'simulation'; state: 'pending' | 'confirmed' | 'failed'; requestedAt: string; finishedAt?: string; durationMs?: number; request: unknown; response?: unknown; error?: string }
export interface ControlDiagnostics {
  simulated: true; adapter: { name: string; transport: string; connected: boolean; behavior: DeviceState['behavior']; bus: number; deviceCount: number; boundCount: number; supported: string[] };
  runtime: { kind?: 'node' | 'browser'; node: string; platform: string; uptime: number; memoryMB: number | null; dataPath: string };
  devices: DeviceInfo[]; bindings: DeviceBinding[]; logs: ControlLog[];
}
export interface Catalog { schemaVersion: 1; products: Product[] }
export interface BundleManifest { schemaVersion: 1; products: Product[]; plans: ScenePlan[]; assets: Record<string, { files: { name: string; size: number; sha256: string }[] }> }
export const DEFAULT_CALIBRATION: Calibration = { scale: 1, origin: [0, 0, 0], rotation: [0, 0, 0], emitter: [0, 0, 0], direction: [0, -1, 0], c0: 0, material: 'original', emissiveMeshes: [] };

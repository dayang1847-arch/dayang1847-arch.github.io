import { WORLD, FACTIONS, UNITS, BUILDINGS, BASE_UPGRADES, TECHS, RULES } from './game-data.js';
import * as Geography from './asia-map.js';
const { NAV_GRID, isOnLand, segmentOnLand } = Geography;
export const ENGINE_VERSION = 2;

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const squaredDistance = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const within = (a, b, r) => squaredDistance(a, b) <= r * r;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const clone = value => JSON.parse(JSON.stringify(value));
const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 20 && p.x <= WORLD.width - 20 && p.y >= 20 && p.y <= WORLD.height - 20;
const playerOf = (game, id) => game.players.find(p => p.id === id);
const entityOf = (game, id) => { const r = runtimeFor(game); return r.units.get(id) || r.buildings.get(id) || r.cities.get(id); };
const navigationPositions = new WeakMap();
const positionOf = e => {
  if (!Number.isFinite(e.navX) || !Number.isFinite(e.navY)) return e;
  let position = navigationPositions.get(e);
  if (!position || position.x !== e.navX || position.y !== e.navY || position.component !== e.component) {
    position = { x: e.navX, y: e.navY, component: e.component, navNode: e.navNode }; navigationPositions.set(e, position);
  }
  return position;
};
const activeBuilding = b => b.hp > 0 && b.progress >= 1 && !b.packing;
const cityRadius = c => c.radius || (c.kind === 'town' ? RULES.townRadius : RULES.cityRadius);
const MAX_CITY_RADIUS = Math.max(...WORLD.cities.map(cityRadius));
const uid = (game, prefix) => `${prefix}-${game.nextId++}`;
const bad = error => ({ ok: false, error });
const good = () => ({ ok: true });
const caches = new WeakMap();
const runtimes = new WeakMap();
const GRID = NAV_GRID?.cellSize || WORLD.navCellSize || 20, COLS = Math.ceil(WORLD.width / GRID), ROWS = Math.ceil(WORLD.height / GRID);
const nodePoints = Array.from({ length: NAV_GRID?.cells?.length || COLS * ROWS }, (_, index) => NAV_GRID?.points?.[index] || { x: (index % COLS) * GRID + GRID / 2, y: Math.floor(index / COLS) * GRID + GRID / 2 });
const landCells = NAV_GRID?.cells || Uint8Array.from(nodePoints, point => isOnLand(point) ? 1 : 0);
const terrainBlocked = (x, y, margin = 7) => WORLD.obstacles.some(o => x > o.x - margin && x < o.x + o.w + margin && y > o.y - margin && y < o.y + o.h + margin);
const landCellAt = (x, y) => x >= 0 && y >= 0 && x < WORLD.width && y < WORLD.height && landCells[Math.floor(y / GRID) * COLS + Math.floor(x / GRID)] === 1;
const blocked = (x, y, margin = 7) => !isOnLand({ x, y }) || (!landCellAt(x, y) && Geography.nearestNavigationNode?.({ x, y }) == null) || terrainBlocked(x, y, Math.min(margin, 7));
const passable = (cx, cy) => cx >= 0 && cy >= 0 && cx < COLS && cy < ROWS && landCells[cy * COLS + cx] === 1 && !terrainBlocked(nodePoints[cy * COLS + cx].x, nodePoints[cy * COLS + cx].y);
const segmentCache = new Map();
function drySegment(from, to) {
  const a = `${from.x.toFixed(3)},${from.y.toFixed(3)}`, b = `${to.x.toFixed(3)},${to.y.toFixed(3)}`, key = a < b ? `${a}:${b}` : `${b}:${a}`;
  if (segmentCache.has(key)) return segmentCache.get(key);
  const dry = segmentOnLand(from, to, 1);
  if (segmentCache.size > 60000) segmentCache.clear();
  segmentCache.set(key, dry);
  return dry;
}

class SpatialBuckets {
  constructor(entries, point = e => e, cellSize = 96) { this.cellSize = cellSize; this.point = point; this.buckets = new Map(); for (const e of entries) this.insert(e); }
  key(point) { return (Math.floor(point.y / this.cellSize) + 32768) * 65536 + Math.floor(point.x / this.cellSize) + 32768; }
  insert(e) { const key = this.key(this.point(e)); if (!this.buckets.has(key)) this.buckets.set(key, []); this.buckets.get(key).push(e); }
  near(point, radius) {
    const result = [], size = this.cellSize;
    for (let y = Math.floor((point.y - radius) / size); y <= Math.floor((point.y + radius) / size); y++) for (let x = Math.floor((point.x - radius) / size); x <= Math.floor((point.x + radius) / size); x++) {
      const entries = this.buckets.get((y + 32768) * 65536 + x + 32768); if (entries) for (const e of entries) if (within(this.point(e), point, radius)) result.push(e);
    }
    return result;
  }
  some(point, radius, predicate) {
    const size = this.cellSize;
    for (let y = Math.floor((point.y - radius) / size); y <= Math.floor((point.y + radius) / size); y++) for (let x = Math.floor((point.x - radius) / size); x <= Math.floor((point.x + radius) / size); x++) {
      const entries = this.buckets.get((y + 32768) * 65536 + x + 32768);
      if (entries) for (const e of entries) if (predicate(e) && within(this.point(e), point, radius)) return true;
    }
    return false;
  }
}

function runtimeFor(game) {
  let r = runtimes.get(game);
  if (!r) { r = { units: new Map(), buildings: new Map(), cities: new Map(), cityRates: new Map(), damagedCities: new Set() }; runtimes.set(game, r); }
  if (r.cityRef !== game.cities || r.cityLength !== game.cities.length) {
    r.cityRef = game.cities; r.cityLength = game.cities.length; r.cities = new Map(game.cities.map(c => [c.id, c])); r.cityBuckets = new SpatialBuckets(game.cities, positionOf); r.captureBuckets = new SpatialBuckets(game.cities, positionOf, 32); r.cityPublicBuckets = new SpatialBuckets(game.cities);
    r.cityMetadata = new Map(game.cities.map(c => [c.id, Object.freeze({ id: c.id, name: c.name, nameEn: c.nameEn, regionId: c.regionId, x: c.x, y: c.y, navX: c.navX, navY: c.navY, lon: c.lon, lat: c.lat, sourceId: c.sourceId, component: c.component, port: Boolean(c.port), shippingTargets: c.port ? Object.freeze((shippingGraph.get(c.id) || []).map(e => e.to)) : undefined, radius: cityRadius(c), kind: c.kind })]));
  }
  if (r.unitRef !== game.units || r.unitLength !== game.units.length) { r.unitRef = game.units; r.unitLength = game.units.length; r.units = new Map(game.units.map(u => [u.id, u])); }
  if (r.buildingRef !== game.buildings || r.buildingLength !== game.buildings.length) { r.buildingRef = game.buildings; r.buildingLength = game.buildings.length; r.buildings = new Map(game.buildings.map(b => [b.id, b])); }
  return r;
}

const supplyGraph = new Map(WORLD.cities.map(c => [c.id, []]));
for (const [a, b] of WORLD.supplyLinks || []) { supplyGraph.get(a)?.push(b); supplyGraph.get(b)?.push(a); }
const shippingGraph = new Map();
for (const lane of WORLD.shippingLanes || []) {
  const a = lane.fromId, b = lane.toId;
  if (!shippingGraph.has(a)) shippingGraph.set(a, []); if (!shippingGraph.has(b)) shippingGraph.set(b, []);
  shippingGraph.get(a).push({ to: b, lane, reverse: false }); shippingGraph.get(b).push({ to: a, lane, reverse: true });
  supplyGraph.get(a)?.push(b); supplyGraph.get(b)?.push(a);
}

function componentAt(point) { if (Number.isInteger(point.component)) return point.component; const index = nearestCell(point.x, point.y); return index === null ? null : NAV_GRID?.components?.[index] ?? 0; }

function shippingPlan(game, playerId, unit, destination) {
  const r = runtimeFor(game), sourceComponent = componentAt(unit), targetComponent = componentAt(destination);
  if (sourceComponent === targetComponent) return { ok: true, route: null };
  const ports = game.cities.filter(c => c.port), startPorts = ports.filter(c => c.owner === playerId && c.component === sourceComponent);
  if (!startPorts.length) return bad('需要先占领本陆地上的港口，才能自动航运。');
  const scores = new Map(), previous = new Map(), pending = new MinHeap();
  for (const port of startPorts) { const cost = distance(unit, positionOf(port)) / UNITS[unit.type].speed; scores.set(port.id, cost); pending.push({ index: port.id, score: cost }); }
  while (pending.length) {
    const item = pending.pop(); if (item.score !== scores.get(item.index)) continue;
    for (const edge of shippingGraph.get(item.index) || []) {
      const cost = item.score + (edge.lane.duration || 30);
      if (cost >= (scores.get(edge.to) ?? Infinity)) continue;
      scores.set(edge.to, cost); previous.set(edge.to, { from: item.index, ...edge }); pending.push({ index: edge.to, score: cost });
    }
  }
  const destinations = ports.filter(c => c.component === targetComponent && scores.has(c.id)).sort((a, b) => scores.get(a.id) + distance(positionOf(a), destination) / UNITS[unit.type].speed - scores.get(b.id) - distance(positionOf(b), destination) / UNITS[unit.type].speed);
  if (!destinations.length) return bad('没有通往目标陆地的港口航线。');
  const toPort = destinations[0].id, legs = []; let at = toPort;
  while (previous.has(at)) { const edge = previous.get(at); legs.unshift({ fromPort: edge.from, toPort: at, duration: edge.lane.duration || 30, path: edge.reverse ? [...edge.lane.path].reverse() : [...edge.lane.path] }); at = edge.from; }
  if (!legs.length || !r.cities.get(at)) return bad('没有通往目标陆地的港口航线。');
  return { ok: true, route: { fromPort: at, toPort, legs, destinationComponent: targetComponent } };
}

function startTransit(game, unit) {
  const route = unit.route, r = runtimeFor(game), source = r.cities.get(route.fromPort), destination = r.cities.get(route.toPort);
  const path = [positionOf(source)];
  for (const leg of route.legs) path.push(...leg.path);
  path.push(positionOf(destination));
  const duration = route.legs.reduce((total, leg) => total + leg.duration, 0), lengths = path.slice(1).map((p, i) => distance(path[i], p));
  unit.transit = { fromPort: route.fromPort, toPort: route.toPort, remaining: duration, duration, path, lengths, totalLength: lengths.reduce((a, b) => a + b, 0), segmentIndex: 0 };
  unit.path = []; unit.pathIndex = 0; unit.travelCarry = 0;
}

function stepTransit(game, unit, dt) {
  const t = unit.transit; t.remaining = Math.max(0, t.remaining - dt);
  let traveled = t.totalLength * (1 - t.remaining / t.duration), index = 0;
  while (index < t.lengths.length - 1 && traveled > t.lengths[index]) { traveled -= t.lengths[index]; index++; }
  const a = t.path[index], b = t.path[index + 1] || a, ratio = t.lengths[index] ? clamp(traveled / t.lengths[index], 0, 1) : 1;
  unit.x = a.x + (b.x - a.x) * ratio; unit.y = a.y + (b.y - a.y) * ratio; t.segmentIndex = index;
  if (t.remaining <= 1e-7) {
    const port = runtimeFor(game).cities.get(t.toPort), landing = positionOf(port);
    unit.x = landing.x; unit.y = landing.y; unit.component = port.component; unit.path = []; unit.pathIndex = 0;
    delete unit.transit; delete unit.route;
  }
}

function event(game, type, playerId, text, textEn) {
  game.events.push({ id: uid(game, 'event'), time: game.time, type, playerId, text, textEn });
  if (game.events.length > 24) game.events.shift();
}

function addBuilding(game, player, type, x, y, ready = false) {
  const def = BUILDINGS[type];
  const b = { id: uid(game, 'building'), owner: player.id, type, x, y, hp: def.hp, maxHp: def.hp, progress: ready ? 1 : 0, remaining: ready ? 0 : def.duration, cooldown: 0 };
  game.buildings.push(b);
  return b;
}

function statsFor(player, type) {
  const base = UNITS[type];
  return type === 'unique' ? { ...base, ...FACTIONS[player.faction].unique.stats } : base;
}

function addUnit(game, player, type, x, y) {
  const stats = statsFor(player, type);
  const u = { id: uid(game, 'unit'), owner: player.id, type, x, y, component: componentAt({ x, y }), hp: stats.hp, maxHp: stats.hp, skillReadyAt: 0, cooldown: 0, order: { type: 'hold' }, buffs: [], path: [], pathIndex: 0, kills: 0 };
  game.units.push(u);
  return u;
}

export function createGame(players) {
  if (!Array.isArray(players) || players.length < 2 || players.length > RULES.maxPlayers) throw new Error('A game needs 2–4 players.');
  if (new Set(players.map(p => p.id)).size !== players.length || players.some(p => typeof p.id !== 'string' || !p.id || typeof p.faction !== 'string' || !Object.hasOwn(FACTIONS, p.faction))) throw new Error('Invalid player identities or factions.');
  const game = { version: ENGINE_VERSION, mapVersion: WORLD.mapVersion, time: 0, status: 'playing', winner: null, nextId: 1, players: [], units: [], buildings: [], cities: [], crown: { playerId: null, progress: 0, required: RULES.crownDuration }, events: [], botTimers: {}, connectionAt: 0 };
  const takenSlots = new Set();
  players.forEach((input, index) => {
    let slot = Number.isInteger(input.slot) && input.slot >= 0 && input.slot < 4 && !takenSlots.has(input.slot) ? input.slot : index;
    while (takenSlots.has(slot)) slot = (slot + 1) % 4;
    takenSlots.add(slot);
    const spawn = WORLD.spawns[slot];
    const p = { id: input.id, name: String(input.name || `Player ${index + 1}`).slice(0, 24), faction: input.faction, slot, alive: true, food: 280, silver: 360, level: 1, capacity: RULES.initialCapacity, research: { weapons: 0, armor: 0, logistics: 0 }, queue: [], base: null, heroReadyAt: 0, score: { kills: 0, cities: 0, damage: 0 } };
    game.players.push(p);
    const base = addBuilding(game, p, 'base', spawn.x, spawn.y, true);
    p.base = { id: base.id, x: base.x, y: base.y, hp: base.hp, maxHp: base.maxHp };
    for (const type of ['barracks', 'farm', 'workshop']) {
      const point = buildPosition(game, p, {});
      if (!point) throw new Error(`No legal starting building position for slot ${slot}.`);
      addBuilding(game, p, type, point.x, point.y, true);
    }
    for (const [i, type] of ['spear', 'spear', 'archer'].entries()) {
      let point = spawn;
      for (let angleIndex = 0; angleIndex < 24; angleIndex++) {
        const angle = (angleIndex + i * 8) * Math.PI / 12;
        const candidate = { x: spawn.x + Math.cos(angle) * (18 + i * 6), y: spawn.y + Math.sin(angle) * (18 + i * 6) };
        if (finitePoint(candidate) && !blocked(candidate.x, candidate.y, 12)) { point = candidate; break; }
      }
      addUnit(game, p, type, point.x, point.y);
    }
  });
  game.cities = WORLD.cities.map(c => ({ ...c, owner: null, hp: c.kind === 'capital' ? 1400 : c.kind === 'town' ? 400 : 800, maxHp: c.kind === 'capital' ? 1400 : c.kind === 'town' ? 400 : 800, guardHp: c.kind === 'capital' ? 650 : c.kind === 'town' ? 80 : 240, capture: { owner: null, progress: 0 }, settleUntil: 0, connected: false, guardCooldown: 0 }));
  event(game, 'start', null, '诸军入场，天下争锋。', 'The armies arrive. The struggle begins.');
  return game;
}

function visibilityFor(game, playerId) {
  const circles = [];
  const p = playerOf(game, playerId);
  if (!p) return circles;
  for (const b of game.buildings) if (b.owner === playerId && b.hp > 0) circles.push({ x: b.x, y: b.y, r: b.type === 'base' ? 360 : b.type === 'tower' ? 285 : 180 });
  for (const c of game.cities) if (c.owner === playerId) circles.push({ ...positionOf(c), r: c.kind === 'town' ? 65 : 245 });
  for (const u of game.units) if (u.owner === playerId && u.hp > 0) {
    const raid = u.buffs.some(b => b.effect === 'raid' && b.until > game.time);
    circles.push({ x: u.x, y: u.y, r: statsFor(p, u.type).sight * (raid ? 1.3 : 1) });
  }
  circles.sort((a, b) => b.r - a.r);
  const merged = [], exact = new Set();
  for (const circle of circles) {
    const key = `${circle.x}:${circle.y}:${circle.r}`; if (exact.has(key)) continue;
    let covered = false;
    for (const larger of merged) {
      if (larger.r <= circle.r) break;
      if (within(larger, circle, larger.r - circle.r)) { covered = true; break; }
    }
    if (!covered) { merged.push(circle); exact.add(key); }
  }
  return merged;
}

const visibleAt = (entity, visibility) => visibility.some(v => within(entity, v, v.r));

function canAfford(p, cost) { return p.food >= cost.food && p.silver >= cost.silver; }
function pay(p, cost) { p.food -= cost.food; p.silver -= cost.silver; }

function reservedCount(game, p, hero = false) {
  return game.units.filter(u => u.owner === p.id && (u.type === 'hero') === hero && u.hp > 0).length + p.queue.filter(q => q.type === 'train' && (q.unit === 'hero') === hero).length;
}

function buildPosition(game, p, command) {
  const anchors = game.buildings.filter(b => b.owner === p.id && activeBuilding(b) && (b.type === 'base' || b.type === 'camp')).map(b => ({ x: b.x, y: b.y, component: componentAt(b), radius: 240 }));
  anchors.push(...game.cities.filter(c => c.owner === p.id && c.connected && c.settleUntil <= game.time).map(c => ({ ...positionOf(c), radius: 150 })));
  const valid = point => finitePoint(point) && !blocked(point.x, point.y, 24) && anchors.some(a => distance(a, point) <= a.radius && a.component === componentAt(point)) && !game.buildings.some(b => b.hp > 0 && distance(b, point) < (b.type === 'base' ? 24 : 18)) && !runtimeFor(game).cityBuckets.near(point, 24).some(c => c.kind !== 'town' && distance(positionOf(c), point) < Math.min(24, cityRadius(c)));
  if (Number.isFinite(command.x) && Number.isFinite(command.y)) return valid(command) ? { x: command.x, y: command.y } : null;
  if (command.x !== undefined || command.y !== undefined) return null;
  for (const a of anchors) for (const radius of [28, 45, 65, 90, 130, 180, 210]) for (let i = 0; i < 24; i++) {
    const angle = i * Math.PI / 12, point = { x: a.x + Math.cos(angle) * radius, y: a.y + Math.sin(angle) * radius };
    if (valid(point)) return point;
  }
  return null;
}

export function applyCommand(game, playerId, command) {
  if (!game || game.status !== 'playing') return bad('对局已经结束。');
  const p = playerOf(game, playerId);
  if (!p || !p.alive) return bad('玩家不在当前对局中。');
  if (!command || typeof command !== 'object' || typeof command.type !== 'string') return bad('指令格式无效。');
  if (command.type === 'surrender') { eliminatePlayer(game, playerId, 'surrender'); return good(); }
  if (command.type === 'build') {
    const type = command.building;
    if (typeof type !== 'string' || !Object.hasOwn(BUILDINGS, type) || type === 'base') return bad('建筑类型无效。');
    const def = BUILDINGS[type];
    if (def.faction && def.faction !== p.faction) return bad('该建筑仅限对应阵营。');
    if (p.level < def.level) return bad('需要升级主城。');
    if (game.buildings.filter(b => b.owner === p.id && b.type === type && b.hp > 0 && !b.temporary).length >= def.limit) return bad('已达到建筑数量上限。');
    if (!canAfford(p, def.cost)) return bad('粮草或银两不足。');
    const point = buildPosition(game, p, command);
    if (!point) return bad('这里不能建设，请选择主城或已整顿城池附近的空地。');
    pay(p, def.cost); addBuilding(game, p, type, point.x, point.y); return good();
  }
  if (command.type === 'train') {
    const type = command.unit;
    if (typeof type !== 'string' || !Object.hasOwn(UNITS, type)) return bad('兵种类型无效。');
    const def = UNITS[type];
    if (p.level < def.level) return bad('需要升级主城。');
    if (type === 'hero' && (game.time < p.heroReadyAt || reservedCount(game, p, true) >= 1)) return bad('名将正在恢复，或已经在场。');
    if (type !== 'hero' && reservedCount(game, p) >= p.capacity) return bad('军队容量已满，请建设民居。');
    const suitable = b => b.owner === p.id && activeBuilding(b) && (b.type === def.building || (b.type === 'camp' && type !== 'hero' && type !== 'siege'));
    let building;
    if (command.buildingId) { building = game.buildings.find(b => b.id === command.buildingId); if (!building || !suitable(building)) return bad('征兵建筑不可用。'); }
    else building = game.buildings.filter(suitable).sort((a, b) => p.queue.filter(q => q.buildingId === a.id).length - p.queue.filter(q => q.buildingId === b.id).length)[0];
    if (!building) return bad('请先建设对应征兵建筑。');
    if (p.queue.filter(q => q.type === 'train' && q.buildingId === building.id).length >= 5) return bad('征兵队列已满。');
    if (!canAfford(p, def.cost)) return bad('粮草或银两不足。');
    pay(p, def.cost);
    p.queue.push({ id: uid(game, 'queue'), type: 'train', unit: type, buildingId: building.id, duration: def.duration, remaining: def.duration });
    return good();
  }
  if (command.type === 'upgrade') {
    if (p.level >= 3) return bad('主城已达到最高等级。');
    if (p.queue.some(q => q.type === 'upgrade')) return bad('主城正在升级。');
    const def = BASE_UPGRADES[p.level + 1];
    if (!canAfford(p, def.cost)) return bad('粮草或银两不足。');
    pay(p, def.cost); p.queue.push({ id: uid(game, 'queue'), type: 'upgrade', level: p.level + 1, duration: def.duration, remaining: def.duration }); return good();
  }
  if (command.type === 'research') {
    const tech = command.tech;
    if (typeof tech !== 'string' || !Object.hasOwn(TECHS, tech)) return bad('科技类型无效。');
    const def = TECHS[tech];
    if (p.level < def.level) return bad('需要二级主城。');
    if (p.research[tech] || p.queue.some(q => q.type === 'research' && q.tech === tech)) return bad('该科技已研究或正在研究。');
    if (p.queue.some(q => q.type === 'research')) return bad('请等待当前研究完成。');
    if (!canAfford(p, def.cost)) return bad('粮草或银两不足。');
    pay(p, def.cost); p.queue.push({ id: uid(game, 'queue'), type: 'research', tech, duration: def.duration, remaining: def.duration }); return good();
  }
  if (['move', 'attack', 'hold'].includes(command.type)) {
    if (!Array.isArray(command.ids) || !command.ids.length || command.ids.length > 25 || new Set(command.ids).size !== command.ids.length) return bad('请选择自己的军队。');
    const units = command.ids.map(id => game.units.find(u => u.id === id));
    if (units.some(u => !u || u.owner !== playerId || u.hp <= 0)) return bad('不能指挥其他势力或不存在的军队。');
    if (units.some(u => u.transit)) return bad('运输中的军队请等待登陆后再下令。');
    let destination = { x: command.x, y: command.y };
    if (command.type === 'move' && finitePoint(destination)) {
      const city = runtimeFor(game).cityPublicBuckets.near(destination, 3).sort((a, b) => squaredDistance(a, destination) - squaredDistance(b, destination))[0];
      if (city) destination = { ...positionOf(city) };
    }
    if (command.type === 'move' && (!finitePoint(destination) || blocked(destination.x, destination.y, 10))) return bad('目标位置不可通行。');
    let target;
    if (command.type === 'attack') {
      target = entityOf(game, command.targetId);
      if (!target || target.transit || target.owner === playerId || target.hp <= 0 && !runtimeFor(game).cities.has(target.id)) return bad('攻击目标无效。');
      if (!game.cities.includes(target) && !visibleAt(target, visibilityFor(game, playerId))) return bad('攻击目标无效。');
      destination = { ...positionOf(target) };
    }
    if (command.type !== 'hold') destination.component = componentAt(destination);
    const routes = [];
    for (const u of units) {
      const result = command.type === 'hold' ? { ok: true, route: null } : shippingPlan(game, playerId, u, destination);
      if (!result.ok) return result; routes.push(result.route);
    }
    units.forEach((u, index) => {
      u.path = []; u.pathIndex = 0; u.nextPathAt = 0; u.travelCarry = 0;
      delete u.route; if (routes[index]) u.route = routes[index];
      if (command.type === 'hold') u.order = { type: 'hold' };
      else if (command.type === 'attack') u.order = { type: 'attack', targetId: target.id, ...destination };
      else {
        const offset = units.length > 1 ? { x: (index % 5 - Math.min(2, (units.length - 1) / 2)) * 8, y: (Math.floor(index / 5) - Math.floor((units.length - 1) / 10)) * 8 } : { x: 0, y: 0 };
        let point = { x: clamp(destination.x + offset.x, 20, WORLD.width - 20), y: clamp(destination.y + offset.y, 20, WORLD.height - 20) };
        if (blocked(point.x, point.y, 10) || componentAt(point) !== componentAt(destination)) point = { ...destination };
        u.order = { type: 'move', ...point };
      }
    });
    return good();
  }
  if (command.type === 'skill') {
    const hero = game.units.find(u => u.id === command.heroId && u.owner === playerId && u.type === 'hero' && u.hp > 0);
    if (!hero) return bad('请选中自己的名将。');
    if (hero.transit) return bad('运输中的军队不能攻击或施展技能。');
    if (hero.skillReadyAt > game.time) return bad('名将技能正在冷却。');
    const def = FACTIONS[p.faction].hero;
    const allies = game.units.filter(u => u.owner === playerId && !u.transit && distance(u, hero) <= 230);
    if (def.effect === 'command' && new Set(allies.filter(u => u.type !== 'hero').map(u => statsFor(p, u.type).category)).size < 2) return bad('协同军令需要附近至少两种兵种。');
    if (def.effect === 'formation' && (!allies.some(u => u.type === 'spear') || !allies.some(u => u.type === 'unique'))) return bad('列阵需要附近同时有枪兵和火铳兵。');
    if (def.effect === 'fort') {
      let point = { x: command.x ?? hero.x + 65, y: command.y ?? hero.y };
      if (!finitePoint(point) || blocked(point.x, point.y, 24) || distance(hero, point) > 180 || !visibleAt(point, visibilityFor(game, playerId)) || game.buildings.some(b => b.hp > 0 && distance(b, point) < 58)) {
        if (command.x !== undefined || command.y !== undefined) return bad('筑垒地点必须是名将附近的空地。');
        point = null;
        for (let i = 0; i < 12; i++) {
          const candidate = { x: hero.x + Math.cos(i * Math.PI / 6) * 85, y: hero.y + Math.sin(i * Math.PI / 6) * 85 };
          if (finitePoint(candidate) && !blocked(candidate.x, candidate.y, 24) && !game.buildings.some(b => b.hp > 0 && distance(b, candidate) < 58)) { point = candidate; break; }
        }
        if (!point) return bad('名将附近没有筑垒空地。');
      }
      const fort = addBuilding(game, p, 'tower', point.x, point.y, true);
      fort.temporary = true; fort.expiresAt = game.time + 25; fort.hp = fort.maxHp = 420;
    }
    hero.skillReadyAt = game.time + def.cooldown;
    if (def.effect !== 'fort') for (const u of allies) u.buffs.push({ effect: def.effect, until: game.time + (def.effect === 'raid' ? 12 : 14) });
    event(game, 'skill', playerId, `${p.name}施展${def.skillName}。`, `${p.name} uses ${def.skillNameEn}.`);
    removeDead(game); checkVictory(game); return good();
  }
  if (command.type === 'pack') {
    const b = game.buildings.find(b => b.id === command.buildingId);
    if (p.faction !== 'yuan' || !b || b.owner !== playerId || b.type !== 'camp' || !activeBuilding(b)) return bad('只能迁移自己的元军移动军营。');
    if (!finitePoint(command) || blocked(command.x, command.y, 24) || !visibleAt(command, visibilityFor(game, playerId)) || game.buildings.some(other => other.id !== b.id && other.hp > 0 && distance(other, command) < 65)) return bad('迁移地点必须是视野中的可通行空地。');
    if (componentAt(b) !== componentAt(command)) return bad('军营不能越海迁移。');
    if (p.queue.some(q => q.buildingId === b.id)) return bad('请等待军营征兵完成。');
    b.packing = { x: command.x, y: command.y, remaining: 12 + distance(b, command) / 80, duration: 12 + distance(b, command) / 80 };
    return good();
  }
  return bad('未知指令。');
}

function nearestCell(x, y) {
  if (Geography.nearestNavigationNode) {
    const node = Geography.nearestNavigationNode({ x, y });
    if (Number.isInteger(node) && landCells[node] && !terrainBlocked(nodePoints[node].x, nodePoints[node].y) && drySegment({ x, y }, nodePoints[node])) return node;
  }
  let cx = clamp(Math.floor(x / GRID), 0, COLS - 1), cy = clamp(Math.floor(y / GRID), 0, ROWS - 1);
  if (passable(cx, cy) && drySegment({ x, y }, nodePoints[cy * COLS + cx])) return cy * COLS + cx;
  for (let r = 1; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) === r || Math.abs(dy) === r) if (passable(cx + dx, cy + dy)) {
    const index = (cy + dy) * COLS + cx + dx;
    if (drySegment({ x, y }, nodePoints[index])) return index;
  }
  return null;
}

class MinHeap {
  constructor() { this.values = []; }
  get length() { return this.values.length; }
  push(item) {
    const values = this.values; values.push(item);
    let i = values.length - 1;
    while (i > 0) { const parent = (i - 1) >> 1; if (values[parent].score <= item.score) break; values[i] = values[parent]; i = parent; }
    values[i] = item;
  }
  pop() {
    const values = this.values, first = values[0], last = values.pop();
    if (values.length) {
      let i = 0;
      while (i * 2 + 1 < values.length) {
        let child = i * 2 + 1;
        if (child + 1 < values.length && values[child + 1].score < values[child].score) child++;
        if (values[child].score >= last.score) break;
        values[i] = values[child]; i = child;
      }
      values[i] = last;
    }
    return first;
  }
}

function pathFor(game, from, to) {
  let cache = caches.get(game);
  if (!cache) { cache = new Map(); caches.set(game, cache); }
  const start = Number.isInteger(from.navNode) ? from.navNode : nearestCell(from.x, from.y), goal = Number.isInteger(to.navNode) ? to.navNode : nearestCell(to.x, to.y), key = `${start}:${goal}`;
  if (start === null || goal === null) return [];
  if (cache.has(key)) return cache.get(key).map(p => ({ ...p }));
  const heuristic = i => distance(nodePoints[i], nodePoints[goal]) / GRID;
  const open = new MinHeap(), g = new Float64Array(nodePoints.length).fill(Infinity), parents = new Int32Array(nodePoints.length).fill(-1), closed = new Uint8Array(nodePoints.length);
  g[start] = 0;
  open.push({ index: start, score: heuristic(start) });
  while (open.length) {
    const current = open.pop().index;
    if (current === goal) break;
    if (closed[current]) continue;
    closed[current] = 1;
    const x = current % COLS, y = Math.floor(current / COLS), neighbors = [];
    for (const next of NAV_GRID?.extraEdges?.[current] || []) if (landCells[next] && !terrainBlocked(nodePoints[next].x, nodePoints[next].y)) neighbors.push(next);
    if (current < COLS * ROWS)
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy || !passable(x + dx, y + dy)) continue;
      if (!NAV_GRID && dx && dy && (!passable(x + dx, y) || !passable(x, y + dy))) continue;
      const next = (y + dy) * COLS + x + dx;
      if (NAV_GRID?.edgeMasks) {
        const edgeIndex = NAV_GRID.edgeOffsets.findIndex(([ex, ey]) => ex === dx && ey === dy);
        if (!(NAV_GRID.edgeMasks[current] & (1 << edgeIndex))) continue;
      } else if (!drySegment(nodePoints[current], nodePoints[next])) continue;
      neighbors.push(next);
    }
    for (const next of neighbors) {
      const cost = g[current] + distance(nodePoints[current], nodePoints[next]) / GRID;
      if (closed[next] || cost >= g[next]) continue;
      g[next] = cost; parents[next] = current; open.push({ index: next, score: cost + heuristic(next) });
    }
  }
  const path = [];
  if (start === goal) path.push({ ...nodePoints[goal] });
  else if (parents[goal] !== -1) {
    let at = goal;
    while (at !== start && at !== -1) { path.push({ ...nodePoints[at] }); at = parents[at]; }
    path.reverse();
    path.unshift({ ...nodePoints[start] });
  }
  const compressed = [];
  for (const point of path) {
    if (compressed.length >= 2) {
      const a = compressed.at(-2), b = compressed.at(-1), cross = (b.x - a.x) * (point.y - b.y) - (b.y - a.y) * (point.x - b.x);
      if (Math.abs(cross) < 1e-7 && (b.x - a.x) * (point.x - b.x) + (b.y - a.y) * (point.y - b.y) >= 0) { compressed[compressed.length - 1] = point; continue; }
    }
    compressed.push(point);
  }
  if (cache.size > 1200) cache.clear();
  cache.set(key, compressed);
  return compressed.map(p => ({ ...p }));
}

function moveToward(game, u, target, dt, speed) {
  if (!u.path.length || u.pathIndex >= u.path.length || !u.pathTarget || distance(u.pathTarget, target) > 55) {
    if (game.time < (u.nextPathAt || 0)) return;
    u.path = pathFor(game, u, target); u.pathIndex = 0; u.pathTarget = { x: target.x, y: target.y }; u.nextPathAt = game.time + 0.5;
    if (!blocked(target.x, target.y, 7) && u.path.length && drySegment(u.path.at(-1), target)) u.path.push({ x: target.x, y: target.y });
    if (u.path.length && !drySegment(u, u.path[0])) { u.path = []; return; }
  }
  let budget = speed * dt + (u.travelCarry || 0); u.travelCarry = 0;
  while (budget > 0 && u.pathIndex < u.path.length) {
    const point = u.path[u.pathIndex], d = distance(u, point);
    if (d <= budget) { u.x = point.x; u.y = point.y; u.pathIndex++; budget -= d; if (d > 1e-7) { u.travelCarry = Math.min(budget, GRID * 2); break; } }
    else { u.x += (point.x - u.x) / d * budget; u.y += (point.y - u.y) / d * budget; budget = 0; }
  }
}

function inflict(game, attacker, target, damage) {
  if (target.hp <= 0) return;
  const actual = Math.min(target.hp, damage);
  target.hp = Math.max(0, target.hp - damage);
  if (target.buffs) target.buffs = target.buffs.filter(b => b.effect !== 'regroup');
  target.lastHitAt = game.time;
  if (attacker) attacker.score.damage += actual;
  if (target.hp === 0 && game.units.includes(target) && attacker) attacker.score.kills++;
}

function attackDamage(game, p, u, target) {
  const stats = statsFor(p, u.type), mod = FACTIONS[p.faction].modifiers;
  let damage = stats.damage * (p.research.weapons ? 1.15 : 1);
  const enemy = playerOf(game, target.owner);
  const targetStats = target.type && UNITS[target.type] && enemy ? statsFor(enemy, target.type) : null;
  if (stats.category === 'cavalry') damage *= mod.cavalryDamage || 1;
  if (stats.range > 100) damage *= mod.rangedDamage || 1;
  if (stats.category === 'siege') damage *= mod.siegeDamage || 1;
  if (u.buffs.some(b => b.effect === 'formation') && !u.moving) damage *= 1.2;
  if (stats.ranged && stats.category === 'cavalry' && u.moving && !u.buffs.some(b => b.effect === 'flank')) damage *= 0.75;
  if (mod.combinedArms && ['spear', 'cavalry'].includes(stats.category) && game.units.some(a => !a.transit && a.owner === p.id && a.id !== u.id && distance(a, u) < 100 && statsFor(p, a.type).category === (stats.category === 'spear' ? 'cavalry' : 'spear'))) damage *= mod.combinedArms;
  if (targetStats) {
    if (stats.category === 'spear' && targetStats.category === 'cavalry') damage *= 1.8;
    if (stats.category === 'archer' && targetStats.category === 'spear') damage *= 1.35;
    if (stats.category === 'cavalry' && targetStats.category === 'archer') damage *= 1.6;
    if (stats.category === 'siege') damage *= 0.45;
    if (enemy.research.armor) damage *= 0.85;
    damage /= FACTIONS[enemy.faction].modifiers.armor || 1;
    if (target.buffs.some(b => b.effect === 'command')) damage *= 0.75;
    if (target.buffs.some(b => b.effect === 'formation') && !target.moving) damage *= 0.8;
  } else if (stats.category !== 'siege') damage *= 0.48;
  else damage *= 2.3;
  return damage;
}

function updateConnections(game) {
  const r = runtimeFor(game); r.cityRates = new Map(game.players.map(p => [p.id, { food: 0, silver: 0, town: 0 }]));
  for (const c of game.cities) { c.connected = false; if (c.owner && c.hp < c.maxHp) r.damagedCities.add(c.id); }
  for (const p of game.players.filter(p => p.alive)) {
    const home = WORLD.cities.filter(c => ['food', 'silver'].includes(c.kind)).sort((a, b) => distance(positionOf(a), p.base) - distance(positionOf(b), p.base))[0];
    const queue = [];
    const connect = c => { if (c && !c.connected && c.owner === p.id && c.settleUntil <= game.time) { c.connected = true; queue.push(c); } };
    connect(r.cities.get(home?.id));
    for (const camp of game.buildings.filter(b => b.owner === p.id && b.type === 'camp' && activeBuilding(b))) for (const c of r.cityBuckets.near(camp, 120)) if (drySegment(camp, positionOf(c))) connect(c);
    for (let index = 0; index < queue.length; index++) for (const id of supplyGraph.get(queue[index].id) || []) connect(r.cities.get(id));
    const rates = r.cityRates.get(p.id);
    for (const c of queue) { if (c.kind === 'food') rates.food++; else if (c.kind === 'silver') rates.silver++; else if (c.kind === 'town') rates.town++; }
  }
}

function updateEconomy(game, dt) {
  for (const p of game.players.filter(p => p.alive)) {
    const mod = FACTIONS[p.faction].modifiers;
    let food = 1.15, silver = 0.95;
    for (const b of game.buildings) if (b.owner === p.id && activeBuilding(b)) { food += BUILDINGS[b.type].income?.food || 0; silver += BUILDINGS[b.type].income?.silver || 0; }
    const rates = runtimeFor(game).cityRates.get(p.id) || { food: 0, silver: 0, town: 0 };
    const foodCities = rates.food, silverCities = rates.silver;
    food += rates.town * RULES.townIncome; silver += rates.town * RULES.townIncome;
    // Diminishing city income preserves a comeback window without changing combat power.
    food += foodCities ? 2.5 + Math.max(0, foodCities - 1) * 1.65 : 0;
    silver += (silverCities ? 2.1 + Math.max(0, silverCities - 1) * 1.4 : 0) * (mod.marketIncome || 1);
    p.food = Math.min(9999, p.food + food * (mod.foodIncome || 1) * dt);
    p.silver = Math.min(9999, p.silver + silver * (mod.silverIncome || 1) * dt);
    p.capacity = Math.min(RULES.maxSquads, RULES.initialCapacity + game.buildings.filter(b => b.owner === p.id && b.type === 'housing' && activeBuilding(b)).length * 4);
  }
}

function updateProduction(game, dt) {
  for (const b of game.buildings) {
    if (b.temporary && game.time >= b.expiresAt) { b.hp = 0; continue; }
    if (b.progress < 1) { const rate = b.type === 'tower' ? FACTIONS[playerOf(game, b.owner).faction].modifiers.fortificationSpeed || 1 : 1; b.remaining = Math.max(0, b.remaining - dt * rate); b.progress = 1 - b.remaining / BUILDINGS[b.type].duration; }
    if (b.packing) {
      b.packing.remaining -= dt;
      if (b.packing.remaining <= 0) { b.x = b.packing.x; b.y = b.packing.y; delete b.packing; }
    }
  }
  for (const p of game.players.filter(p => p.alive)) {
    const runningBuildings = new Set(), finished = [];
    for (const q of p.queue) {
      if (q.type === 'train') {
        const b = game.buildings.find(b => b.id === q.buildingId);
        if (!b || b.hp <= 0) { finished.push(q.id); continue; }
        if (!activeBuilding(b) || runningBuildings.has(q.buildingId)) continue;
        if (q.unit !== 'hero' && reservedCount(game, p) > p.capacity) continue;
        runningBuildings.add(q.buildingId);
      }
      q.remaining = Math.max(0, q.remaining - dt * (q.type === 'research' ? FACTIONS[p.faction].modifiers.researchSpeed || 1 : 1));
      if (q.remaining > 1e-7) continue;
      finished.push(q.id);
      if (q.type === 'train') {
        const b = game.buildings.find(b => b.id === q.buildingId);
        const angle = (game.nextId % 8) * Math.PI / 4;
        let point = { x: clamp(b.x + Math.cos(angle) * 22, 20, 1580), y: clamp(b.y + Math.sin(angle) * 22, 20, 980) };
        if (blocked(point.x, point.y, 15) || componentAt(point) !== componentAt(b)) point = { x: b.x, y: b.y };
        addUnit(game, p, q.unit, point.x, point.y);
      } else if (q.type === 'upgrade') {
        p.level = q.level;
        const base = game.buildings.find(b => b.id === p.base.id);
        base.maxHp += 650; base.hp = Math.min(base.maxHp, base.hp + 650);
        event(game, 'upgrade', p.id, `${p.name}升至${p.level}级主城。`, `${p.name} reaches citadel level ${p.level}.`);
      } else if (q.type === 'research') p.research[q.tech] = 1;
    }
    p.queue = p.queue.filter(q => !finished.includes(q.id));
  }
}

function updateArmies(game, dt) {
  const r = runtimeFor(game); r.unitBuckets = new SpatialBuckets(game.units.filter(u => !u.transit)); r.buildingBuckets = new SpatialBuckets(game.buildings);
  const view = new Map(game.players.map(p => [p.id, visibilityFor(game, p.id)]));
  const players = new Map(game.players.map(p => [p.id, p]));
  for (const u of game.units) {
    if (u.hp <= 0) continue;
    const p = players.get(u.owner);
    if (!p?.alive) continue;
    if (u.transit) { stepTransit(game, u, dt); continue; }
    const stats = statsFor(p, u.type), mod = FACTIONS[p.faction].modifiers;
    const oldX = u.x, oldY = u.y;
    u.buffs = u.buffs.filter(b => b.until > game.time);
    if (u.buffs.some(b => b.effect === 'regroup')) u.hp = Math.min(u.maxHp, u.hp + 8 * dt);
    u.cooldown = Math.max(0, u.cooldown - dt);
    if (u.route) {
      const port = r.cities.get(u.route.fromPort), point = positionOf(port);
      if (port.owner !== u.owner) { delete u.route; u.order = { type: 'hold' }; event(game, 'port-lost', u.owner, '出发港已失守，航运取消。', 'The departure port was lost; transport is canceled.'); }
      else if (distance(u, point) <= 3) { startTransit(game, u); u.cooldown = 0; continue; }
      else { moveToward(game, u, point, dt, stats.speed); continue; }
    }
    let target = u.order.type === 'attack' ? entityOf(game, u.order.targetId) : null;
    if (target && (target.transit || target.owner === u.owner || !visibleAt(positionOf(target), view.get(u.owner)) || target.hp <= 0 && !r.cities.has(target.id))) target = null;
    if (!target) {
      // Ordinary movement advances while skirmishing only inside weapon range.
      let nearest = Infinity;
      for (const other of r.unitBuckets.near(u, stats.range + 28)) if (other.hp > 0 && !other.transit && other.owner !== u.owner) {
        const d = squaredDistance(u, other);
        if (d <= (stats.range + 20) ** 2 && d < nearest && visibleAt(other, view.get(u.owner))) { nearest = d; target = other; }
      }
      if (!target && u.order.type === 'hold') for (const b of r.buildingBuckets.near(u, stats.range + 20)) if (b.owner !== u.owner && b.hp > 0 && visibleAt(b, view.get(u.owner))) { target = b; break; }
    }
    let speed = stats.speed * (stats.category === 'cavalry' ? mod.cavalrySpeed || 1 : 1) * (p.research.logistics ? 1.1 : 1);
    if (stats.category === 'cavalry' && u.buffs.some(b => b.effect === 'raid')) speed *= 1.35;
    u.moving = false;
    const mountedMove = stats.ranged && stats.category === 'cavalry' && u.order.type === 'move' && distance(u, u.order) > 8;
    if (mountedMove) { moveToward(game, u, u.order, dt, speed); u.moving = distance(u, { x: oldX, y: oldY }) > 0.01; }
    if (target) {
      const targetPoint = positionOf(target), d = distance(u, targetPoint), targetIsCity = r.cities.has(target.id);
      const approachRange = targetIsCity && target.hp <= 0 && target.guardHp <= 0 && u.type !== 'siege' ? cityRadius(target) * 0.65 : stats.range + (target.type === 'base' ? 38 : 15);
      if (d > approachRange && !mountedMove && u.order.type !== 'hold') moveToward(game, u, targetPoint, dt, speed);
      else if (d <= approachRange && u.cooldown <= 0 && (!targetIsCity || target.owner !== u.owner)) {
        const damage = attackDamage(game, p, u, target);
        if (targetIsCity && target.guardHp > 0) target.guardHp = Math.max(0, target.guardHp - damage);
        else if (!targetIsCity || target.hp > 0) inflict(game, p, target, damage);
        u.cooldown = stats.attackInterval;
      }
    } else if (!mountedMove && (u.order.type === 'move' || u.order.type === 'attack')) {
      if (distance(u, u.order) > 8) moveToward(game, u, u.order, dt, speed);
      else { u.order = { type: 'hold' }; u.path = []; }
    }
    // Forward recovery is an advantage of a connected, settled city; it cannot heal during combat.
    if (!target) {
      const supplied = within(p.base, u, 140) || r.cityBuckets.some(u, 145, c => c.owner === p.id && c.connected && c.settleUntil <= game.time);
      if (supplied) u.hp = Math.min(u.maxHp, u.hp + (p.research.logistics ? 5 : 3) * (mod.supplyRecovery || 1) * dt);
    }
    u.moving = distance(u, { x: oldX, y: oldY }) > 0.01;
  }
  r.unitBuckets = new SpatialBuckets(game.units.filter(u => !u.transit));
  for (const b of game.buildings) if (b.type === 'tower' && activeBuilding(b)) {
    b.cooldown = Math.max(0, b.cooldown - dt);
    if (b.cooldown > 0) continue;
    const target = r.unitBuckets.near(b, BUILDINGS.tower.range).filter(u => u.owner !== b.owner && !u.transit && u.hp > 0).sort((a, c) => squaredDistance(a, b) - squaredDistance(c, b))[0];
    if (target) { const p = playerOf(game, b.owner); inflict(game, p, target, BUILDINGS.tower.damage * (FACTIONS[p.faction].modifiers.towerDamage || 1)); b.cooldown = BUILDINGS.tower.attackInterval; }
  }
}

function updateCities(game, dt) {
  const r = runtimeFor(game), attackers = new Map(), candidates = new Set(r.damagedCities), radius = MAX_CITY_RADIUS;
  for (const u of game.units) if (u.hp > 0 && !u.transit) {
    if (u.order.type === 'attack' && r.cities.has(u.order.targetId)) {
      candidates.add(u.order.targetId);
      if (!attackers.has(u.order.targetId)) attackers.set(u.order.targetId, []);
      attackers.get(u.order.targetId).push(u);
    }
    if (u.type !== 'siege') for (const c of r.captureBuckets.near(u, radius)) if ((c.hp <= 0 || c.capture.progress > 0) && within(u, positionOf(c), cityRadius(c))) candidates.add(c.id);
  }
  for (const id of candidates) {
    const c = r.cities.get(id); if (!c) { r.damagedCities.delete(id); continue; }
    const point = positionOf(c), nearby = r.unitBuckets.near(point, cityRadius(c)).filter(u => u.hp > 0 && !u.transit && u.type !== 'siege');
    const invaders = [...new Set(nearby.filter(u => u.owner !== c.owner).map(u => u.owner))];
    c.guardCooldown = Math.max(0, c.guardCooldown - dt);
    if (c.guardHp > 0 && c.guardCooldown <= 0) {
      const target = (attackers.get(id) || []).find(u => u.owner !== c.owner && within(u, point, 190));
      if (target) { inflict(game, playerOf(game, c.owner), target, c.kind === 'capital' ? 13 : c.kind === 'town' ? 6 : 9); c.guardCooldown = 1.5; }
    }
    if (c.guardHp > 0 || c.hp > 0) {
      c.capture = { owner: null, progress: 0 };
      if (!invaders.length && c.owner && c.settleUntil <= game.time) c.hp = Math.min(c.maxHp, c.hp + dt * 2);
      if (c.owner && c.hp < c.maxHp) r.damagedCities.add(id); else if (c.hp >= c.maxHp) r.damagedCities.delete(id);
      continue;
    }
    if (c.capture.owner && !nearby.some(u => u.owner === c.capture.owner)) c.capture = { owner: null, progress: 0 };
    const ownerPresent = c.owner && nearby.some(u => u.owner === c.owner);
    if (invaders.length !== 1 || ownerPresent) {
      if (c.owner && !invaders.length) c.hp = Math.min(c.maxHp, c.hp + dt * 2);
      if (!c.capture.progress && !c.owner) r.damagedCities.delete(id);
      continue;
    }
    const contender = invaders[0]; if (c.capture.owner !== contender) c.capture = { owner: contender, progress: 0 };
    c.capture.progress = Math.min(1, c.capture.progress + dt / RULES.captureDuration); r.damagedCities.add(id);
    if (c.capture.progress >= 1 - 1e-7) {
      c.owner = contender; c.hp = c.maxHp * 0.55; c.guardHp = c.kind === 'capital' ? 180 : c.kind === 'town' ? 40 : 90; c.settleUntil = game.time + RULES.settleDuration; c.connected = false; c.capture = { owner: null, progress: 0 };
      const p = playerOf(game, contender); p.score.cities++;
      event(game, 'capture', p.id, `${p.name}占领${c.name}，正在整顿。`, `${p.name} captures ${c.nameEn}; settlement begins.`);
    }
  }
}

function removeDead(game) {
  for (const u of game.units) if (u.hp <= 0 && u.type === 'hero') {
    const p = playerOf(game, u.owner);
    p.heroReadyAt = game.time + RULES.heroRespawnDelay;
    event(game, 'hero-death', p.id, `${FACTIONS[p.faction].hero.name}战败，60秒后可付费重招。`, `${FACTIONS[p.faction].hero.nameEn} falls; recruitment returns in 60 seconds.`);
  }
  game.units = game.units.filter(u => u.hp > 0);
  for (const p of game.players.filter(p => p.alive)) {
    const base = game.buildings.find(b => b.id === p.base.id);
    if (!base || base.hp <= 0) eliminatePlayer(game, p.id, 'base-destroyed', false);
  }
  game.buildings = game.buildings.filter(b => b.hp > 0);
  for (const p of game.players) {
    const b = game.buildings.find(b => b.id === p.base.id);
    p.base.hp = b?.hp || 0;
    if (b) { p.base.x = b.x; p.base.y = b.y; p.base.maxHp = b.maxHp; }
  }
}

export function eliminatePlayer(game, playerId, reason = 'surrender', check = true) {
  const p = playerOf(game, playerId);
  if (!p || !p.alive || game.status !== 'playing') return false;
  p.alive = false; p.queue = []; p.base.hp = 0;
  game.units = game.units.filter(u => u.owner !== playerId);
  game.buildings = game.buildings.filter(b => b.owner !== playerId);
  for (const c of game.cities) if (c.owner === playerId) { c.owner = null; c.connected = false; c.capture = { owner: null, progress: 0 }; c.hp = c.maxHp * 0.5; c.guardHp = c.kind === 'town' ? 40 : 90; c.settleUntil = 0; }
  event(game, 'elimination', playerId, `${p.name}退出争霸。`, `${p.name} is eliminated (${reason}).`);
  if (check) checkVictory(game);
  return true;
}

function finish(game, playerId, reason, draw = false) {
  if (game.status !== 'playing') return;
  game.status = 'ended'; game.winner = { playerId, reason, ...(draw ? { draw: true } : {}) };
  const p = playerOf(game, playerId);
  event(game, 'end', playerId, draw ? '诸军势均力敌，本局平局。' : `${p?.name || '胜者'}赢得天下。`, draw ? 'The match ends in a draw.' : `${p?.name || 'The winner'} claims the realm.`);
}

function checkVictory(game) {
  const alive = game.players.filter(p => p.alive);
  if (alive.length <= 1) { finish(game, alive[0]?.id || null, 'conquest', !alive.length); return; }
  if (game.time >= RULES.matchDuration) {
    const score = p => game.cities.filter(c => c.owner === p.id).reduce((total, c) => total + (c.kind === 'capital' ? 3 : 1), 0);
    const sorted = alive.map(p => ({ p, score: score(p), health: p.base.hp / p.base.maxHp })).sort((a, b) => b.score - a.score || b.health - a.health);
    const draw = sorted[0].score === sorted[1].score && Math.abs(sorted[0].health - sorted[1].health) < 1e-9;
    finish(game, draw ? null : sorted[0].p.id, 'score', draw);
  }
}

function updateCrown(game, dt) {
  const capital = game.cities.find(c => c.kind === 'capital');
  const qualified = capital.owner && game.cities.filter(c => c.owner === capital.owner && ['food', 'silver'].includes(c.kind)).length >= RULES.crownEconomyCities;
  const contested = qualified && game.units.some(u => u.hp > 0 && !u.transit && u.owner !== capital.owner && within(u, positionOf(capital), cityRadius(capital)));
  if (!qualified || contested || capital.hp <= 0) { game.crown.playerId = null; game.crown.progress = 0; return; }
  if (game.crown.playerId !== capital.owner) { game.crown.playerId = capital.owner; game.crown.progress = 0; event(game, 'crown', capital.owner, '称帝倒计时开始：夺回王都或外城可以阻止统一。', 'The imperial countdown begins. Retake the capital or an outer city to stop it.'); }
  game.crown.progress = Math.min(RULES.crownDuration, game.crown.progress + dt);
  if (game.crown.progress >= RULES.crownDuration - 1e-7) finish(game, capital.owner, 'crown');
}

function stepOnce(game, dt) {
  game.time = Math.min(RULES.matchDuration, Math.round((game.time + dt) * 1e9) / 1e9);
  if (game.time >= game.connectionAt) { updateConnections(game); game.connectionAt = game.time + 0.5; }
  updateProduction(game, dt);
  updateEconomy(game, dt);
  updateArmies(game, dt);
  updateCities(game, dt);
  removeDead(game);
  updateCrown(game, dt);
  checkVictory(game);
}

export function stepGame(game, dt) {
  if (!game || game.status !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
  // Subdivision prevents callers from bypassing combat / occupation timers with one huge delta.
  let remaining = Math.min(dt, RULES.matchDuration - game.time);
  while (remaining > 1e-8 && game.status === 'playing') { const slice = Math.min(0.1, remaining); stepOnce(game, slice); remaining -= slice; }
  if (game.status === 'playing' && RULES.matchDuration - game.time <= 1e-8) { game.time = RULES.matchDuration; checkVictory(game); }
}

export function snapshotFor(game, playerId) {
  if (!playerOf(game, playerId)) throw new Error('Unknown snapshot player.');
  const r = runtimeFor(game);
  const visibility = visibilityFor(game, playerId);
  const seen = entity => entity.owner === playerId || visibleAt(entity, visibility);
  const players = game.players.map(p => p.id === playerId ? clone(p) : { id: p.id, name: p.name, faction: p.faction, slot: p.slot, alive: p.alive, base: { id: p.base.id, x: p.base.x, y: p.base.y } });
  const units = game.units.filter(seen).map(u => ({ id: u.id, owner: u.owner, type: u.type, x: u.x, y: u.y, hp: u.hp, maxHp: u.maxHp, component: u.component, ...(u.transit ? { transit: u.owner === playerId ? { fromPort: u.transit.fromPort, toPort: u.transit.toPort, remaining: u.transit.remaining, duration: u.transit.duration, path: clone(u.transit.path), segmentIndex: u.transit.segmentIndex } : { active: true } } : {}), skillReadyAt: u.owner === playerId ? u.skillReadyAt : undefined, ...(u.owner === playerId ? { order: clone(u.order), buffs: clone(u.buffs) } : {}) }));
  const buildings = game.buildings.filter(seen).map(b => ({ id: b.id, owner: b.owner, type: b.type, x: b.x, y: b.y, hp: b.hp, maxHp: b.maxHp, progress: b.progress, ...(b.temporary ? { temporary: true, expiresAt: b.expiresAt } : {}), ...(b.owner === playerId ? { queue: clone(playerOf(game, playerId).queue.filter(q => q.buildingId === b.id)), ...(b.packing ? { packing: clone(b.packing) } : {}) } : {}) }));
  const cities = game.cities.map(c => {
    const metadata = r.cityMetadata.get(c.id);
    return seen(positionOf(c)) || c.owner === playerId ? { ...metadata, owner: c.owner, hp: c.hp, maxHp: c.maxHp, guardHp: c.guardHp, capture: { ...c.capture }, settleUntil: c.settleUntil, connected: c.owner === playerId ? c.connected : undefined, visible: true } : { ...metadata, owner: c.owner, visible: false };
  });

  // Global victory alerts are public, other events are private to prevent fog leaks.
  const events = game.events.filter(e => ['start', 'crown', 'end', 'elimination'].includes(e.type) || e.playerId === playerId).map(e => ({ ...e }));
  return { mapVersion: game.mapVersion, time: game.time, status: game.status, winner: game.winner ? { ...game.winner } : null, you: playerId, players, units, buildings, cities, crown: { ...game.crown }, events, visibility };
}

export function driveBots(game, ids, dt) {
  if (game.status !== 'playing' || !Array.isArray(ids) || !Number.isFinite(dt)) return;
  for (const id of ids) {
    const p = playerOf(game, id);
    if (!p?.alive) continue;
    const previous = Object.hasOwn(game.botTimers, id) ? game.botTimers[id] : 0;
    Object.defineProperty(game.botTimers, id, { value: previous - dt, writable: true, enumerable: true, configurable: true });
    if (game.botTimers[id] > 0) continue;
    game.botTimers[id] = 3;
    const own = game.buildings.filter(b => b.owner === id);
    const count = type => own.filter(b => b.type === type).length;
    if (count('farm') < 2) applyCommand(game, id, { type: 'build', building: 'farm' });
    else if (count('workshop') < 2) applyCommand(game, id, { type: 'build', building: 'workshop' });
    else if (p.level >= 2 && !count('stable')) applyCommand(game, id, { type: 'build', building: 'stable' });
    else if (p.capacity < 24 && reservedCount(game, p) >= p.capacity - 2) applyCommand(game, id, { type: 'build', building: 'housing' });
    if (p.food > 390 && p.silver > 450 && p.level < 3) applyCommand(game, id, { type: 'upgrade' });
    if (p.level >= 3 && !count('arsenal')) applyCommand(game, id, { type: 'build', building: 'arsenal' });
    if (p.level >= 2 && p.silver > 400) for (const tech of ['weapons', 'armor', 'logistics']) if (!p.research[tech]) { applyCommand(game, id, { type: 'research', tech }); break; }
    if (p.level >= 2 && !reservedCount(game, p, true)) applyCommand(game, id, { type: 'train', unit: 'hero' });
    const units = game.units.filter(u => u.owner === id);
    const rotation = Math.floor(game.time / 3) % 6;
    const savingForUpgrade = p.level < 3 && units.length >= (p.level === 1 ? 7 : 12) && !p.queue.some(q => q.type === 'upgrade');
    if (!savingForUpgrade) applyCommand(game, id, { type: 'train', unit: ['spear', 'archer', p.level >= 2 ? 'cavalry' : 'spear', 'spear', p.level >= 2 ? 'unique' : 'archer', p.level >= 3 ? 'siege' : 'archer'][rotation] });
    const hero = units.find(u => u.type === 'hero');
    if (hero && hero.skillReadyAt <= game.time && units.some(u => u.hp < u.maxHp * 0.85 || game.units.some(e => e.owner !== id && distance(e, hero) < 220))) {
      const enemy = game.units.find(e => e.owner !== id && distance(e, hero) < 250);
      applyCommand(game, id, { type: 'skill', heroId: hero.id, x: enemy?.x ?? hero.x, y: enemy?.y ?? hero.y });
    }
    if (units.length < 3) continue;
    const visibility = visibilityFor(game, id);
    const vulnerableBase = game.buildings.find(b => b.type === 'base' && b.owner !== id && visibleAt(b, visibility));
    const cities = game.cities.filter(c => c.owner !== id);
    cities.sort((a, b) => distance(p.base, a) - distance(p.base, b));
    const capital = cities.find(c => c.kind === 'capital');
    const outerCount = game.cities.filter(c => c.owner === id && ['food', 'silver'].includes(c.kind)).length;
    const target = units.length >= 10 && vulnerableBase ? vulnerableBase : outerCount >= RULES.crownEconomyCities && capital ? capital : cities.find(c => c.kind !== 'capital' && c.kind !== 'fort') || cities[0] || vulnerableBase;
    if (!target) continue;
    const idle = units.filter(u => u.order.type === 'hold' || (u.order.type === 'move' && distance(u, u.order) < 30));
    // Reveal an objective before issuing an attack: bots obey the same fog rules as players.
    const type = visibleAt(target, visibility) ? 'attack' : 'move';
    const army = units.filter(u => u.type !== 'hero' || units.length > 4);
    if (idle.length || army.some(u => u.order.type === 'attack' && u.order.targetId !== target.id)) applyCommand(game, id, { type, ids: army.map(u => u.id), targetId: target.id, x: target.x, y: target.y });
  }
}

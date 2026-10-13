import { WORLD } from './game-data.js';

const catalog = new Map(WORLD.cities.map(city => [city.id, city]));
// Geography stays fixed for a map version. Compare only public/visible runtime
// fields rather than serializing 500 static place records for every player tick.
const cityStateFields = ['owner', 'visible', 'hp', 'maxHp', 'guardHp', 'settleUntil', 'connected'];
const changedCity = (city, old) => !old || cityStateFields.some(key => city[key] !== old[key]) ||
  city.capture?.owner !== old.capture?.owner || city.capture?.progress !== old.capture?.progress;

/** First/reconnect frames are complete. Later frames send changed cities only. */
export function packSnapshot(snapshot, previous) {
  if (!previous || previous.time > snapshot.time || previous.you !== snapshot.you || previous.mapVersion !== snapshot.mapVersion || previous.cities.length !== snapshot.cities.length) return snapshot;
  const old = new Map(previous.cities.map(city => [city.id, city]));
  const cityDelta = snapshot.cities.filter(city => changedCity(city, old.get(city.id)));
  const { cities, ...frame } = snapshot;
  return { ...frame, cityDelta };
}

/** Replace changed rows, so entering fog also discards the previous private HP. */
export function mergeSnapshot(packet, previous) {
  if (Array.isArray(packet.cities)) return { ...packet, cities: packet.cities.map(city => ({ ...catalog.get(city.id), ...city })) };
  if (!previous?.cities || !Array.isArray(packet.cityDelta)) throw new Error('A complete battlefield snapshot is required before deltas.');
  const cities = new Map(previous.cities.map(city => [city.id, city]));
  for (const city of packet.cityDelta) cities.set(city.id, { ...catalog.get(city.id), ...city });
  const { cityDelta, ...frame } = packet;
  return { ...frame, cities: [...cities.values()] };
}

export const WORLD_LIMIT = 112;
export const SPAWN = { x: 0, z: 9 };

export function canMove(x, z, obstacles) {
  return !obstacles.some(({ x: bx, z: bz, w, d }) =>
    Math.abs(x - bx) < w / 2 + 0.7 && Math.abs(z - bz) < d / 2 + 0.7);
}

export function objective(state) {
  if (!state.fuel) return 'barn';
  if (!state.key) return 'chapel';
  return 'truck';
}

export function bearing(dx, dz) {
  if (Math.hypot(dx, dz) < 1) return '到着';
  const directions = ['北', '北東', '東', '南東', '南', '南西', '西', '北西'];
  return directions[(Math.round(Math.atan2(dx, -dz) / (Math.PI / 4)) + 8) % 8];
}

export function restoreSave(data, defaults, supplies) {
  const state = { ...defaults };
  const inv = { ...supplies };
  if (!data?.state || data.state.escaped === true) return null;

  for (const [key, fallback] of Object.entries(state)) {
    const value = data.state[key];
    if (typeof fallback === 'boolean') {
      state[key] = value === true;
    } else if (Number.isFinite(value)) {
      if (key === 'day') state[key] = Math.max(1, Math.floor(value));
      else if (key === 'time') state[key] = ((value % 24) + 24) % 24;
      else state[key] = Math.max(0, Math.min(100, value));
    }
  }
  for (const key of Object.keys(inv)) {
    const value = data.inv?.[key];
    if (Number.isSafeInteger(value) && value >= 0) inv[key] = value;
  }
  const position = [data.x, data.z].every(value =>
    Number.isFinite(value) && Math.abs(value) <= WORLD_LIMIT)
    ? { x: data.x, z: data.z } : SPAWN;
  const collected = Array.isArray(data.collected) ? data.collected.filter(Number.isInteger) : [];
  return { state, inv, position, collected };
}

export function weatherAt(day, hour) {
  const front = Math.sin((hour + (day - 1) * 7) * Math.PI / 12);
  if (front < -0.88) return 'rain';
  return hour >= 20 || hour < 6 ? 'night' : 'fog';
}

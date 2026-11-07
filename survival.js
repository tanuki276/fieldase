// Serializable survival rules. Rendering and input stay in the game adapter.
export const DIFFICULTIES = {
  story: {label: 'STORY', detection: .65, speed: .78, damage: 7, hunger: .07},
  survivor: {label: 'SURVIVOR', detection: 1, speed: 1, damage: 13, hunger: .12},
  nightmare: {label: 'NIGHTMARE', detection: 1.2, speed: 1.12, damage: 20, hunger: .17}
};
export const SAFE_ZONES = [
  {x: 0, z: 9, radius: 8, label: 'ROADSIDE CAMP'},
  {x: -28, z: -3, radius: 8, label: 'FARMHOUSE REFUGE'},
  {x: 0, z: -63, radius: 7, label: 'STRANDED PICKUP'}
];
export const JOURNAL = [
  {id: 'arrival', title: '11月3日 · 道端の手紙', x: 4, z: 15,
    text: 'アシュクロフトへ来る者へ。夜の畑に入るな。あれは足音を聞いている。走れば追いつかれる。身を低くして、建物の陰へ。火のある場所なら朝を待てる。'},
  {id: 'barn', title: '11月4日 · 納屋の出荷票', x: 33, z: -25,
    text: '最後の出荷は十月三十一日。荷台には何もなかった。それでも車軸は、まるで人が何十人も乗っているように沈んでいた。燃料を持って行け。トラックはまだ動く。'},
  {id: 'chapel', title: '11月5日 · 牧師の告白', x: -46, z: 22,
    text: '鐘を鳴らした夜から、町の者は同じ夢を見る。畑の端に立つ、顔のない収穫人。赤い火を恐れると気づいたのは、町が空になってからだった。発炎筒を持て。'},
  {id: 'tower', title: '11月6日 · 給水塔の無線記録', x: 62, z: 2,
    text: '救援は来ない。県道の橋が落ちた。南のトラックだけが残されている。鍵は教会の近く、燃料は納屋。エンジンを直すには木材と石とスクラップが要る。'},
  {id: 'field', title: '11月7日 · 最後の収穫', x: 9, z: 59,
    text: '土は何も忘れない。ここで死んだ者も、置き去りにした者も。けれど僕は帰る。この記録を見つけた君も帰ってくれ。振り返らず、夜が明ける前に。'}
];
const homes = [{x: 28, z: -12}, {x: -47, z: 53}, {x: 45, z: 46}];
const modes = new Set(['patrol', 'investigate', 'chase', 'search', 'flee']);
const number = (value, fallback, low, high) => Number.isFinite(value)
  ? Math.max(low, Math.min(high, value)) : fallback;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function safeZone(position) {
  return SAFE_ZONES.find(zone => distance(zone, position) < zone.radius) || null;
}
export function createSurvival(saved = {}) {
  if(!saved || typeof saved!=='object')saved={};
  const world = {
    elapsed: number(saved.elapsed, 0, 0, 1e8),
    difficulty: Object.hasOwn(DIFFICULTIES, saved.difficulty) ? saved.difficulty : 'survivor',
    seed: number(saved.seed, 1931, 1, 0xffffffff) >>> 0,
    salvageAt:number(saved.salvageAt,0,0,1e8),
    grace: 12, threat: 0, storm: 0, mist: 0, lightning: 0,
    flares: (Array.isArray(saved.flares)?saved.flares:[]).slice(0,3)
      .filter(flare=>flare && Number.isFinite(flare.x) && Number.isFinite(flare.z) && Number.isFinite(flare.life) && flare.life>0)
      .map(flare=>({x:number(flare.x,0,-112,112),z:number(flare.z,0,-112,112),life:Math.min(16,flare.life)})),
    flareCooldown: 0, dodgeCooldown: 0, invulnerable: 0,
    records: JOURNAL.filter(note => Array.isArray(saved.records) && saved.records.includes(note.id)).map(note => note.id),
    stats: {
      distance: number(saved.stats?.distance, 0, 0, 1e9),
      downed: number(saved.stats?.downed, 0, 0, 1e6),
      flares: number(saved.stats?.flares, 0, 0, 1e6)
    },
    enemies: homes.map((home, index) => {
      const previous = saved.enemies?.[index];
      return {
        x: number(previous?.x, home.x, -110, 110),
        z: number(previous?.z, home.z, -110, 110),
        heading: number(previous?.heading, index * 2, -100, 100),
        mode: modes.has(previous?.mode) ? previous.mode : 'patrol',
        targetX: home.x, targetZ: home.z, home: {...home},
        memory: 0, cooldown: 2, think: 0, phase: index * 2,
        lastSeenX: home.x, lastSeenZ: home.z
      };
    })
  };
  return world;
}
function random(world) {
  world.seed = (Math.imul(world.seed, 1664525) + 1013904223) >>> 0;
  return world.seed / 4294967296;
}
// Ray against collision rectangles. Used by sight and the map's route hints.
export function lineBlocked(from, to, collisions) {
  const dx = to.x - from.x, dz = to.z - from.z;
  return collisions.some(box => {
    let near = 0, far = 1;
    for (const [origin, delta, center, size] of [
      [from.x, dx, box.x, box.w], [from.z, dz, box.z, box.d]
    ]) {
      const low = center - size / 2, high = center + size / 2;
      if (Math.abs(delta) < .00001) {
        if (origin < low || origin > high) return false;
      } else {
        const a = (low - origin) / delta, b = (high - origin) / delta;
        near = Math.max(near, Math.min(a, b));
        far = Math.min(far, Math.max(a, b));
        if (near > far) return false;
      }
    }
    return far > .02 && near < .98;
  });
}
function blocked(x, z, collisions) {
  return collisions.some(box => Math.abs(x-box.x) < box.w/2+.65 && Math.abs(z-box.z) < box.d/2+.65);
}
function move(enemy, angle, step, collisions) {
  // Try both sides of a wall instead of remaining stuck against it.
  for (const turn of [0, .7, -.7, 1.4, -1.4, Math.PI]) {
    const heading = angle + turn;
    const x = enemy.x + Math.sin(heading) * step;
    const z = enemy.z + Math.cos(heading) * step;
    if (Math.abs(x) > 111 || Math.abs(z) > 111 || blocked(x,z,collisions)) continue;
    enemy.x = x;
    enemy.z = z;
    enemy.heading = heading;
    return;
  }
}
export function igniteFlare(world, player) {
  if (world.flareCooldown > 0) return false;
  world.flares.push({x: player.x, z: player.z, life: 16});
  if (world.flares.length > 3) world.flares.shift();
  world.flareCooldown = 2;
  world.stats.flares++;
  return true;
}
export function dodge(world) {
  if (world.dodgeCooldown > 0) return false;
  world.dodgeCooldown = 1.5;
  world.invulnerable = .55;
  return true;
}
export function respawnSurvival(world) {
  world.stats.downed++;
  world.grace = 15;
  world.threat = 0;
  for (const enemy of world.enemies) {
    Object.assign(enemy, enemy.home, {mode: 'patrol', memory: 0, cooldown: 3});
  }
}
export function stepSurvival(world, player, collisions, dt) {
  const settings = DIFFICULTIES[world.difficulty];
  world.elapsed += dt;
  world.grace = Math.max(0, world.grace-dt);
  world.flareCooldown = Math.max(0, world.flareCooldown-dt);
  world.dodgeCooldown = Math.max(0, world.dodgeCooldown-dt);
  world.invulnerable = Math.max(0, world.invulnerable-dt);
  for (const flare of world.flares) flare.life -= dt;
  world.flares = world.flares.filter(flare => flare.life > 0);
  const cycle = world.elapsed % 240;
  const stormTarget = cycle > 75 && cycle < 150 ? 1 : 0;
  const mistTarget = cycle > 165 && cycle < 225 ? 1 : 0;
  const blend = 1-Math.exp(-dt*.12);
  world.storm += (stormTarget-world.storm)*blend;
  world.mist += (mistTarget-world.mist)*blend;
  world.lightning = Math.max(0, world.lightning-dt*3);
  const events = [];
  if (world.storm > .65 && random(world) < dt*.065) {
    world.lightning = 1;
    events.push({type: 'thunder'});
  }
  const sheltered = safeZone(player);
  let threat = 0;
  for (const enemy of world.enemies) {
    enemy.cooldown = Math.max(0, enemy.cooldown-dt);
    enemy.memory = Math.max(0, enemy.memory-dt);
    enemy.think -= dt;
    const range = distance(enemy, player);
    const flare = world.flares.find(item => distance(enemy,item) < 15);
    if (enemy.think <= 0) {
      enemy.think = .18;
      const noise = player.sprinting ? 27 : player.moving ? player.crouching ? 3 : 10 : 0;
      const vision = (player.crouching ? 11 : 23) * settings.detection * (1-world.mist*.35) + (player.lantern ? 5 : 0);
      const forward = (Math.sin(enemy.heading)*(player.x-enemy.x)+Math.cos(enemy.heading)*(player.z-enemy.z))/Math.max(.1,range);
      const visible = range < vision && (forward > -.25 || enemy.mode === 'chase' || range < 5)
        && !lineBlocked(enemy, player, collisions);
      const heard = range < noise * settings.detection * (1-world.storm*.45);
      if (flare || (sheltered && range < 16)) {
        const origin = flare || player;
        enemy.mode = 'flee';
        enemy.targetX = enemy.x + (enemy.x-origin.x)*2;
        enemy.targetZ = enemy.z + (enemy.z-origin.z)*2;
        enemy.memory = 3;
      } else if (!sheltered && world.grace === 0 && (visible || heard)) {
        if (enemy.mode !== 'chase' && visible) events.push({type: 'spotted'});
        enemy.mode = visible ? 'chase' : 'investigate';
        enemy.lastSeenX = player.x;
        enemy.lastSeenZ = player.z;
        enemy.targetX = player.x;
        enemy.targetZ = player.z;
        enemy.memory = visible ? 6 : 4;
      } else if (enemy.mode === 'chase' && enemy.memory === 0) {
        enemy.mode = 'search';
        enemy.targetX = enemy.lastSeenX;
        enemy.targetZ = enemy.lastSeenZ;
        enemy.memory = 5;
      } else if (enemy.memory === 0 && enemy.mode !== 'patrol') {
        enemy.mode = 'patrol';
      }
      if (enemy.mode === 'patrol' && (Math.hypot(enemy.x-enemy.targetX,enemy.z-enemy.targetZ)<2 || random(world)<.025)) {
        const angle = random(world)*Math.PI*2;
        enemy.targetX = enemy.home.x+Math.cos(angle)*18;
        enemy.targetZ = enemy.home.z+Math.sin(angle)*18;
      }
    }
    const angle = Math.atan2(enemy.targetX-enemy.x,enemy.targetZ-enemy.z);
    const speed = enemy.mode === 'chase' ? 6.4 : enemy.mode === 'flee' ? 7.5 : enemy.mode === 'investigate' ? 3.8 : 1.5;
    if (Math.hypot(enemy.targetX-enemy.x,enemy.targetZ-enemy.z) > .8) {
      move(enemy, angle, speed*settings.speed*dt, collisions);
      enemy.phase += dt*speed*1.7;
    }
    if (!sheltered && world.grace === 0 && !flare && enemy.mode === 'chase') {
      threat = Math.max(threat, .65+Math.max(0,1-range/24)*.35);
      if (range < 2 && enemy.cooldown === 0 && world.invulnerable === 0 && !lineBlocked(enemy,player,collisions)) {
        events.push({type:'hit', damage:settings.damage, x:enemy.x, z:enemy.z});
        enemy.cooldown = 2.2;
        world.invulnerable = .8;
      }
    } else if (!sheltered && world.grace === 0 && enemy.mode === 'investigate') {
      threat = Math.max(threat,.35);
    } else if (!sheltered && world.grace === 0 && range < 16) {
      threat = Math.max(threat,.15);
    }
  }
  world.threat += (threat-world.threat)*(1-Math.exp(-dt*4));
  return events;
}
export function snapshotSurvival(world) {
  return {
    elapsed: world.elapsed, difficulty: world.difficulty, seed: world.seed, salvageAt:world.salvageAt,
    records: [...world.records], stats: {...world.stats}, flares:world.flares.map(flare=>({...flare})),
    enemies: world.enemies.map(({x,z,heading}) => ({x,z,heading,mode:'patrol'}))
  };
}

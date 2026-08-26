// @ts-check

export const ENEMY_AI_TYPE = Object.freeze({
  PURSUER: 'basic',
  INTERCEPTOR: 'interceptor',
  CURVE_RAIDER: 'curve'
});

const PROFILES = [
  enemyProfile({
    id: ENEMY_AI_TYPE.PURSUER,
    name: '집요한 추적자', temperament: '현재 위치 집착', shortTrait: '현재 추적',
    xp: 1, threatWeight: 1, color: '#ff8b5f',
    behavior: { kind: 'pursuit' }
  }),
  enemyProfile({
    id: ENEMY_AI_TYPE.INTERCEPTOR,
    name: '선행 요격자', temperament: '2초 후 이동 봉쇄', shortTrait: '2초 예측',
    xp: 2, threatWeight: 1.2, color: '#68e7ff',
    behavior: { kind: 'intercept', leadSeconds: 2, retargetSeconds: .7 }
  }),
  enemyProfile({
    id: ENEMY_AI_TYPE.CURVE_RAIDER,
    name: '궤도 도주자', temperament: '불규칙 횡단 · 시간 제한', shortTrait: '곡선 도주',
    xp: 3, threatWeight: 1.35, color: '#b9ff72',
    behavior: {
      kind: 'curve', life: [7, 10], amplitudeX: [35, 92], amplitudeY: [38, 105],
      frequencyX: [1.45, 2.65], frequencyY: [1.8, 3.15]
    }
  })
];

export const ENEMY_AI_PROFILES = Object.freeze(Object.fromEntries(PROFILES.map(item => [item.id, item])));

const MIX_BY_LEVEL = Object.freeze([
  { minLevel: 5, weights: Object.freeze({ basic: .4, interceptor: .35, curve: .25 }) },
  { minLevel: 4, weights: Object.freeze({ basic: .55, interceptor: .3, curve: .15 }) },
  { minLevel: 3, weights: Object.freeze({ basic: .65, interceptor: .35, curve: 0 }) },
  { minLevel: 2, weights: Object.freeze({ basic: .75, interceptor: .25, curve: 0 }) },
  { minLevel: 1, weights: Object.freeze({ basic: 1, interceptor: 0, curve: 0 }) }
]);

export function getEnemyAiProfile(id) {
  const result = ENEMY_AI_PROFILES[id];
  if (!result) throw new Error(`Unknown enemy AI profile: ${id}`);
  return result;
}

export function enemyAiProfiles() { return [...PROFILES]; }

export function enemyAiMixForLevel(level) {
  return MIX_BY_LEVEL.find(entry => level >= entry.minLevel)?.weights ?? MIX_BY_LEVEL.at(-1).weights;
}

export function selectEnemyAiType(level, roll) {
  const mix = enemyAiMixForLevel(level);
  let threshold = 0;
  for (const profile of PROFILES) {
    threshold += mix[profile.id] ?? 0;
    if (roll < threshold) return profile.id;
  }
  return PROFILES.at(-1).id;
}

export function enemyAiRoster(enemies) {
  const counts = new Map();
  for (const enemy of enemies) {
    const type = enemy.aiType ?? enemy.movementType ?? ENEMY_AI_TYPE.PURSUER;
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  if (!counts.size) return '대기 중';
  return PROFILES
    .filter(item => counts.has(item.id))
    .map(item => `${item.name}[${item.shortTrait}]×${counts.get(item.id)}`)
    .join(' · ');
}

function enemyProfile(definition) { return Object.freeze(definition); }

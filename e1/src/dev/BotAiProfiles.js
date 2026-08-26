// @ts-check

import { THEME } from '../config.js';

export const BOT_AI_TYPE = Object.freeze({
  ARC_ARCHITECT: 'arc-architect',
  SURGE_HUNTER: 'surge-hunter',
  SPORE_GARDENER: 'spore-gardener',
  RIPE_REAPER: 'ripe-reaper',
  MIRROR_DUELIST: 'mirror-duelist',
  BULLET_AUDITOR: 'bullet-auditor'
});

const PROFILES = [
  profile({
    id: BOT_AI_TYPE.ARC_ARCHITECT, themeId: THEME.CHAIN,
    name: '아크 설계자', temperament: '군집 폭발 · 침착한 중거리',
    navigation: { desiredRange: 330, reactionMin: .2, reactionMax: .35 },
    targeting: { cluster: 105, xp: 28, urgency: 70, distance: .055, wounded: 12, stackGap: 0, stickiness: 115 },
    ability: {}, upgradePaths: ['CIRCUIT', 'REACTOR', 'RETURN'], preferredUpgradeIds: ['chain-ricochet', 'chain-arc']
  }),
  profile({
    id: BOT_AI_TYPE.SURGE_HUNTER, themeId: THEME.CHAIN,
    name: '과전류 사냥꾼', temperament: '고가치 추격 · 공격적 근거리',
    navigation: { desiredRange: 285, reactionMin: .16, reactionMax: .29 },
    targeting: { cluster: 72, xp: 42, urgency: 118, distance: .04, wounded: 24, stackGap: 0, stickiness: 78 },
    ability: {}, upgradePaths: ['REACTOR', 'CIRCUIT', 'RETURN'], preferredUpgradeIds: ['chain-twin', 'chain-reactor']
  }),
  profile({
    id: BOT_AI_TYPE.SPORE_GARDENER, themeId: THEME.BLOOM,
    name: '포자 정원사', temperament: '분산 감염 · 안전한 숙성',
    navigation: { desiredRange: 350, reactionMin: .2, reactionMax: .35 },
    targeting: { cluster: 0, xp: 26, urgency: 85, distance: .05, wounded: 0, stackGap: 32, stickiness: 115 },
    ability: { harvestStacks: 4, emergencyHp: .65, emergencyStacks: 2, terminalEnemies: 3, terminalStacks: 10 },
    upgradePaths: ['CONTAGION', 'LEECH', 'OVERDOSE'], preferredUpgradeIds: ['bloom-garden', 'bloom-spread']
  }),
  profile({
    id: BOT_AI_TYPE.RIPE_REAPER, themeId: THEME.BLOOM,
    name: '숙성 수확자', temperament: '빠른 처형 · 위험 감수 회복',
    navigation: { desiredRange: 335, reactionMin: .16, reactionMax: .28 },
    targeting: { cluster: 0, xp: 34, urgency: 100, distance: .05, wounded: 0, stackGap: 19, stickiness: 90 },
    ability: { harvestStacks: 3, emergencyHp: .78, emergencyStacks: 2, terminalEnemies: 2, terminalStacks: 8 },
    upgradePaths: ['LEECH', 'CONTAGION', 'OVERDOSE'], preferredUpgradeIds: ['bloom-dash', 'bloom-overdose']
  }),
  profile({
    id: BOT_AI_TYPE.MIRROR_DUELIST, themeId: THEME.HIJACK,
    name: '거울 결투가', temperament: '정밀 패링 · 돌진 역습',
    navigation: { desiredRange: 400, reactionMin: .16, reactionMax: .28 },
    targeting: { cluster: 0, xp: 30, urgency: 90, distance: .05, wounded: 0, stackGap: 0, stickiness: 105 },
    ability: { parryWindowBonus: .08, parryClearance: 28, guardTime: .3, guardClearance: 42 },
    upgradePaths: ['RETURN', 'SHIELD', 'DEBT'], preferredUpgradeIds: ['hijack-orbit', 'hijack-return']
  }),
  profile({
    id: BOT_AI_TYPE.BULLET_AUDITOR, themeId: THEME.HIJACK,
    name: '탄막 감사관', temperament: '넓은 가드 · 생존 우선',
    navigation: { desiredRange: 445, reactionMin: .14, reactionMax: .25 },
    targeting: { cluster: 0, xp: 26, urgency: 80, distance: .055, wounded: 0, stackGap: 0, stickiness: 125 },
    ability: { parryWindowBonus: .1, parryClearance: 32, guardTime: .38, guardClearance: 50 },
    upgradePaths: ['SHIELD', 'RETURN', 'DEBT'], preferredUpgradeIds: ['hijack-aim', 'hijack-shield']
  })
];

export const BOT_AI_PROFILES = Object.freeze(Object.fromEntries(PROFILES.map(item => [item.id, item])));

export function getBotAiProfile(id) {
  const result = BOT_AI_PROFILES[id];
  if (!result) throw new Error(`Unknown bot AI profile: ${id}`);
  return result;
}

export function botAiProfilesForTheme(themeId) {
  return PROFILES.filter(item => item.themeId === themeId);
}

export function botAiProfileForStage(themeId, stage = 1) {
  const profiles = botAiProfilesForTheme(themeId);
  if (!profiles.length) throw new Error(`No bot AI profiles registered for theme: ${themeId}`);
  return profiles[(Math.max(1, Math.floor(stage)) - 1) % profiles.length];
}

function profile(definition) {
  return Object.freeze({ ...definition, preferredUpgradeIds: Object.freeze([...(definition.preferredUpgradeIds ?? [])]), alternativeChance: .2 });
}

// @ts-check

import { THEME } from '../config.js';

const Q = Object.freeze({
  IMPACT: 'Immediate Impact',
  SYNERGY: 'Synergy Value',
  DECISION: 'Decision Change',
  CEILING: 'Ceiling Unlock',
  VISUAL: 'Visual Readability'
});

const upgrade = (id, themeId, path, title, description, effects, options = {}) => ({
  id, themeId, path, title, description, effects,
  tags: options.tags ?? [path],
  quality: options.quality ?? [Q.IMPACT, Q.VISUAL],
  rarity: options.rarity ?? 'RARE',
  requiresRuleIds: options.requiresRuleIds ?? [],
  exclusiveGroup: options.exclusiveGroup ?? null,
  balanceClass: options.balanceClass ?? 'offense',
  mechanicId: options.mechanicId ?? null,
  repeatable: options.repeatable ?? false
});

export const UPGRADE_CATALOG = Object.freeze([
  upgrade('chain-arc', THEME.CHAIN, 'CIRCUIT', '감전 도약', '명중 시 190px 안의 가장 가까운 미타격 적에게 기본 17 감전 피해가 1회 도약한다.', [{ type: 'stat.add', stat: 'chainJumps', value: 1 }, { type: 'stat.add', stat: 'chainDamage', value: 4 }]),
  upgrade('chain-crit-current', THEME.CHAIN, 'CIRCUIT', '고전압', '감전 피해가 70% 증가해 연쇄 처치가 빨라진다.', [{ type: 'stat.multiply', stat: 'chainDamage', value: 1.7 }], { requiresRuleIds: ['chain.hasArc'], quality: [Q.IMPACT, Q.SYNERGY] }),
  upgrade('chain-storm', THEME.CHAIN, 'CIRCUIT', '폐회로', '연쇄가 끝날 때 마지막 적 주변에 추가 감전이 폭발한다.', [{ type: 'flag.enable', flag: 'stormEnd' }], { requiresRuleIds: ['chain.hasArc'], rarity: 'EVOLUTION', quality: [Q.SYNERGY, Q.CEILING, Q.VISUAL] }),
  upgrade('chain-return', THEME.CHAIN, 'RETURN', '귀환 탄환', '탄환이 수명의 절반에서 되돌아오며 다시 적중한다.', [{ type: 'flag.enable', flag: 'returning' }], { exclusiveGroup: 'chain.trajectory', mechanicId: 'returning', quality: [Q.DECISION, Q.CEILING, Q.VISUAL] }),
  upgrade('chain-twin', THEME.CHAIN, 'RETURN', '쌍심지', '92% 피해 탄환 두 발을 좌우로 붙여 동시에 발사한다.', [{ type: 'stat.add', stat: 'projectileCount', value: 1 }, { type: 'stat.multiply', stat: 'projectileDamageScale', value: .92 }], { exclusiveGroup: 'chain.trajectory', mechanicId: 'twin-shot', quality: [Q.IMPACT, Q.DECISION, Q.VISUAL] }),
  upgrade('chain-twin-fuse', THEME.CHAIN, 'RETURN', '합류 점화', '쌍탄이 0.18초 안에 같은 적을 맞히면 기본 피해 35%의 합류 감전을 일으킨다.', [{ type: 'flag.enable', flag: 'twinFuse' }], { requiresRuleIds: ['chain.twin'], rarity: 'EVOLUTION', mechanicId: 'twin-fuse', quality: [Q.SYNERGY, Q.CEILING, Q.VISUAL] }),
  upgrade('chain-ricochet', THEME.CHAIN, 'RETURN', '담벼락 도탄', '탄환이 경계에서 한 번 튕기며 520px 안의 미타격 적을 다시 노린다.', [{ type: 'stat.add', stat: 'wallBounces', value: 1 }], { exclusiveGroup: 'chain.trajectory', mechanicId: 'ricochet', quality: [Q.IMPACT, Q.DECISION, Q.VISUAL] }),
  upgrade('chain-ricochet-echo', THEME.CHAIN, 'RETURN', '골목 메아리', '도탄 횟수 +1. 반사할 때마다 피해가 20% 증가한다.', [{ type: 'stat.add', stat: 'wallBounces', value: 1 }, { type: 'stat.multiply', stat: 'bounceDamage', value: 1.2 }], { requiresRuleIds: ['chain.ricochet'], rarity: 'EVOLUTION', mechanicId: 'ricochet-echo', quality: [Q.SYNERGY, Q.CEILING, Q.VISUAL] }),
  upgrade('chain-pierce', THEME.CHAIN, 'RETURN', '관통 회수', '탄환 관통 +2. 선택한 탄도의 표적 수가 늘어난다.', [{ type: 'stat.add', stat: 'pierce', value: 2 }], { requiresRuleIds: ['chain.hasTrajectory'] }),
  upgrade('chain-return-power', THEME.CHAIN, 'RETURN', '되감기 증폭', '귀환 중 피해가 80% 증가한다.', [{ type: 'flag.enable', flag: 'returnPower' }], { requiresRuleIds: ['chain.returning'], quality: [Q.IMPACT, Q.SYNERGY] }),
  upgrade('chain-reactor', THEME.CHAIN, 'REACTOR', '시체 반응로', '공격 속도 +12%. 처치한 적이 작은 폭발을 일으킨다.', [{ type: 'stat.add', stat: 'explosionRadius', value: 52 }, { type: 'stat.multiply', stat: 'fireRate', value: 1.12 }], { quality: [Q.IMPACT, Q.DECISION, Q.VISUAL] }),
  upgrade('chain-supercritical', THEME.CHAIN, 'REACTOR', '초임계', '폭발이 넷 이상 적중하면 더 큰 2차 폭발이 생긴다.', [{ type: 'flag.enable', flag: 'supercritical' }], { requiresRuleIds: ['chain.hasExplosion'], rarity: 'EVOLUTION', quality: [Q.SYNERGY, Q.CEILING, Q.VISUAL] }),
  upgrade('chain-fast-core', THEME.CHAIN, 'REACTOR', '고속 노심', '공격 속도 +35%.', [{ type: 'stat.multiply', stat: 'fireRate', value: 1.35 }]),
  upgrade('chain-mastery', THEME.CHAIN, 'CIRCUIT', '회로 숙련', '피해 +18%, 감전 피해 +12%.', [{ type: 'stat.multiply', stat: 'damage', value: 1.18 }, { type: 'stat.multiply', stat: 'chainDamage', value: 1.12 }], { repeatable: true, rarity: 'MASTERY' }),
  upgrade('return-mastery', THEME.CHAIN, 'RETURN', '탄도 숙련', '투사체 속도 +12%, 관통 +1.', [{ type: 'stat.multiply', stat: 'projectileSpeed', value: 1.12 }, { type: 'stat.add', stat: 'pierce', value: 1 }], { requiresRuleIds: ['chain.hasTrajectory'], repeatable: true, rarity: 'MASTERY' }),
  upgrade('reactor-mastery', THEME.CHAIN, 'REACTOR', '반응로 숙련', '폭발 범위 +18, 피해 +10%.', [{ type: 'stat.add', stat: 'explosionRadius', value: 18 }, { type: 'stat.multiply', stat: 'damage', value: 1.1 }], { repeatable: true, rarity: 'MASTERY' }),

  upgrade('bloom-infection', THEME.BLOOM, 'CONTAGION', '다중 감염', '탄환마다 감염 스택을 1개 더 심는다.', [{ type: 'stat.add', stat: 'infection', value: 1 }]),
  upgrade('bloom-spread', THEME.BLOOM, 'CONTAGION', '기생 확산', '감염된 적 처치 시 주변 적 둘에게 스택이 번진다.', [{ type: 'stat.add', stat: 'spread', value: 2 }], { quality: [Q.IMPACT, Q.SYNERGY, Q.VISUAL] }),
  upgrade('bloom-garden', THEME.BLOOM, 'CONTAGION', '포자 정원', '매 6번째 탄환이 4초 동안 피해와 감염을 주는 포자 정원을 만든다.', [{ type: 'stat.add', stat: 'gardenEvery', value: 6 }], { mechanicId: 'spore-garden', quality: [Q.IMPACT, Q.DECISION, Q.VISUAL] }),
  upgrade('bloom-monsoon-garden', THEME.BLOOM, 'CONTAGION', '우기 만개', '포자 정원이 커지고 오래 남으며, 정원 안 수확이 주변에 피해를 방출한다.', [{ type: 'stat.add', stat: 'gardenRadius', value: 18 }, { type: 'stat.add', stat: 'gardenDuration', value: 2 }, { type: 'flag.enable', flag: 'gardenHarvestPulse' }], { requiresRuleIds: ['bloom.garden'], rarity: 'EVOLUTION', mechanicId: 'garden-harvest', quality: [Q.SYNERGY, Q.CEILING, Q.VISUAL] }),
  upgrade('bloom-network', THEME.BLOOM, 'CONTAGION', '살아 있는 망', '스택 5 이상 적은 근처 감염체와 피해를 공유한다.', [{ type: 'flag.enable', flag: 'livingNetwork' }], { requiresRuleIds: ['bloom.hasSpread'], rarity: 'EVOLUTION', quality: [Q.SYNERGY, Q.CEILING, Q.VISUAL] }),
  upgrade('bloom-leech', THEME.BLOOM, 'LEECH', '흡혈 수확', '수확 회복량이 두 배가 되고 수확 피해가 15% 증가한다.', [{ type: 'stat.multiply', stat: 'harvestHeal', value: 2 }, { type: 'stat.multiply', stat: 'harvestDamage', value: 1.15 }], { balanceClass: 'survival' }),
  upgrade('bloom-armor', THEME.BLOOM, 'LEECH', '생체 갑각', '최대 체력 +20%. 피격 시 주변 적에게 감염 2스택을 반격한다.', [{ type: 'stat.multiply', stat: 'maxHp', value: 1.2 }, { type: 'flag.enable', flag: 'retaliatorySpores' }], { balanceClass: 'survival', mechanicId: 'retaliatory-spores' }),
  upgrade('bloom-dash', THEME.BLOOM, 'LEECH', '공생 도약', '대시 재사용 시간이 15% 감소하고 출발점에 작은 포자 정원을 남긴다.', [{ type: 'stat.multiply', stat: 'dashCooldown', value: .85 }, { type: 'flag.enable', flag: 'dashGarden' }], { balanceClass: 'survival', mechanicId: 'dash-garden' }),
  upgrade('bloom-overdose', THEME.BLOOM, 'OVERDOSE', '과다복용', '수확 피해 +75%.', [{ type: 'stat.multiply', stat: 'harvestDamage', value: 1.75 }]),
  upgrade('bloom-compression', THEME.BLOOM, 'OVERDOSE', '스택 압축', '수확 피해 +15%. 스택 6 이상 수확은 작은 폭발을 일으킨다.', [{ type: 'stat.multiply', stat: 'harvestDamage', value: 1.15 }, { type: 'flag.enable', flag: 'harvestBurst' }], { quality: [Q.IMPACT, Q.DECISION, Q.VISUAL] }),
  upgrade('bloom-terminal', THEME.BLOOM, 'OVERDOSE', '최종 수확', 'Q를 1초 누르면 모든 감염체를 동시에 수확한다.', [{ type: 'flag.enable', flag: 'terminalHarvest' }], { requiresRuleIds: ['bloom.harvestBurst'], rarity: 'LEGENDARY', quality: [Q.DECISION, Q.CEILING, Q.VISUAL] }),
  upgrade('contagion-mastery', THEME.BLOOM, 'CONTAGION', '감염 숙련', '감염 +1, 투사체 피해 +10%.', [{ type: 'stat.add', stat: 'infection', value: 1 }, { type: 'stat.multiply', stat: 'damage', value: 1.1 }], { repeatable: true, rarity: 'MASTERY' }),
  upgrade('leech-mastery', THEME.BLOOM, 'LEECH', '흡수 숙련', '최대 체력 +8%, 회복 +15%.', [{ type: 'stat.multiply', stat: 'maxHp', value: 1.08 }, { type: 'stat.multiply', stat: 'harvestHeal', value: 1.15 }], { repeatable: true, rarity: 'MASTERY' }),
  upgrade('overdose-mastery', THEME.BLOOM, 'OVERDOSE', '과다복용 숙련', '수확 피해 +22%.', [{ type: 'stat.multiply', stat: 'harvestDamage', value: 1.22 }], { repeatable: true, rarity: 'MASTERY' }),

  upgrade('hijack-return', THEME.HIJACK, 'RETURN', '반사 증폭', '반사 미사일 피해 +45%.', [{ type: 'stat.multiply', stat: 'returnPower', value: 1.45 }]),
  upgrade('hijack-aim', THEME.HIJACK, 'RETURN', '빌린 조준', '반사체의 보스 추적력이 크게 증가한다.', [{ type: 'flag.enable', flag: 'borrowedAim' }], { exclusiveGroup: 'hijack.reflectionPattern', mechanicId: 'borrowed-aim', quality: [Q.IMPACT, Q.DECISION, Q.VISUAL] }),
  upgrade('hijack-orbit', THEME.HIJACK, 'RETURN', '압류 궤도', '패링한 미사일을 최대 3개 보관한 뒤 강화된 일제 사격으로 돌려준다.', [{ type: 'stat.add', stat: 'orbitCapacity', value: 3 }], { exclusiveGroup: 'hijack.reflectionPattern', mechanicId: 'capture-orbit', quality: [Q.IMPACT, Q.DECISION, Q.VISUAL] }),
  upgrade('hijack-orbit-verdict', THEME.HIJACK, 'RETURN', '합동 심문', '압류 용량 +2. 궤도 반사 피해가 25% 증가한다.', [{ type: 'stat.add', stat: 'orbitCapacity', value: 2 }, { type: 'stat.multiply', stat: 'orbitDamage', value: 1.25 }], { requiresRuleIds: ['hijack.orbit'], rarity: 'EVOLUTION', mechanicId: 'orbit-verdict', quality: [Q.SYNERGY, Q.CEILING, Q.VISUAL] }),
  upgrade('hijack-final', THEME.HIJACK, 'RETURN', '최후 진술', '보스 체력 15% 이하에서 반사 피해가 3배가 된다.', [{ type: 'flag.enable', flag: 'finalWord' }], { requiresRuleIds: ['hijack.hasReflectionPattern'], rarity: 'EVOLUTION', quality: [Q.SYNERGY, Q.CEILING, Q.VISUAL] }),
  upgrade('hijack-window', THEME.HIJACK, 'SHIELD', '관대한 반박', '패링 판정 시간 +0.12초.', [{ type: 'stat.add', stat: 'parryWindow', value: .12 }]),
  upgrade('hijack-radius', THEME.HIJACK, 'SHIELD', '넓은 관할', '패링 반경 +28px.', [{ type: 'stat.add', stat: 'parryRadius', value: 28 }]),
  upgrade('hijack-shield', THEME.HIJACK, 'SHIELD', '방벽 압류', '패링마다 방벽 16을 얻고, 방벽이 남아 있으면 기본 공격 피해가 25% 증가한다.', [{ type: 'stat.add', stat: 'shieldGain', value: 16 }, { type: 'flag.enable', flag: 'shieldVoltage' }], { balanceClass: 'survival' }),
  upgrade('hijack-debt', THEME.HIJACK, 'DEBT', '냉각 부채', '기본 공격 피해 +35%.', [{ type: 'stat.multiply', stat: 'damage', value: 1.35 }]),
  upgrade('hijack-third', THEME.HIJACK, 'DEBT', '세 번째 불이행', '세 번째 보스 사격은 스스로에게 피해를 준다.', [{ type: 'flag.enable', flag: 'thirdDefault' }], { quality: [Q.IMPACT, Q.DECISION, Q.VISUAL] }),
  upgrade('hijack-bankruptcy', THEME.HIJACK, 'DEBT', '법정 파산', '보스 보호막 파괴 시 남은 보호막만큼 추가 피해.', [{ type: 'flag.enable', flag: 'bankruptcy' }], { rarity: 'LEGENDARY', quality: [Q.SYNERGY, Q.CEILING, Q.VISUAL] }),
  upgrade('hijack-return-mastery', THEME.HIJACK, 'RETURN', '반사 숙련', '반사 피해 +18%.', [{ type: 'stat.multiply', stat: 'returnPower', value: 1.18 }], { repeatable: true, rarity: 'MASTERY' }),
  upgrade('hijack-shield-mastery', THEME.HIJACK, 'SHIELD', '방벽 숙련', '패링 반경 +10, 최대 체력 +6%.', [{ type: 'stat.add', stat: 'parryRadius', value: 10 }, { type: 'stat.multiply', stat: 'maxHp', value: 1.06 }], { repeatable: true, rarity: 'MASTERY' }),
  upgrade('hijack-debt-mastery', THEME.HIJACK, 'DEBT', '부채 숙련', '공격 속도 +14%.', [{ type: 'stat.multiply', stat: 'fireRate', value: 1.14 }], { repeatable: true, rarity: 'MASTERY' })
]);

const REQUIREMENTS = Object.freeze({
  'chain.hasArc': state => state.stats.chainJumps > 0,
  'chain.returning': state => Boolean(state.flags.returning),
  'chain.twin': state => state.stats.projectileCount > 1,
  'chain.ricochet': state => state.stats.wallBounces > 0,
  'chain.hasTrajectory': state => Boolean(state.flags.returning) || state.stats.projectileCount > 1 || state.stats.wallBounces > 0,
  'chain.hasExplosion': state => state.stats.explosionRadius > 0,
  'bloom.hasSpread': state => state.stats.spread > 0,
  'bloom.garden': state => state.stats.gardenEvery > 0,
  'bloom.harvestBurst': state => Boolean(state.flags.harvestBurst),
  'hijack.borrowedAim': state => Boolean(state.flags.borrowedAim),
  'hijack.orbit': state => state.stats.orbitCapacity > 0,
  'hijack.hasReflectionPattern': state => Boolean(state.flags.borrowedAim) || state.stats.orbitCapacity > 0
});

const EFFECT_TYPES = new Set(['stat.add', 'stat.multiply', 'flag.enable']);
const BALANCE_CLASSES = new Set(['offense', 'survival', 'mechanic']);

export function validateUpgradeDefinition(definition) {
  if (!definition?.id || !Object.values(THEME).includes(definition.themeId)) throw new Error('Upgrade requires a valid id and themeId');
  if (!definition.path || !definition.title || !definition.description) throw new Error(`Upgrade ${definition.id} is missing display data`);
  if (!Array.isArray(definition.quality) || new Set(definition.quality).size < 2) throw new Error(`Power Floor failed: ${definition.id}`);
  if (!Array.isArray(definition.effects) || definition.effects.length === 0) throw new Error(`Upgrade ${definition.id} has no effects`);
  if (!BALANCE_CLASSES.has(definition.balanceClass)) throw new Error(`Unknown balance class ${definition.balanceClass} in ${definition.id}`);
  for (const effect of definition.effects) if (!EFFECT_TYPES.has(effect.type)) throw new Error(`Unknown effect ${effect.type} in ${definition.id}`);
  for (const ruleId of definition.requiresRuleIds) if (!REQUIREMENTS[ruleId]) throw new Error(`Unknown requirement ${ruleId} in ${definition.id}`);
  return true;
}

export function validateUpgradeCatalog(catalog = UPGRADE_CATALOG) {
  const ids = new Set();
  for (const definition of catalog) {
    validateUpgradeDefinition(definition);
    if (ids.has(definition.id)) throw new Error(`Duplicate upgrade id ${definition.id}`);
    ids.add(definition.id);
  }
  return true;
}

export function isUpgradeEligible(definition, themeState, excludedIds = new Set(), catalog = UPGRADE_CATALOG) {
  if (definition.themeId !== themeState.themeId || excludedIds.has(definition.id)) return false;
  if (!definition.repeatable && themeState.upgradeIds.includes(definition.id)) return false;
  if (definition.exclusiveGroup && themeState.upgradeIds.some(id => catalog.find(item => item.id === id)?.exclusiveGroup === definition.exclusiveGroup)) return false;
  return definition.requiresRuleIds.every(ruleId => REQUIREMENTS[ruleId](themeState));
}

export function applyUpgrade(themeState, definition, catalog = UPGRADE_CATALOG) {
  validateUpgradeDefinition(definition);
  if (definition.themeId !== themeState.themeId) throw new Error(`Cannot apply ${definition.id} to ${themeState.themeId}`);
  if (!definition.repeatable && themeState.upgradeIds.includes(definition.id)) throw new Error(`Upgrade already selected: ${definition.id}`);
  if (definition.exclusiveGroup && themeState.upgradeIds.some(id => catalog.find(item => item.id === id)?.exclusiveGroup === definition.exclusiveGroup)) {
    throw new Error(`Exclusive upgrade group already selected: ${definition.exclusiveGroup}`);
  }
  for (const effect of definition.effects) {
    if (effect.type === 'flag.enable') {
      themeState.flags[effect.flag] = true;
      continue;
    }
    if (!(effect.stat in themeState.stats)) throw new Error(`Unknown stat ${effect.stat} for ${themeState.themeId}`);
    if (effect.type === 'stat.add') themeState.stats[effect.stat] += effect.value;
    else if (effect.type === 'stat.multiply') themeState.stats[effect.stat] *= effect.value;
  }
  themeState.upgradeIds.push(definition.id);
}

export class ChoiceDirector {
  constructor(rng, catalog = UPGRADE_CATALOG) { this.rng = rng; this.catalog = catalog; validateUpgradeCatalog(catalog); }

  makeOffer(themeState, excludedIds = new Set()) {
    const paths = [...new Set(this.catalog.filter(item => item.themeId === themeState.themeId).map(item => item.path))];
    const offer = paths.map(path => {
      const candidates = this.catalog.filter(item => item.path === path && isUpgradeEligible(item, themeState, excludedIds, this.catalog));
      const unique = candidates.filter(item => !item.repeatable);
      return this.rng.pick(unique.length ? unique : candidates);
    }).filter(Boolean);
    if (offer.length !== 3) throw new Error(`Theme ${themeState.themeId} must produce exactly three choices`);
    return offer;
  }

  makeDraftRows(themeState, count) {
    const excluded = new Set();
    const rows = [];
    for (let index = 0; index < Math.max(0, Math.floor(count)); index++) {
      const choices = this.makeOffer(themeState, excluded);
      choices.filter(choice => !choice.repeatable).forEach(choice => excluded.add(choice.id));
      rows.push({ id: `${themeState.themeId}-${index}`, themeId: themeState.themeId, choices });
    }
    return rows;
  }
}

validateUpgradeCatalog();

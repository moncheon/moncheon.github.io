// @ts-check

import { PHASE, THEME } from '../config.js';

const definitions = [
  {
    id: THEME.CHAIN, label: 'CHAIN REACTOR', phase: PHASE.FIELD,
    paths: ['CIRCUIT', 'RETURN', 'REACTOR'], accent: '#52f7ff',
    controls: ['WASD 이동', 'F 자동 공격 토글', 'Shift/Space 대시']
  },
  {
    id: THEME.BLOOM, label: 'PARASITE BLOOM', phase: PHASE.FIELD,
    paths: ['CONTAGION', 'LEECH', 'OVERDOSE'], accent: '#b65cff',
    controls: ['WASD 이동', 'F 자동 공격 토글', 'Q 수확']
  },
  {
    id: THEME.HIJACK, label: 'RULE HIJACK', phase: PHASE.BOSS,
    paths: ['RETURN', 'SHIELD', 'DEBT'], accent: '#ffd84d',
    controls: ['WASD 이동', 'F 자동 공격 토글', 'E 패링/가드']
  }
];

export function validateThemeDefinition(definition) {
  if (!Object.values(THEME).includes(definition?.id)) throw new Error('Theme requires a known id');
  if (!Object.values(PHASE).includes(definition.phase)) throw new Error(`Theme ${definition.id} requires a valid phase`);
  if (!definition.label || !definition.accent) throw new Error(`Theme ${definition.id} is missing presentation data`);
  if (!Array.isArray(definition.paths) || definition.paths.length !== 3 || new Set(definition.paths).size !== 3) {
    throw new Error(`Theme ${definition.id} requires three unique upgrade paths`);
  }
  return true;
}

export class ThemeRegistry {
  constructor(items = definitions) {
    this.items = new Map();
    for (const definition of items) {
      validateThemeDefinition(definition);
      if (this.items.has(definition.id)) throw new Error(`Duplicate theme ${definition.id}`);
      this.items.set(definition.id, Object.freeze({ ...definition, paths: Object.freeze([...definition.paths]), controls: Object.freeze([...definition.controls]) }));
    }
  }

  get(themeId) {
    const definition = this.items.get(themeId);
    if (!definition) throw new Error(`Unknown theme ${themeId}`);
    return definition;
  }

  list() { return [...this.items.values()]; }
}

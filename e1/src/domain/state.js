// @ts-check

import { PHASE, THEME, fieldThemeForStage } from '../config.js';
import { createThemeState } from './progression.js';

export function createProfileState() {
  return {
    version: 1, achievements: {}, achievementRewards: [], globalXp: 0, globalLevel: 0,
    totalBossStagesCleared: 0, totalThemeLevelsGained: 0, noHitBosses: 0,
    pacifistBosses: 0, rewardLedger: []
  };
}

export function normalizeProfileState(value) {
  const base = createProfileState();
  if (!value || value.version !== 1) return base;
  return {
    ...base,
    achievements: value.achievements && typeof value.achievements === 'object' ? { ...value.achievements } : {},
    achievementRewards: stringArray(value.achievementRewards),
    globalXp: nonNegative(value.globalXp), globalLevel: integer(value.globalLevel),
    totalBossStagesCleared: integer(value.totalBossStagesCleared),
    totalThemeLevelsGained: integer(value.totalThemeLevelsGained),
    noHitBosses: integer(value.noHitBosses), pacifistBosses: integer(value.pacifistBosses),
    rewardLedger: stringArray(value.rewardLedger).slice(-5000)
  };
}

export function createCampaignState(seed, id = `${Date.now()}-${Math.floor(seed)}`) {
  return {
    version: 1, id, seed: Number(seed), stage: 1, phase: PHASE.FIELD, currentTheme: THEME.CHAIN,
    unlockedThemes: [THEME.CHAIN], themeStates: { [THEME.CHAIN]: createThemeState(THEME.CHAIN) },
    openingPicksPerTheme: 0, skippedDraftPicks: {}, genome: { version: 1, seed: Number(seed), themes: {}, stages: [], result: null },
    startedAt: Date.now()
  };
}

export function normalizeCampaignState(value) {
  if (!value || value.version !== 1 || !Number.isFinite(Number(value.seed))) return null;
  const stage = Math.max(1, integer(value.stage));
  const phase = value.phase === PHASE.BOSS ? PHASE.BOSS : PHASE.FIELD;
  const expectedTheme = phase === PHASE.BOSS ? THEME.HIJACK : fieldThemeForStage(stage);
  const themeStates = {};
  for (const themeId of Object.values(THEME)) {
    if (value.themeStates?.[themeId]) themeStates[themeId] = normalizeThemeState(value.themeStates[themeId], themeId);
  }
  themeStates[expectedTheme] ??= createThemeState(expectedTheme);
  /** @type {string[]} */
  const knownThemeIds = Object.values(THEME);
  const unlockedThemes = [...new Set(stringArray(value.unlockedThemes).filter(id => knownThemeIds.includes(id)))];
  if (!unlockedThemes.includes(expectedTheme)) unlockedThemes.push(expectedTheme);
  return {
    ...createCampaignState(Number(value.seed), String(value.id ?? `${Date.now()}-${value.seed}`)),
    stage, phase, currentTheme: expectedTheme, unlockedThemes, themeStates,
    openingPicksPerTheme: integer(value.openingPicksPerTheme),
    skippedDraftPicks: value.skippedDraftPicks && typeof value.skippedDraftPicks === 'object' ? { ...value.skippedDraftPicks } : {},
    genome: value.genome && typeof value.genome === 'object' ? value.genome : { version: 1, seed: Number(value.seed), themes: {}, stages: [], result: null },
    startedAt: Number(value.startedAt) || Date.now()
  };
}

export function normalizeThemeState(value, themeId) {
  const base = createThemeState(themeId);
  return {
    ...base, level: integer(value.level), xp: nonNegative(value.xp), totalXp: nonNegative(value.totalXp),
    pendingChoices: integer(value.pendingChoices), upgradeIds: stringArray(value.upgradeIds),
    stats: { ...base.stats, ...(value.stats && typeof value.stats === 'object' ? value.stats : {}) },
    flags: value.flags && typeof value.flags === 'object' ? { ...value.flags } : {},
    calmCredits: integer(value.calmCredits), entryDraftApplied: Boolean(value.entryDraftApplied)
  };
}

const nonNegative = value => Math.max(0, Number(value) || 0);
const integer = value => Math.max(0, Math.floor(Number(value) || 0));
const stringArray = value => Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];

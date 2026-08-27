// @ts-check

import { THEME } from '../config.js';

export function xpRequiredForLevel(level) {
  const safe = Math.max(0, Math.floor(Number(level) || 0));
  const early = [3, 9, 24, 69, 198];
  return safe < early.length ? early[safe] : Math.round(early[4] * 1.45 ** (safe - 4));
}

export function globalXpRequired(level) { return 20 + 10 * Math.max(0, Math.floor(Number(level) || 0)); }
export function openingPickCount(globalLevel) { return Math.floor(Math.max(0, Number(globalLevel) || 0) / 5); }

export function createThemeState(themeId) {
  return {
    themeId, level: 0, xp: 0, totalXp: 0, pendingChoices: 0, upgradeIds: [],
    stats: createBaseStats(themeId), flags: {}, calmCredits: 0, entryDraftApplied: false
  };
}

export function createBaseStats(themeId) {
  if (themeId === THEME.BLOOM) return {
    maxHp: 63, damage: 14, fireRate: 5.4, moveSpeed: 245, projectileSpeed: 520,
    infection: 1, harvestDamage: 12, harvestHeal: .5, spread: 0, dashCooldown: 2.2,
    gardenEvery: 0, gardenRadius: 68, gardenDuration: 4, gardenDamage: 4
  };
  if (themeId === THEME.HIJACK) return {
    maxHp: 91, damage: 30, fireRate: 4.6, moveSpeed: 245, projectileSpeed: 610,
    returnPower: 1, parryWindow: .55, parryRadius: 72, shieldGain: 0, dashCooldown: 2.1,
    orbitCapacity: 0, orbitDamage: 1
  };
  return {
    maxHp: 56, damage: 20, fireRate: 7.2, moveSpeed: 255, projectileSpeed: 650,
    pierce: 1, chainJumps: 0, chainDamage: 13, explosionRadius: 0, dashCooldown: 2.2,
    projectileCount: 1, projectileDamageScale: 1, wallBounces: 0, bounceDamage: 1
  };
}

export function addThemeXp(themeState, amount) {
  const safe = Number(amount);
  if (!Number.isFinite(safe) || safe <= 0) return 0;
  themeState.xp += safe;
  themeState.totalXp += safe;
  let gained = 0;
  while (themeState.xp >= xpRequiredForLevel(themeState.level)) {
    themeState.xp -= xpRequiredForLevel(themeState.level);
    themeState.level++;
    themeState.pendingChoices++;
    gained++;
  }
  return gained;
}

export function addGlobalXp(profile, amount) {
  profile.globalXp += Math.max(0, Number(amount) || 0);
  let gained = 0;
  while (profile.globalXp >= globalXpRequired(profile.globalLevel)) {
    profile.globalXp -= globalXpRequired(profile.globalLevel);
    profile.globalLevel++;
    gained++;
  }
  return gained;
}

export function evasionRating(noHitBosses = 0) { return 35 * Math.sqrt(Math.max(0, Number(noHitBosses) || 0)); }
export function stageAccuracy(stage = 1) { return Math.max(0, Math.floor(Number(stage) || 1) - 1) * 12; }
export function dodgeChance(noHitBosses, stage) { return Math.max(0, Math.min(1, (evasionRating(noHitBosses) - stageAccuracy(stage)) / 100)); }
export function maxSkippableStage(noHitBosses) {
  const rating = evasionRating(noHitBosses);
  return rating < 100 ? 0 : 1 + Math.floor((rating - 100) / 12);
}

// @ts-check

const LEVEL_THREE = 3;

export function startingEnemyLevel(playerLevel = 0) {
  return Math.max(1, Math.floor(Number(playerLevel) || 0) - 1);
}

export function maximumEnemyLevel(playerLevel = 0) {
  return Math.max(2, Math.floor(Number(playerLevel) || 0) + 2);
}

export function enemyLevelSpec(level = 1) {
  const safe = Math.max(1, Math.floor(Number(level) || 1));
  const beyond = Math.max(0, safe - LEVEL_THREE);
  return Object.freeze({
    level: safe,
    hpMultiplier: safe === 1 ? .72 : safe === 2 ? .85 : Math.min(3.2, 1.16 ** beyond),
    speedMultiplier: safe === 1 ? .88 : safe === 2 ? .94 : Math.min(1.35, 1.025 ** beyond),
    radiusMultiplier: safe === 1 ? .86 : safe === 2 ? .93 : Math.min(1.18, 1 + beyond * .02),
    xpMultiplier: 1.45 ** (safe - 1),
    visualTier: Math.min(3, safe)
  });
}

export function enemyXpForLevel(baseXp, elite, level) {
  const base = Math.max(1, Math.floor(Number(baseXp) || 1)) + (elite ? 2 : 0);
  return Math.ceil(base * enemyLevelSpec(level).xpMultiplier);
}

export class EnemyLevelDirector {
  constructor(playerLevel = 0) {
    this.level = startingEnemyLevel(playerLevel);
    this.lowPopulationArmed = false;
  }

  observePopulation(enemyCount) {
    if (enemyCount > 3) this.lowPopulationArmed = true;
  }

  defeated(enemyCount, playerLevel) {
    if (!this.lowPopulationArmed || enemyCount > 3 || this.level >= maximumEnemyLevel(playerLevel)) return false;
    this.level++;
    this.lowPopulationArmed = false;
    return true;
  }
}

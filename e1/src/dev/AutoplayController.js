// @ts-check

import { PHASE, THEME, WORLD_HEIGHT, WORLD_WIDTH } from '../config.js';
import { clamp, distanceSq, normalize } from '../domain/math.js';
import { ENEMY_AI_TYPE } from '../game/EnemyAiProfiles.js';
import { botAiProfileForStage, getBotAiProfile } from './BotAiProfiles.js';
import { BOT_INTENT, TacticalNavigator } from './TacticalNavigator.js';

const RARITY_SCORE = Object.freeze({ LEGENDARY: 90, EVOLUTION: 75, RARE: 35, MASTERY: 5 });

export class AutoplayController {
  constructor(rng, missRate = .15, profileId = null) {
    this.rng = rng;
    this.missRate = missRate;
    this.aiProfile = profileId ? getBotAiProfile(profileId) : null;
    this.navigator = new TacticalNavigator(rng, this.aiProfile?.navigation);
    this.currentWorld = null;
    this.target = null;
    this.aimTimer = 0;
    this.abilityTimer = 0;
    this.terminalCommit = 0;
    this.aim = { x: 1, y: 0 };
    this.intent = BOT_INTENT.KITE;
    this.aimDecisions = 0;
    this.missDecisions = 0;
  }

  snapshot(world, dt) {
    this.ensureProfile(world.themeId, world.stage ?? 1);
    if (this.currentWorld !== world) this.resetForWorld(world);
    this.aimTimer -= dt;
    this.abilityTimer -= dt;
    this.terminalCommit = Math.max(0, this.terminalCommit - dt);
    if (this.aimTimer <= 0) this.chooseAim(world);
    const move = this.navigator.update(world, dt, this.target);
    const ability = this.chooseAbility(world);
    this.intent = this.resolveIntent(world, ability.intent);
    return {
      moveX: move.x, moveY: move.y, aim: this.aim, attack: true,
      harvestDown: ability.harvestDown,
      harvestPressed: ability.harvestPressed,
      parryDown: ability.parryDown,
      parryPressed: ability.parryPressed,
      dashPressed: this.navigator.shouldDash(world),
      focusDown: false, speedTogglePressed: false
    };
  }

  useProfile(profileId) {
    this.aiProfile = getBotAiProfile(profileId);
    this.navigator.configure(this.aiProfile.navigation);
  }

  ensureProfile(themeId, stage = 1) {
    if (!this.aiProfile || this.aiProfile.themeId !== themeId) this.useProfile(botAiProfileForStage(themeId, stage).id);
  }

  resolveIntent(world, abilityIntent) {
    if (this.navigator.intent === BOT_INTENT.DIVE_EVADE) return BOT_INTENT.DIVE_EVADE;
    if (abilityIntent) return abilityIntent;
    if (this.navigator.intent === BOT_INTENT.CENTERING) return BOT_INTENT.CENTERING;
    if (world.themeId === THEME.CHAIN && this.target) return BOT_INTENT.CLUSTER_AIM;
    return BOT_INTENT.KITE;
  }

  resetForWorld(world) {
    this.currentWorld = world;
    this.target = null;
    this.aimTimer = 0;
    this.abilityTimer = 0;
    this.terminalCommit = 0;
    this.navigator.reset();
  }

  chooseAim(world) {
    this.target = this.selectTarget(world);
    const target = this.target;
    let direction;
    if (target) {
      const distance = Math.sqrt(distanceSq(world.player, target));
      const lead = Math.min(.6, distance / Math.max(1, world.themeState.stats.projectileSpeed));
      const velocity = this.navigator.velocityFor(target);
      direction = normalize(target.x + velocity.x * lead - world.player.x, target.y + velocity.y * lead - world.player.y);
    } else direction = normalize(WORLD_WIDTH / 2 - world.player.x, WORLD_HEIGHT / 2 - world.player.y);
    this.aimDecisions++;
    if (this.rng.next() < this.missRate) {
      this.missDecisions++;
      const angle = this.rng.range(25, 70) * Math.PI / 180 * (this.rng.next() < .5 ? -1 : 1);
      direction = rotate(direction, angle);
    }
    this.aim = direction;
    this.aimTimer = this.rng.range(.2, .45);
  }

  selectTarget(world) {
    if (world.phase === PHASE.BOSS) return world.boss;
    const enemies = world.enemies ?? [];
    if (!enemies.length) return null;
    let best = null;
    let bestScore = -Infinity;
    for (const enemy of enemies) {
      const weights = this.aiProfile.targeting;
      const distance = Math.sqrt(distanceSq(world.player, enemy));
      const xp = enemy.xpValue ?? 1;
      const urgency = (enemy.aiType ?? enemy.movementType) === ENEMY_AI_TYPE.CURVE_RAIDER
        ? clamp(1 - (enemy.movementTime ?? 0) / Math.max(.001, enemy.movementLife ?? 8), 0, 1)
        : 0;
      let score;
      if (world.themeId === THEME.CHAIN) {
        const cluster = enemies.filter(other => other !== enemy && distanceSq(enemy, other) <= 190 ** 2).length;
        score = cluster * weights.cluster + xp * weights.xp + urgency * weights.urgency - distance * weights.distance - enemy.hp / Math.max(1, enemy.maxHp) * weights.wounded;
      } else {
        score = Math.max(0, 4 - (enemy.stacks ?? 0)) * weights.stackGap + xp * weights.xp + urgency * weights.urgency - distance * weights.distance;
      }
      if (enemy === this.target) score += weights.stickiness;
      if (score > bestScore) { best = enemy; bestScore = score; }
    }
    return best;
  }

  chooseAbility(world) {
    const result = { harvestDown: false, harvestPressed: false, parryDown: false, parryPressed: false, intent: null };
    if (world.themeId === THEME.BLOOM) return this.chooseBloomAbility(world, result);
    if (world.themeId === THEME.HIJACK) return this.chooseHijackAbility(world, result);
    return result;
  }

  chooseBloomAbility(world, result) {
    const policy = this.aiProfile.ability;
    const preview = this.harvestPreview(world);
    const hpRatio = (world.player.hp ?? world.player.maxHp ?? 1) / Math.max(1, world.player.maxHp ?? 1);
    if (world.themeState.flags.terminalHarvest) {
      const infected = (world.enemies ?? []).filter(enemy => (enemy.stacks ?? 0) > 0);
      const totalStacks = infected.reduce((sum, enemy) => sum + enemy.stacks, 0);
      if (this.terminalCommit <= 0 && ((infected.length >= policy.terminalEnemies && totalStacks >= policy.terminalStacks) || (hpRatio <= policy.emergencyHp && totalStacks >= policy.harvestStacks))) this.terminalCommit = 1.1;
      result.harvestDown = this.terminalCommit > 0;
      if (result.harvestDown) result.intent = BOT_INTENT.HARVEST;
      return result;
    }
    const shouldHarvest = preview && (preview.lethal || preview.stacks >= policy.harvestStacks || (hpRatio <= policy.emergencyHp && preview.heal > 0 && preview.stacks >= policy.emergencyStacks));
    if (shouldHarvest && this.abilityTimer <= 0) {
      result.harvestPressed = true;
      this.abilityTimer = this.rng.range(.12, .3);
    }
    result.harvestDown = Boolean(shouldHarvest);
    if (shouldHarvest) result.intent = BOT_INTENT.HARVEST;
    return result;
  }

  chooseHijackAbility(world, result) {
    const policy = this.aiProfile.ability;
    const incoming = this.incomingShot(world);
    if (!incoming) return result;
    const window = world.themeState.stats.parryWindow + policy.parryWindowBonus;
    const canParry = incoming.entryTime <= window && incoming.clearance <= policy.parryClearance;
    const guard = incoming.entryTime <= policy.guardTime && incoming.clearance <= policy.guardClearance;
    if (canParry && this.abilityTimer <= 0) {
      result.parryPressed = true;
      this.abilityTimer = this.rng.range(.12, .22);
    }
    result.parryDown = canParry || guard;
    if (result.parryDown) result.intent = BOT_INTENT.PARRY;
    return result;
  }

  incomingShot(world) {
    const playerSpeed = world.themeState.stats.moveSpeed;
    const playerVelocity = { x: this.navigator.move.x * playerSpeed, y: this.navigator.move.y * playerSpeed };
    let best = null;
    for (const shot of (world.hostile ?? []).filter(item => !item.reflected)) {
      const relative = { x: shot.x - world.player.x, y: shot.y - world.player.y };
      const shotSpeed = Number.isFinite(shot.speed) ? shot.speed : 0;
      const velocity = { x: (shot.dx ?? 0) * shotSpeed - playerVelocity.x, y: (shot.dy ?? 0) * shotSpeed - playerVelocity.y };
      const speedSq = velocity.x * velocity.x + velocity.y * velocity.y;
      const time = shotSpeed > 0 && speedSq ? clamp(-(relative.x * velocity.x + relative.y * velocity.y) / speedSq, 0, .9) : 0;
      const closest = { x: relative.x + velocity.x * time, y: relative.y + velocity.y * time };
      const clearance = Math.hypot(closest.x, closest.y) - (world.themeState.stats.parryRadius + (shot.r ?? 10));
      if (clearance > 55) continue;
      const distance = Math.hypot(relative.x, relative.y);
      const entryTime = shotSpeed > 0 ? Math.max(0, (distance - world.themeState.stats.parryRadius - (shot.r ?? 10)) / shotSpeed) : 0;
      if (!best || entryTime < best.entryTime) best = { shot, time, entryTime, clearance };
    }
    return best;
  }

  harvestPreview(world) {
    if (typeof world.harvestPreview === 'function') return world.harvestPreview();
    const target = [...(world.enemies ?? [])].filter(enemy => (enemy.stacks ?? 0) > 0).sort((a, b) => distanceSq(world.player, a) - distanceSq(world.player, b))[0];
    if (!target) return null;
    const damage = target.stacks * world.themeState.stats.harvestDamage;
    return { target, stacks: target.stacks, damage, heal: damage * world.themeState.stats.harvestHeal * .1, lethal: damage >= target.hp };
  }

  chooseUpgrade(choices, world) {
    if (!choices.length) throw new Error('Autoplay upgrade choice requires at least one option');
    this.ensureProfile(world.themeId, world.stage ?? 1);
    const priorities = [...this.aiProfile.upgradePaths];
    const hpRatio = world.player.hp / Math.max(1, world.player.maxHp);
    if (world.themeId === THEME.BLOOM && hpRatio < .65) priorities.splice(0, priorities.length, 'LEECH', 'CONTAGION', 'OVERDOSE');
    const scored = choices.map(choice => ({ choice, score: this.upgradeScore(choice, priorities) })).sort((a, b) => b.score - a.score);
    if (this.rng.next() >= this.aiProfile.alternativeChance || scored.length === 1) return scored[0].choice;
    const alternative = scored.filter(item => item.choice.path !== scored[0].choice.path)[0];
    return (alternative ?? scored[1]).choice;
  }

  upgradeScore(choice, priorities) {
    const pathIndex = priorities.indexOf(choice.path);
    const pathScore = pathIndex < 0 ? 0 : (priorities.length - pathIndex) * 100;
    const rarity = RARITY_SCORE[choice.rarity] ?? 0;
    const synergy = choice.quality?.includes('Synergy Value') ? 35 : 0;
    const ceiling = choice.quality?.includes('Ceiling Unlock') ? 25 : 0;
    return pathScore + rarity + synergy + ceiling + (choice.repeatable ? 0 : 20);
  }

  identity() { return { id: this.aiProfile.id, name: this.aiProfile.name, temperament: this.aiProfile.temperament }; }
  status() { return this.intent; }
  missRatio() { return this.aimDecisions ? this.missDecisions / this.aimDecisions : 0; }
  metrics() { return { edgeRatio: this.navigator.edgeRatio(), intent: this.intent }; }
}

function rotate(direction, angle) {
  return {
    x: direction.x * Math.cos(angle) - direction.y * Math.sin(angle),
    y: direction.x * Math.sin(angle) + direction.y * Math.cos(angle)
  };
}

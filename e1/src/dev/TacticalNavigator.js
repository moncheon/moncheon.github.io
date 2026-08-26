// @ts-check

import { WORLD_HEIGHT, WORLD_WIDTH } from '../config.js';
import { clamp, normalize } from '../domain/math.js';
import { ENEMY_AI_TYPE, getEnemyAiProfile } from '../game/EnemyAiProfiles.js';

export const BOT_INTENT = Object.freeze({
  CENTERING: 'CENTERING',
  KITE: 'KITE',
  CLUSTER_AIM: 'CLUSTER AIM',
  HARVEST: 'HARVEST',
  PARRY: 'PARRY',
  DIVE_EVADE: 'DIVE EVADE'
});

const DIRECTIONS = Object.freeze([
  { x: 0, y: 0 },
  ...Array.from({ length: 16 }, (_, index) => {
    const angle = index / 16 * Math.PI * 2;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  })
]);
const HORIZONS = Object.freeze([.25, .55, .9]);
const DEFAULT_CONFIG = Object.freeze({ desiredRange: 330, reactionMin: .2, reactionMax: .35, edgeMargin: 110 });

export class TacticalNavigator {
  constructor(rng, config = {}) {
    this.rng = rng;
    this.configure(config);
    this.move = { x: 0, y: 0 };
    this.decisionTimer = 0;
    /** @type {string} */
    this.intent = BOT_INTENT.KITE;
    this.observations = new WeakMap();
    this.edgeTime = 0;
    this.totalTime = 0;
  }

  configure(config = {}) { this.config = { ...DEFAULT_CONFIG, ...config }; }

  reset() {
    this.move = { x: 0, y: 0 };
    this.decisionTimer = 0;
    this.intent = BOT_INTENT.KITE;
    this.observations = new WeakMap();
  }

  update(world, dt, preferredTarget = null) {
    this.observe(world, dt);
    this.totalTime += dt;
    if (this.isNearEdge(world.player, this.config.edgeMargin)) this.edgeTime += dt;
    this.decisionTimer -= dt;
    const forcedCentering = this.isNearEdge(world.player, this.config.edgeMargin);
    if (forcedCentering || this.decisionTimer <= 0) {
      const selected = this.selectDirection(world, preferredTarget, forcedCentering);
      this.move = forcedCentering
        ? selected
        : normalize(this.move.x * .28 + selected.x * .72, this.move.y * .28 + selected.y * .72, selected);
      this.decisionTimer = this.rng.range(this.config.reactionMin, this.config.reactionMax);
    }
    if (forcedCentering) this.intent = BOT_INTENT.CENTERING;
    else if (this.isDiveDanger(world, this.project(world, this.move, .55))) this.intent = BOT_INTENT.DIVE_EVADE;
    else this.intent = BOT_INTENT.KITE;
    return this.move;
  }

  shouldDash(world) {
    if ((world.player.dash ?? 0) > 0) return false;
    if (this.isDiveDanger(world, this.project(world, this.move, .45))) return true;
    const playerRadius = world.player.hitR ?? world.player.r ?? 16;
    for (const horizon of [.18, .32, .45]) {
      const future = this.project(world, this.move, horizon);
      for (const enemy of world.enemies ?? []) {
        const predicted = this.predict(enemy, horizon);
        if (Math.hypot(future.x - predicted.x, future.y - predicted.y) < playerRadius + (enemy.r ?? 13) + 34) return true;
      }
      for (const shot of (world.hostile ?? []).filter(item => !item.reflected)) {
        const predicted = { x: shot.x + shot.dx * shot.speed * horizon, y: shot.y + shot.dy * shot.speed * horizon };
        if (Math.hypot(future.x - predicted.x, future.y - predicted.y) < playerRadius + (shot.r ?? 10) + 22) return true;
      }
    }
    return false;
  }

  velocityFor(entity) { return this.observations.get(entity)?.velocity ?? { x: entity.vx ?? 0, y: entity.vy ?? 0 }; }
  edgeRatio() { return this.totalTime > 0 ? this.edgeTime / this.totalTime : 0; }

  observe(world, dt) {
    for (const entity of [...(world.enemies ?? []), ...(world.boss ? [world.boss] : [])]) {
      const previous = this.observations.get(entity);
      const raw = previous && dt > 0 ? { x: (entity.x - previous.x) / dt, y: (entity.y - previous.y) / dt } : { x: entity.vx ?? 0, y: entity.vy ?? 0 };
      const velocity = previous
        ? { x: previous.velocity.x * .45 + raw.x * .55, y: previous.velocity.y * .45 + raw.y * .55 }
        : raw;
      this.observations.set(entity, { x: entity.x, y: entity.y, velocity });
    }
  }

  selectDirection(world, target, forcedCentering) {
    let best = DIRECTIONS[0];
    let bestScore = Number.POSITIVE_INFINITY;
    for (const direction of DIRECTIONS) {
      const score = this.scoreDirection(world, direction, target, forcedCentering);
      if (score < bestScore) { best = direction; bestScore = score; }
    }
    return best;
  }

  scoreDirection(world, direction, target, forcedCentering) {
    const player = world.player;
    const playerRadius = player.hitR ?? player.r ?? 16;
    let score = 0;
    if (player.x < 110 && direction.x <= 0) score += 1_000_000;
    if (player.x > WORLD_WIDTH - 110 && direction.x >= 0) score += 1_000_000;
    if (player.y < 120 && direction.y <= 0) score += 1_000_000;
    if (player.y > WORLD_HEIGHT - 110 && direction.y >= 0) score += 1_000_000;

    for (const horizon of HORIZONS) {
      const future = this.project(world, direction, horizon);
      const edge = Math.min(future.x - 25, WORLD_WIDTH - 25 - future.x, future.y - 55, WORLD_HEIGHT - 25 - future.y);
      if (edge < 0) score += 1_000_000 + Math.abs(edge) * 10_000;
      else if (edge < 155) score += (155 - edge) ** 2 * .38;

      for (const enemy of world.enemies ?? []) {
        const predicted = this.predict(enemy, horizon);
        const clearance = Math.hypot(future.x - predicted.x, future.y - predicted.y) - playerRadius - (enemy.r ?? 13);
        const weight = getEnemyAiProfile(enemy.aiType ?? enemy.movementType ?? ENEMY_AI_TYPE.PURSUER).threatWeight;
        if (clearance < 215) score += (215 - clearance) ** 2 * .16 * weight;
        if (clearance < 35) score += (35 - clearance) ** 2 * 20;
      }

      for (const shot of (world.hostile ?? []).filter(item => !item.reflected)) {
        const predicted = { x: shot.x + shot.dx * shot.speed * horizon, y: shot.y + shot.dy * shot.speed * horizon };
        const clearance = Math.hypot(future.x - predicted.x, future.y - predicted.y) - playerRadius - (shot.r ?? 10);
        if (clearance < 125) score += (125 - clearance) ** 2 * .9;
        if (clearance < 18) score += (18 - clearance) ** 2 * 35;
      }

      if (world.boss) {
        const predicted = this.predict(world.boss, horizon);
        const clearance = Math.hypot(future.x - predicted.x, future.y - predicted.y) - playerRadius - (world.boss.r ?? 64);
        if (clearance < 190) score += (190 - clearance) ** 2 * .22;
      }
      if (this.isDiveDanger(world, future)) score += 180_000;
    }

    const anchor = world.phase === 'boss' ? { x: WORLD_WIDTH / 2, y: 535 } : { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
    const final = this.project(world, direction, .7);
    score += Math.hypot(final.x - anchor.x, final.y - anchor.y) * (forcedCentering ? 2.2 : .055);
    if (target) {
      const desiredRange = this.config.desiredRange;
      score += Math.abs(Math.hypot(final.x - target.x, final.y - target.y) - desiredRange) * .32;
    }
    score -= (direction.x * this.move.x + direction.y * this.move.y) * 42;
    return score;
  }

  project(world, direction, horizon) {
    const speed = world.themeState.stats.moveSpeed;
    return { x: world.player.x + direction.x * speed * horizon, y: world.player.y + direction.y * speed * horizon };
  }

  predict(entity, horizon) {
    const velocity = this.velocityFor(entity);
    return { x: entity.x + velocity.x * horizon, y: entity.y + velocity.y * horizon };
  }

  isNearEdge(player, margin) {
    return player.x < margin || player.x > WORLD_WIDTH - margin || player.y < margin + 10 || player.y > WORLD_HEIGHT - margin;
  }

  isDiveDanger(world, point) {
    const boss = world.boss;
    if (!boss || !['telegraph', 'dive'].includes(boss.motionState)) return false;
    if (Math.hypot(point.x - boss.diveTargetX, point.y - boss.diveTargetY) < 145) return true;
    return pointSegmentDistance(point, { x: boss.x, y: boss.y }, { x: boss.diveTargetX, y: boss.diveTargetY }) < 105;
  }
}

function pointSegmentDistance(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;
  const ratio = lengthSq ? clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq, 0, 1) : 0;
  return Math.hypot(point.x - (start.x + dx * ratio), point.y - (start.y + dy * ratio));
}

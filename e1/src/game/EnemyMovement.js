// @ts-check

import { WORLD_HEIGHT, WORLD_WIDTH } from '../config.js';
import { clamp, normalize } from '../domain/math.js';
import {
  ENEMY_AI_TYPE,
  enemyAiMixForLevel,
  getEnemyAiProfile,
  selectEnemyAiType
} from './EnemyAiProfiles.js';

// Compatibility alias: gameplay code can migrate from "movement" to "AI type" incrementally.
export const ENEMY_MOVEMENT = Object.freeze({
  BASIC: ENEMY_AI_TYPE.PURSUER,
  INTERCEPTOR: ENEMY_AI_TYPE.INTERCEPTOR,
  CURVE: ENEMY_AI_TYPE.CURVE_RAIDER
});

const INITIALIZERS = Object.freeze({
  pursuit: createPursuit,
  intercept: createInterceptor,
  curve: createCurve
});

const UPDATERS = Object.freeze({
  pursuit: updatePursuit,
  intercept: updateInterceptor,
  curve: updateCurve
});

export function movementMixForLevel(level) { return enemyAiMixForLevel(level); }
export function selectEnemyMovement(level, roll) { return selectEnemyAiType(level, roll); }
export function movementXp(type) { return getEnemyAiProfile(type).xp; }

export function createEnemyMovement(type, position, side, player, rng) {
  const profile = getEnemyAiProfile(type);
  const initializer = INITIALIZERS[profile.behavior.kind];
  if (!initializer) throw new Error(`Enemy AI initializer is not registered: ${profile.behavior.kind}`);
  return {
    aiType: profile.id,
    aiName: profile.name,
    aiTemperament: profile.temperament,
    movementType: profile.id,
    movementTime: 0,
    trail: [],
    trailTimer: 0,
    ...initializer(profile, position, side, player, rng)
  };
}

export function updateEnemyMovement(enemy, player, dt) {
  const type = enemy.aiType ?? enemy.movementType ?? ENEMY_AI_TYPE.PURSUER;
  const profile = getEnemyAiProfile(type);
  enemy.aiType = profile.id;
  enemy.aiName ??= profile.name;
  enemy.aiTemperament ??= profile.temperament;
  enemy.movementType = profile.id;
  enemy.movementTime = (enemy.movementTime ?? 0) + dt;
  const updater = UPDATERS[profile.behavior.kind];
  if (!updater) throw new Error(`Enemy AI updater is not registered: ${profile.behavior.kind}`);
  return updater(enemy, player, dt, profile);
}

function createPursuit() { return {}; }

function createInterceptor(profile, position, side, player) {
  return { retargetIn: 0, targetX: player.x, targetY: player.y };
}

function createCurve(profile, position, side, player, rng) {
  const behavior = profile.behavior;
  const exit = curveExit(side, rng);
  return {
    movementLife: rng.range(...behavior.life),
    entryX: position.x,
    entryY: position.y,
    exitX: exit.x,
    exitY: exit.y,
    amplitudeX: rng.range(...behavior.amplitudeX),
    amplitudeY: rng.range(...behavior.amplitudeY),
    frequencyX: rng.range(...behavior.frequencyX),
    frequencyY: rng.range(...behavior.frequencyY),
    phaseX: rng.range(0, Math.PI * 2),
    phaseY: rng.range(0, Math.PI * 2)
  };
}

function updatePursuit(enemy, player, dt) {
  const direction = normalize(player.x - enemy.x, player.y - enemy.y);
  enemy.lastMoveX = direction.x;
  enemy.lastMoveY = direction.y;
  enemy.x += direction.x * enemy.speed * dt;
  enemy.y += direction.y * enemy.speed * dt;
  return false;
}

function updateInterceptor(enemy, player, dt, profile) {
  const behavior = profile.behavior;
  enemy.retargetIn = (enemy.retargetIn ?? 0) - dt;
  const targetDistance = Math.hypot((enemy.targetX ?? player.x) - enemy.x, (enemy.targetY ?? player.y) - enemy.y);
  if (enemy.retargetIn <= 0 || targetDistance <= 8) {
    enemy.targetX = clamp(player.x + (player.vx ?? 0) * behavior.leadSeconds, 25, WORLD_WIDTH - 25);
    enemy.targetY = clamp(player.y + (player.vy ?? 0) * behavior.leadSeconds, 55, WORLD_HEIGHT - 25);
    enemy.retargetIn = behavior.retargetSeconds;
  }
  moveToward(enemy, enemy.targetX, enemy.targetY, enemy.speed * dt);
  return false;
}

function updateCurve(enemy, player, dt) {
  const life = Math.max(.001, enemy.movementLife ?? 8);
  const progress = clamp(enemy.movementTime / life, 0, 1);
  const envelope = Math.sin(progress * Math.PI);
  const baseX = enemy.entryX + (enemy.exitX - enemy.entryX) * progress;
  const baseY = enemy.entryY + (enemy.exitY - enemy.entryY) * progress;
  enemy.x = baseX + Math.sin(enemy.movementTime * enemy.frequencyX + enemy.phaseX) * enemy.amplitudeX * envelope;
  enemy.y = baseY + Math.cos(enemy.movementTime * enemy.frequencyY + enemy.phaseY) * enemy.amplitudeY * envelope;
  enemy.trailTimer = (enemy.trailTimer ?? 0) - dt;
  if (enemy.trailTimer <= 0) {
    enemy.trail.push({ x: enemy.x, y: enemy.y });
    if (enemy.trail.length > 10) enemy.trail.shift();
    enemy.trailTimer = .08;
  }
  return enemy.movementTime >= life;
}

function moveToward(enemy, x, y, maxStep) {
  const direction = normalize(x - enemy.x, y - enemy.y);
  enemy.lastMoveX = direction.x;
  enemy.lastMoveY = direction.y;
  const step = Math.min(maxStep, Math.hypot(x - enemy.x, y - enemy.y));
  enemy.x += direction.x * step;
  enemy.y += direction.y * step;
}

function curveExit(side, rng) {
  if (side === 0) return { x: WORLD_WIDTH + 60, y: rng.range(80, WORLD_HEIGHT - 40) };
  if (side === 1) return { x: -60, y: rng.range(80, WORLD_HEIGHT - 40) };
  if (side === 2) return { x: rng.range(40, WORLD_WIDTH - 40), y: WORLD_HEIGHT + 60 };
  return { x: rng.range(40, WORLD_WIDTH - 40), y: -60 };
}

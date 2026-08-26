// @ts-check

import { WORLD_HEIGHT, WORLD_WIDTH } from '../config.js';
import { clamp } from '../domain/math.js';

export const BOSS_MOTION = Object.freeze({
  ORBIT: 'orbit',
  TELEGRAPH: 'telegraph',
  DIVE: 'dive',
  RETURN: 'return'
});

export function createBossMotion(rng) {
  const initial = orbitPosition(0);
  return {
    x: initial.x,
    y: initial.y,
    motionState: BOSS_MOTION.ORBIT,
    motionTimer: 0,
    diveIn: rng.range(7, 11),
    diveTargetX: WORLD_WIDTH / 2,
    diveTargetY: WORLD_HEIGHT / 2,
    motionStartX: initial.x,
    motionStartY: initial.y
  };
}

export function updateBossMotion(boss, player, dt, rng) {
  const previousX = boss.x;
  const previousY = boss.y;
  boss.phase += dt;

  if (boss.motionState === BOSS_MOTION.ORBIT) {
    setOrbitPosition(boss);
    boss.diveIn -= dt;
    if (boss.diveIn <= 0) beginTelegraph(boss, player);
  } else if (boss.motionState === BOSS_MOTION.TELEGRAPH) {
    boss.motionTimer -= dt;
    if (boss.motionTimer <= 0) {
      boss.motionState = BOSS_MOTION.DIVE;
      boss.motionTimer = .55;
      boss.motionStartX = boss.x;
      boss.motionStartY = boss.y;
    }
  } else if (boss.motionState === BOSS_MOTION.DIVE) {
    boss.motionTimer -= dt;
    const ratio = clamp(1 - boss.motionTimer / .55, 0, 1);
    const eased = 1 - (1 - ratio) ** 3;
    boss.x = boss.motionStartX + (boss.diveTargetX - boss.motionStartX) * eased;
    boss.y = boss.motionStartY + (boss.diveTargetY - boss.motionStartY) * eased;
    if (boss.motionTimer <= 0) {
      boss.motionState = BOSS_MOTION.RETURN;
      boss.motionTimer = .75;
      boss.motionStartX = boss.x;
      boss.motionStartY = boss.y;
    }
  } else {
    boss.motionTimer -= dt;
    const orbit = orbitPosition(boss.phase);
    const ratio = clamp(1 - boss.motionTimer / .75, 0, 1);
    const eased = ratio * ratio * (3 - 2 * ratio);
    boss.x = boss.motionStartX + (orbit.x - boss.motionStartX) * eased;
    boss.y = boss.motionStartY + (orbit.y - boss.motionStartY) * eased;
    if (boss.motionTimer <= 0) {
      boss.motionState = BOSS_MOTION.ORBIT;
      boss.diveIn = rng.range(7, 11);
      setOrbitPosition(boss);
    }
  }

  boss.vx = (boss.x - previousX) / Math.max(.0001, dt);
  boss.vy = (boss.y - previousY) / Math.max(.0001, dt);
  return boss.motionState !== BOSS_MOTION.TELEGRAPH && boss.motionState !== BOSS_MOTION.DIVE;
}

function beginTelegraph(boss, player) {
  boss.motionState = BOSS_MOTION.TELEGRAPH;
  boss.motionTimer = .8;
  boss.diveTargetX = clamp(player.x, 90, WORLD_WIDTH - 90);
  boss.diveTargetY = clamp(player.y, 280, WORLD_HEIGHT - 180);
}

function setOrbitPosition(boss) {
  const position = orbitPosition(boss.phase);
  boss.x = position.x;
  boss.y = position.y;
}

function orbitPosition(phase) {
  return {
    x: WORLD_WIDTH / 2 + Math.sin(phase * .55) * 285,
    y: 180 + Math.sin(phase * .83 + Math.PI / 3) * 70
  };
}

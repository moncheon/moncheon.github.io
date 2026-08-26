// @ts-check

export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 720;
export const FIELD_SECONDS = 360;
export const BOSS_SECONDS = 120;
export const FIXED_STEP = 1 / 60;
export const MAX_STEPS_PER_FRAME = 120;
export const STORAGE_PREFIX = 'game-evolution-unified';

export const THEME = Object.freeze({ CHAIN: 'chain', BLOOM: 'bloom', HIJACK: 'hijack' });
export const PHASE = Object.freeze({ FIELD: 'field', BOSS: 'boss' });
export const SCENE = Object.freeze({ TITLE: 'title', PLAYING: 'playing', DRAFT: 'draft', PAUSED: 'paused', TRANSITION: 'transition', ENDED: 'ended' });

export function fieldThemeForStage(stage) {
  return Math.max(1, Math.floor(stage)) % 2 === 1 ? THEME.CHAIN : THEME.BLOOM;
}

export function parseRuntimeOptions(search = '') {
  const params = new URLSearchParams(search);
  const positive = (name, fallback, min, max) => {
    const value = Number(params.get(name));
    return Number.isFinite(value) && value > 0 ? Math.max(min, Math.min(max, value)) : fallback;
  };
  return {
    seed: Math.floor(positive('seed', Math.random() * 1_000_000_000, 1, 0xffffffff)),
    speed: positive('speed', 1, .25, 20),
    fieldSeconds: positive('fieldTime', FIELD_SECONDS, 1, FIELD_SECONDS),
    bossSeconds: positive('bossTime', BOSS_SECONDS, 2, BOSS_SECONDS),
    bossHealthScale: positive('bossScale', 1, .01, 1),
    god: params.get('god') === '1'
  };
}

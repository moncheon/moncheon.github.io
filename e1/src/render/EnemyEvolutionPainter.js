// @ts-check

import { ENEMY_AI_TYPE } from '../game/EnemyAiProfiles.js';

export function drawEvolvingEnemy(ctx, enemy, profile, image, accent = '#fff2b4') {
  const tier = Math.max(1, Math.floor(enemy.visualTier ?? enemy.monsterLevel ?? 1));
  if (tier >= 3 && image) {
    ctx.save();
    ctx.filter = enemy.flash > 0 ? 'brightness(2)' : 'drop-shadow(0 2px 2px rgba(43,48,34,.75))';
    ctx.drawImage(image, enemy.x - enemy.r * 1.7, enemy.y - enemy.r * 1.9, enemy.r * 3.4, enemy.r * 3.4);
    ctx.restore();
    drawLevelNodes(ctx, enemy, accent);
    return;
  }

  const type = enemy.aiType ?? enemy.movementType ?? ENEMY_AI_TYPE.PURSUER;
  const angle = Math.atan2(enemy.lastMoveY ?? 0, enemy.lastMoveX ?? 1);
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  if (type === ENEMY_AI_TYPE.INTERCEPTOR) ctx.rotate(angle);
  else if (type === ENEMY_AI_TYPE.CURVE_RAIDER) ctx.rotate((enemy.movementTime ?? 0) * 2.4);
  ctx.fillStyle = enemy.flash > 0 ? '#fff' : enemy.elite ? '#ff5376' : profile.color;
  drawCore(ctx, type, enemy.r);
  if (tier >= 2) drawTierTwoStructure(ctx, enemy.r, accent);
  ctx.restore();
}

function drawCore(ctx, type, radius) {
  ctx.beginPath();
  if (type === ENEMY_AI_TYPE.INTERCEPTOR) {
    ctx.moveTo(radius * 1.25, 0); ctx.lineTo(-radius, radius * .8);
    ctx.lineTo(-radius * .45, 0); ctx.lineTo(-radius, -radius * .8); ctx.closePath();
  } else if (type === ENEMY_AI_TYPE.CURVE_RAIDER) {
    ctx.moveTo(0, -radius * 1.25); ctx.lineTo(radius, 0);
    ctx.lineTo(0, radius * 1.25); ctx.lineTo(-radius, 0); ctx.closePath();
  } else ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawTierTwoStructure(ctx, radius, accent) {
  ctx.save();
  ctx.strokeStyle = accent; ctx.fillStyle = '#fff2b4'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(0, 0, radius + 5, -.55, Math.PI + .55); ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * radius * .58, -radius * .72);
    ctx.lineTo(side * radius * .9, -radius * 1.28);
    ctx.lineTo(side * radius * .25, -radius * .96);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawLevelNodes(ctx, enemy, accent) {
  const count = Math.min(3, Math.max(0, Math.floor(enemy.monsterLevel ?? 3) - 3));
  if (!count) return;
  ctx.save(); ctx.fillStyle = accent; ctx.strokeStyle = '#294d43'; ctx.lineWidth = 1.5;
  for (let index = 0; index < count; index++) {
    const angle = -Math.PI / 2 + (index - (count - 1) / 2) * .62;
    const radius = enemy.r + 12;
    const x = enemy.x + Math.cos(angle) * radius;
    const y = enemy.y + Math.sin(angle) * radius;
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

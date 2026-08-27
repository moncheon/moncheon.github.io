// @ts-check

import { PHASE, THEME, WORLD_HEIGHT, WORLD_WIDTH } from '../config.js';
import { clamp } from '../domain/math.js';
import { BOSS_MOTION } from '../game/BossMotion.js';
import { ENEMY_AI_TYPE, getEnemyAiProfile } from '../game/EnemyAiProfiles.js';
import { ENEMY_MOVEMENT } from '../game/EnemyMovement.js';
import { stageVisualFor } from '../game/StageVisualRegistry.js';
import { drawStageMotifBadge } from './StageMotifPainter.js';
import { drawEvolvingEnemy } from './EnemyEvolutionPainter.js';

const BACKGROUND_IMAGE_FILTER = 'saturate(.48) brightness(.84) contrast(.88)';

export class CanvasRenderer {
  constructor(canvas, assets) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.assets = assets; }

  render(world, pointer = null) {
    if (!world) { this.renderEmpty(); return; }
    this.renderBackground(world);
    this.renderGardens(world.gardens ?? []);
    this.renderEnemies(world);
    if (world.boss) this.renderBoss(world);
    this.renderProjectiles(world);
    this.renderArcs(world.arcs);
    this.renderPlayer(world.player, world.themeId);
    this.renderParryFeedback(world);
    this.renderEffects(world.effects);
    this.renderFloatingTexts(world.floatingTexts);
    if (pointer) this.renderReticle(pointer, world.themeColor());
  }

  renderEmpty() {
    const title = this.assets.getImage('title.vietnam');
    if (title) {
      this.ctx.drawImage(title, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      this.ctx.fillStyle = 'rgba(32,44,34,.12)'; this.ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      return;
    }
    const gradient = this.ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
    gradient.addColorStop(0, '#e9c891'); gradient.addColorStop(.55, '#6f9a7d'); gradient.addColorStop(1, '#315f61');
    this.ctx.fillStyle = gradient; this.ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.ctx.fillStyle = 'rgba(255,255,255,.04)';
    for (let x = 40; x < WORLD_WIDTH; x += 80) for (let y = 40; y < WORLD_HEIGHT; y += 80) this.ctx.fillRect(x, y, 2, 2);
  }

  renderBackground(world) {
    const visual = stageVisualFor(world.stage);
    const image = this.assets.getImage(visual.mapAssetId);
    if (image) {
      this.ctx.save();
      this.ctx.filter = BACKGROUND_IMAGE_FILTER;
      this.ctx.drawImage(image, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      this.ctx.restore();
      this.ctx.fillStyle = 'rgba(239,235,213,.18)';
      this.ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    }
    const palette = visual.palette;
    const gradient = this.ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
    gradient.addColorStop(0, image ? `${palette[0]}33` : palette[0]); gradient.addColorStop(.6, image ? `${palette[1]}26` : palette[1]); gradient.addColorStop(1, image ? `${palette[2]}3d` : palette[2]);
    this.ctx.fillStyle = gradient; this.ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    if (visual.tint !== 'transparent') { this.ctx.fillStyle = visual.tint; this.ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT); }
    if (visual.weather.includes('젖은') || visual.ko.includes('몬순')) this.renderRain(world.stage);
    if (world.phase === PHASE.BOSS) {
      this.ctx.fillStyle = 'rgba(255,210,75,.06)'; this.ctx.beginPath(); this.ctx.arc(WORLD_WIDTH / 2, 145, 260, 0, Math.PI * 2); this.ctx.fill();
    }
  }

  renderPlayer(player, themeId) {
    const image = this.assets.getImage(`player.${themeId}`);
    this.ctx.save(); this.ctx.globalAlpha = player.opacity ?? 1;
    const color = themeId === THEME.BLOOM ? '#d998ff' : themeId === THEME.HIJACK ? '#ffe47b' : '#9ffaff';
    this.ctx.strokeStyle = '#fff8df'; this.ctx.lineWidth = 3; this.ctx.fillStyle = 'rgba(39,73,62,.28)';
    this.ctx.beginPath(); this.ctx.ellipse(player.x, player.y + 17, 25, 10, 0, 0, Math.PI * 2); this.ctx.fill(); this.ctx.stroke();
    if (image) {
      this.ctx.filter = `drop-shadow(0 2px 2px #183f3a) drop-shadow(0 0 3px #fff8df) drop-shadow(0 0 8px ${color})`;
      this.ctx.drawImage(image, player.x - 32, player.y - 38, 64, 64);
      this.ctx.filter = 'none';
    }
    if (!image) {
      this.ctx.translate(player.x, player.y);
      this.ctx.fillStyle = color; this.ctx.shadowColor = color; this.ctx.shadowBlur = 22;
      this.ctx.beginPath(); this.ctx.arc(0, 0, player.r, 0, Math.PI * 2); this.ctx.fill();
      if (player.shield > 0) { this.ctx.strokeStyle = '#ffffff'; this.ctx.lineWidth = 4; this.ctx.beginPath(); this.ctx.arc(0, 0, player.r + 9, 0, Math.PI * 2); this.ctx.stroke(); }
      this.ctx.translate(-player.x, -player.y);
    }
    this.ctx.restore();
    if (player.focusVisible) {
      this.ctx.save(); this.ctx.fillStyle = '#fff'; this.ctx.shadowColor = color; this.ctx.shadowBlur = 18;
      this.ctx.beginPath(); this.ctx.arc(player.x, player.y, player.hitR, 0, Math.PI * 2); this.ctx.fill(); this.ctx.restore();
    }
  }

  renderParryFeedback(world) {
    if (world.phase !== PHASE.BOSS || (world.parryWindow <= 0 && !world.parryGuarding)) return;
    const active = world.parryWindow > 0;
    const ratio = active ? clamp(world.parryWindow / Math.max(.01, world.themeState.stats.parryWindow), 0, 1) : .35;
    const radius = world.themeState.stats.parryRadius + (active ? (1 - ratio) * 10 : 0);
    this.ctx.save();
    this.ctx.strokeStyle = active ? '#fff0a8' : 'rgba(255,228,123,.5)';
    this.ctx.lineWidth = active ? 5 : 3;
    this.ctx.globalAlpha = .45 + ratio * .5;
    this.ctx.setLineDash(active ? [] : [8, 7]);
    this.ctx.shadowColor = '#ffd84d'; this.ctx.shadowBlur = active ? 22 : 8;
    this.ctx.beginPath(); this.ctx.arc(world.player.x, world.player.y, radius, 0, Math.PI * 2); this.ctx.stroke();
    if (active && world.parryAssistShot) {
      this.ctx.setLineDash([5, 6]); this.ctx.lineWidth = 2; this.ctx.globalAlpha = .72;
      this.ctx.beginPath(); this.ctx.moveTo(world.player.x, world.player.y); this.ctx.lineTo(world.parryAssistShot.x, world.parryAssistShot.y); this.ctx.stroke();
      this.ctx.setLineDash([]); this.ctx.beginPath(); this.ctx.arc(world.parryAssistShot.x, world.parryAssistShot.y, world.parryAssistShot.r + 8, 0, Math.PI * 2); this.ctx.stroke();
    }
    this.ctx.restore();
  }

  renderEnemies(world) {
    const visual = stageVisualFor(world.stage);
    const harvest = world.harvestPreview();
    if (harvest) {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(220,167,255,.34)'; this.ctx.lineWidth = 2; this.ctx.setLineDash([7, 8]);
      this.ctx.beginPath(); this.ctx.moveTo(world.player.x, world.player.y); this.ctx.lineTo(harvest.target.x, harvest.target.y); this.ctx.stroke();
      this.ctx.restore();
    }
    for (const enemy of world.enemies) {
      const aiProfile = getEnemyAiProfile(enemy.aiType ?? enemy.movementType ?? ENEMY_AI_TYPE.PURSUER);
      if (enemy.movementType === ENEMY_MOVEMENT.CURVE && enemy.trail?.length > 1) this.renderCurveTrail(enemy);
      const image = this.assets.getImage(visual.enemyAssetIds[enemy.aiType ?? enemy.movementType] ?? visual.enemyAssetIds[ENEMY_AI_TYPE.PURSUER])
        ?? this.assets.getImage(enemy.elite ? `enemy.${world.themeId}.elite` : `enemy.${world.themeId}.normal`);
      drawEvolvingEnemy(this.ctx, enemy, aiProfile, image, visual.palette[2]);
      if (enemy.elite) this.renderEliteStructure(enemy, visual.palette[2]);
      drawStageMotifBadge(this.ctx, visual, enemy.x + enemy.r * .72, enemy.y - enemy.r * .72, Math.max(7, enemy.r * .48));
      this.renderMovementMarker(enemy);
      if (enemy.stacks > 0) this.renderBloomStacks(enemy, harvest?.target === enemy ? harvest : null);
      if (enemy.runner && enemy.runnerTime > 0) {
        this.ctx.strokeStyle = '#ffb347'; this.ctx.lineWidth = 3; this.ctx.globalAlpha = .8;
        this.ctx.beginPath(); this.ctx.arc(enemy.x, enemy.y, enemy.r + 7, 0, Math.PI * 2); this.ctx.stroke(); this.ctx.globalAlpha = 1;
      }
      this.healthBar(enemy.x, enemy.y - enemy.r - 4, enemy.r * 2, enemy.hp / enemy.maxHp, enemy.elite ? '#ff5376' : '#ffad7a');
    }
  }

  renderBoss(world) {
    const boss = world.boss;
    if (!boss) return;
    if (boss.motionState === BOSS_MOTION.TELEGRAPH) {
      const ratio = clamp(boss.motionTimer / .8, 0, 1);
      this.ctx.save(); this.ctx.strokeStyle = `rgba(255,90,105,${.45 + (1 - ratio) * .5})`; this.ctx.lineWidth = 5; this.ctx.setLineDash([18, 10]);
      this.ctx.beginPath(); this.ctx.moveTo(boss.x, boss.y); this.ctx.lineTo(boss.diveTargetX, boss.diveTargetY); this.ctx.stroke();
      this.ctx.setLineDash([]); this.ctx.lineWidth = 3; this.ctx.beginPath(); this.ctx.arc(boss.diveTargetX, boss.diveTargetY, 28 + ratio * 18, 0, Math.PI * 2); this.ctx.stroke(); this.ctx.restore();
    }
    const image = this.assets.getImage(stageVisualFor(world.stage).bossAssetId) ?? this.assets.getImage('boss.hijack');
    if (image) this.ctx.drawImage(image, boss.x - 82, boss.y - 82, 164, 164);
    else {
      this.ctx.save(); this.ctx.translate(boss.x, boss.y); this.ctx.rotate(Math.sin(boss.phase) * .08);
      this.ctx.fillStyle = boss.flash > 0 ? '#fff' : '#e84758'; this.ctx.shadowColor = '#ffd84d'; this.ctx.shadowBlur = 30;
      this.ctx.fillRect(-boss.r, -boss.r, boss.r * 2, boss.r * 2); this.ctx.restore();
    }
    drawStageMotifBadge(this.ctx, stageVisualFor(world.stage), boss.x + boss.r * .66, boss.y - boss.r * .66, 15);
    this.healthBar(boss.x, boss.y - boss.r - 24, 220, boss.hp / boss.maxHp, '#ff4f63');
    if (boss.shield > 0) this.healthBar(boss.x, boss.y - boss.r - 14, 220, boss.shield / boss.maxShield, '#ffd84d');
  }

  renderGardens(gardens) {
    for (const garden of gardens) {
      const ratio = clamp(garden.life / garden.maxLife, 0, 1);
      this.ctx.save(); this.ctx.translate(garden.x, garden.y);
      this.ctx.globalAlpha = .18 + ratio * .25;
      this.ctx.fillStyle = '#7bd88f'; this.ctx.strokeStyle = '#e8ffc8'; this.ctx.lineWidth = 2;
      this.ctx.beginPath(); this.ctx.arc(0, 0, garden.r, 0, Math.PI * 2); this.ctx.fill(); this.ctx.stroke();
      this.ctx.globalAlpha = .55;
      for (let index = 0; index < 8; index++) {
        const angle = index / 8 * Math.PI * 2 + garden.life * .35;
        const radius = garden.r * (.38 + (index % 2) * .28);
        this.ctx.beginPath(); this.ctx.ellipse(Math.cos(angle) * radius, Math.sin(angle) * radius, 6, 3, angle, 0, Math.PI * 2); this.ctx.fill();
      }
      this.ctx.restore();
    }
  }

  renderEliteStructure(enemy, color) {
    this.ctx.save(); this.ctx.translate(enemy.x, enemy.y); this.ctx.strokeStyle = color; this.ctx.fillStyle = '#fff2b4'; this.ctx.lineWidth = 3;
    this.ctx.beginPath(); this.ctx.moveTo(-enemy.r * .8, -enemy.r); this.ctx.lineTo(-enemy.r * 1.35, -enemy.r * 1.55); this.ctx.lineTo(-enemy.r * .25, -enemy.r * 1.15);
    this.ctx.moveTo(enemy.r * .8, -enemy.r); this.ctx.lineTo(enemy.r * 1.35, -enemy.r * 1.55); this.ctx.lineTo(enemy.r * .25, -enemy.r * 1.15); this.ctx.stroke();
    this.ctx.setLineDash([5, 4]); this.ctx.globalAlpha = .8; this.ctx.beginPath(); this.ctx.arc(0, 0, enemy.r + 9, 0, Math.PI * 2); this.ctx.stroke(); this.ctx.restore();
  }

  renderRain(seed) {
    this.ctx.save(); this.ctx.strokeStyle = 'rgba(220,242,238,.22)'; this.ctx.lineWidth = 2;
    for (let index = 0; index < 34; index++) {
      const x = (index * 97 + seed * 43) % WORLD_WIDTH; const y = (index * 53 + seed * 29) % WORLD_HEIGHT;
      this.ctx.beginPath(); this.ctx.moveTo(x, y); this.ctx.lineTo(x - 8, y + 18); this.ctx.stroke();
    }
    this.ctx.restore();
  }

  renderMovementMarker(enemy) {
    const profile = getEnemyAiProfile(enemy.aiType ?? enemy.movementType ?? ENEMY_AI_TYPE.PURSUER);
    if (enemy.movementType === ENEMY_MOVEMENT.INTERCEPTOR) {
      this.ctx.save(); this.ctx.strokeStyle = profile.color; this.ctx.lineWidth = 2; this.ctx.globalAlpha = .75;
      this.ctx.beginPath(); this.ctx.arc(enemy.x, enemy.y, enemy.r + 6, -.75, .75); this.ctx.stroke(); this.ctx.restore();
    } else if (enemy.movementType === ENEMY_MOVEMENT.CURVE) {
      const lifeRatio = clamp(1 - enemy.movementTime / Math.max(.001, enemy.movementLife), 0, 1);
      this.ctx.save(); this.ctx.strokeStyle = profile.color; this.ctx.lineWidth = 3; this.ctx.globalAlpha = .85;
      this.ctx.beginPath(); this.ctx.arc(enemy.x, enemy.y, enemy.r + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lifeRatio); this.ctx.stroke(); this.ctx.restore();
    }
  }

  renderCurveTrail(enemy) {
    const profile = getEnemyAiProfile(enemy.aiType ?? enemy.movementType ?? ENEMY_AI_TYPE.CURVE_RAIDER);
    this.ctx.save(); this.ctx.lineCap = 'round'; this.ctx.lineJoin = 'round';
    for (let index = 1; index < enemy.trail.length; index++) {
      this.ctx.globalAlpha = index / enemy.trail.length * .38;
      this.ctx.strokeStyle = profile.color; this.ctx.lineWidth = 2 + index / enemy.trail.length * 3;
      this.ctx.beginPath(); this.ctx.moveTo(enemy.trail[index - 1].x, enemy.trail[index - 1].y); this.ctx.lineTo(enemy.trail[index].x, enemy.trail[index].y); this.ctx.stroke();
    }
    this.ctx.restore();
  }

  renderBloomStacks(enemy, preview) {
    const petals = Math.min(10, Math.max(1, Math.ceil(enemy.stacks)));
    const radius = enemy.r + 11;
    this.ctx.save(); this.ctx.translate(enemy.x, enemy.y);
    for (let index = 0; index < petals; index++) {
      const angle = index / petals * Math.PI * 2 - Math.PI / 2;
      this.ctx.save(); this.ctx.rotate(angle); this.ctx.translate(radius, 0);
      this.ctx.fillStyle = preview?.lethal ? '#fff0a8' : '#dca7ff'; this.ctx.globalAlpha = .72 + Math.sin((enemy.movementTime ?? 0) * 7 + index) * .18;
      this.ctx.beginPath(); this.ctx.ellipse(0, 0, 5, 2.8, 0, 0, Math.PI * 2); this.ctx.fill(); this.ctx.restore();
    }
    this.ctx.restore();
    this.ctx.save(); this.ctx.textAlign = 'center'; this.ctx.font = 'bold 13px Segoe UI'; this.ctx.fillStyle = preview?.lethal ? '#fff0a8' : '#edc5ff';
    this.ctx.fillText(`×${enemy.stacks}`, enemy.x, enemy.y + enemy.r + 25);
    if (preview) {
      this.ctx.strokeStyle = preview.lethal ? '#fff0a8' : '#dca7ff'; this.ctx.lineWidth = preview.lethal ? 4 : 2;
      this.ctx.globalAlpha = preview.lethal ? .72 + Math.sin((enemy.movementTime ?? 0) * 10) * .25 : .8;
      this.ctx.beginPath(); this.ctx.arc(enemy.x, enemy.y, enemy.r + 18, 0, Math.PI * 2); this.ctx.stroke();
      this.ctx.globalAlpha = 1; this.ctx.fillStyle = preview.lethal ? '#fff0a8' : '#edc5ff'; this.ctx.font = 'bold 12px Segoe UI';
      this.ctx.fillText(preview.lethal ? `Q 수확 · 처치 가능` : `Q 수확 · ${Math.round(preview.damage)} 피해`, enemy.x, enemy.y - enemy.r - 23);
    }
    this.ctx.restore();
  }

  renderProjectiles(world) {
    for (const shot of world.projectiles) {
      this.ctx.save();
      this.ctx.fillStyle = world.themeColor(); this.ctx.strokeStyle = '#173f3b'; this.ctx.lineWidth = 2.4;
      this.ctx.shadowColor = '#fff8df'; this.ctx.shadowBlur = 7;
      this.ctx.beginPath(); this.ctx.arc(shot.x, shot.y, Math.max(shot.r, 4), 0, Math.PI * 2); this.ctx.fill(); this.ctx.stroke();
      this.ctx.fillStyle = '#fffdf0'; this.ctx.shadowBlur = 0; this.ctx.beginPath(); this.ctx.arc(shot.x - 1, shot.y - 1, Math.max(1.4, shot.r * .32), 0, Math.PI * 2); this.ctx.fill();
      this.ctx.restore();
    }
    for (const shot of world.hostile) {
      this.ctx.save();
      if (shot.orbiting) {
        this.ctx.strokeStyle = 'rgba(255,241,118,.55)'; this.ctx.lineWidth = 2; this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath(); this.ctx.moveTo(world.player.x, world.player.y); this.ctx.lineTo(shot.x, shot.y); this.ctx.stroke(); this.ctx.setLineDash([]);
      }
      this.ctx.fillStyle = shot.reflected ? '#fff176' : shot.fast ? '#ffb347' : '#ff3d59'; this.ctx.strokeStyle = '#4a1826'; this.ctx.lineWidth = 2.4;
      this.ctx.shadowColor = this.ctx.fillStyle; this.ctx.shadowBlur = shot.fast ? 20 : 12;
      this.ctx.beginPath(); this.ctx.arc(shot.x, shot.y, Math.max(shot.r, 4), 0, Math.PI * 2); this.ctx.fill(); this.ctx.stroke();
      this.ctx.fillStyle = '#fff8e7'; this.ctx.shadowBlur = 0; this.ctx.beginPath(); this.ctx.arc(shot.x - 1, shot.y - 1, Math.max(1.3, shot.r * .28), 0, Math.PI * 2); this.ctx.fill();
      this.ctx.restore();
    }
  }

  renderArcs(arcs) {
    for (const arc of arcs) {
      const alpha = clamp(arc.life / arc.maxLife, 0, 1);
      this.ctx.save(); this.ctx.globalAlpha = alpha; this.ctx.lineJoin = 'round'; this.ctx.lineCap = 'round';
      for (const [width, color] of [[8, 'rgba(82,247,255,.28)'], [3, '#eaffff']]) {
        this.ctx.strokeStyle = color; this.ctx.lineWidth = width; this.ctx.beginPath();
        arc.points.forEach((point, index) => index ? this.ctx.lineTo(point.x, point.y) : this.ctx.moveTo(point.x, point.y));
        this.ctx.stroke();
      }
      this.ctx.restore();
    }
  }

  renderFloatingTexts(items) {
    this.ctx.save(); this.ctx.textAlign = 'center'; this.ctx.font = 'bold 17px Segoe UI';
    for (const item of items) {
      this.ctx.globalAlpha = clamp(item.life / item.maxLife, 0, 1);
      this.ctx.fillStyle = item.color; this.ctx.fillText(item.text, item.x, item.y);
    }
    this.ctx.restore();
  }

  renderEffects(effects) {
    for (const effect of effects) {
      this.ctx.globalAlpha = clamp(effect.life / effect.maxLife, 0, 1);
      this.ctx.fillStyle = effect.color; this.ctx.beginPath(); this.ctx.arc(effect.x, effect.y, effect.r, 0, Math.PI * 2); this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }

  renderReticle(pointer, color) {
    this.ctx.strokeStyle = color; this.ctx.lineWidth = 2; this.ctx.globalAlpha = .8;
    this.ctx.beginPath(); this.ctx.arc(pointer.x, pointer.y, 12, 0, Math.PI * 2); this.ctx.moveTo(pointer.x - 18, pointer.y); this.ctx.lineTo(pointer.x + 18, pointer.y); this.ctx.moveTo(pointer.x, pointer.y - 18); this.ctx.lineTo(pointer.x, pointer.y + 18); this.ctx.stroke(); this.ctx.globalAlpha = 1;
  }

  healthBar(x, y, width, ratio, color) {
    this.ctx.fillStyle = 'rgba(0,0,0,.65)'; this.ctx.fillRect(x - width / 2, y, width, 5);
    this.ctx.fillStyle = color; this.ctx.fillRect(x - width / 2, y, width * clamp(ratio, 0, 1), 5);
  }
}

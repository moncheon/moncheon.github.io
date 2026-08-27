// @ts-check

import { PHASE, THEME, WORLD_HEIGHT, WORLD_WIDTH } from '../config.js';
import { addThemeXp, xpRequiredForLevel } from '../domain/progression.js';
import { EventBudget, circleHit, clamp, distanceSq, normalize, segmentCircleHit } from '../domain/math.js';
import { createBossMotion, updateBossMotion } from './BossMotion.js';
import { enemyAiRoster } from './EnemyAiProfiles.js';
import { createEnemyMovement, ENEMY_MOVEMENT, movementXp, selectEnemyMovement, updateEnemyMovement } from './EnemyMovement.js';
import { BossPacingDirector, FieldPacingDirector } from './PacingDirector.js';
import { EnemyLevelDirector, enemyLevelSpec, enemyXpForLevel } from './EnemyProgression.js';

export class CombatWorld {
  constructor({ themeId, phase, stage, themeState, rng, options, dodgeChance = 0 }) {
    this.themeId = themeId;
    this.phase = phase;
    this.stage = stage;
    this.themeState = themeState;
    this.rng = rng;
    this.options = options;
    this.dodgeChance = dodgeChance;
    this.time = 0;
    this.events = [];
    this.ended = false;
    this.waitingForChoice = false;
    this.kills = 0;
    this.score = 0;
    this.damageTaken = 0;
    this.maxCombo = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.calmMinute = 0;
    this.cooldown = 0;
    this.parryWindow = 0;
    this.parryAssistShot = null;
    this.parryGuarding = false;
    this.parryChain = 0;
    this.maxParryChain = 0;
    this.harvestCharge = 0;
    this.bloomCueShown = false;
    this.attackCount = 0;
    this.playerVolleyCount = 0;
    this.retaliationCooldown = 0;
    this.mechanicStats = { returnTrips: 0, twinShots: 0, twinFuses: 0, ricochets: 0, gardensPlanted: 0, gardenHits: 0, retaliationPulses: 0, borrowedAimTurns: 0, orbitCaptures: 0, orbitReleases: 0, orbitBlocks: 0 };
    this.eventBudget = new EventBudget(700, 7);
    this.fieldPacing = phase === PHASE.FIELD ? new FieldPacingDirector(rng, stage) : null;
    this.bossPacing = phase === PHASE.BOSS ? new BossPacingDirector(rng, stage) : null;
    this.enemyLevels = phase === PHASE.FIELD ? new EnemyLevelDirector(themeState.level) : null;
    this.player = {
      x: WORLD_WIDTH / 2,
      y: phase === PHASE.BOSS ? WORLD_HEIGHT - 125 : WORLD_HEIGHT / 2,
      r: 16,
      hitR: 16,
      opacity: 1,
      focusVisible: false,
      hp: Math.ceil(themeState.stats.maxHp),
      maxHp: Math.ceil(themeState.stats.maxHp),
      shield: 0,
      dash: 0,
      invuln: 0,
      vx: 0,
      vy: 0
    };
    this.enemies = [];
    this.projectiles = [];
    this.hostile = [];
    this.gardens = [];
    this.effects = [];
    this.arcs = [];
    this.floatingTexts = [];
    this.boss = phase === PHASE.BOSS ? this.createBoss() : null;
  }

  createBoss() {
    const scale = (1 + (this.stage - 1) * .18) * this.options.bossHealthScale;
    return {
      x: WORLD_WIDTH / 2, y: 150, vx: 0, vy: 0, r: 64,
      hp: 6800 * scale, maxHp: 6800 * scale,
      shield: 1300 * scale, maxShield: 1300 * scale,
      attackTimer: 1.2, phase: 0, flash: 0,
      ...createBossMotion(this.rng)
    };
  }

  update(dt, input) {
    if (this.ended || this.waitingForChoice) return [];
    this.time += dt;
    this.eventBudget.reset();
    this.cooldown -= dt;
    this.player.dash -= dt;
    this.player.invuln -= dt;
    this.comboTimer -= dt;
    this.parryWindow -= dt;
    if (this.parryWindow <= 0) this.parryAssistShot = null;
    this.retaliationCooldown -= dt;
    if (this.comboTimer <= 0) this.combo = Math.max(0, this.combo - dt * 3);
    this.movePlayer(dt, input);
    this.attack(dt, input);

    if (this.phase === PHASE.BOSS) this.updateBossPhase(dt, input);
    else this.updateFieldPhase(dt, input);

    this.updateEffects(dt);
    this.trackCalmPlay();
    if (!this.options.god && this.player.hp <= 0) this.finish('defeat');
    const events = this.events.splice(0);
    return events;
  }

  movePlayer(dt, input) {
    const previousX = this.player.x;
    const previousY = this.player.y;
    let { moveX: dx, moveY: dy } = input;
    if (dx || dy) ({ x: dx, y: dy } = normalize(dx, dy));
    let speed = this.themeState.stats.moveSpeed;
    if (input.dashPressed && this.player.dash <= 0) {
      if (this.themeId === THEME.BLOOM && this.themeState.flags.dashGarden) this.plantGarden(this.player.x, this.player.y, true);
      speed *= 4.5;
      this.player.dash = this.themeState.stats.dashCooldown;
      this.player.invuln = .34;
      this.effect(this.player.x, this.player.y, this.themeColor(), 22, 280);
      this.emit('sound', { kind: 'dash' });
    }
    this.player.x = clamp(this.player.x + dx * speed * dt, 25, WORLD_WIDTH - 25);
    this.player.y = clamp(this.player.y + dy * speed * dt, 55, WORLD_HEIGHT - 25);
    if (dt > 0) {
      const smoothing = 1 - Math.exp(-dt * 8);
      const instantaneousX = (this.player.x - previousX) / dt;
      const instantaneousY = (this.player.y - previousY) / dt;
      this.player.vx += (instantaneousX - this.player.vx) * smoothing;
      this.player.vy += (instantaneousY - this.player.vy) * smoothing;
    }
  }

  attack(dt, input) {
    if (!input.attack || this.cooldown > 0) return;
    this.playerVolleyCount++;
    const count = Math.max(1, Math.floor(this.themeState.stats.projectileCount ?? 1));
    const damageScale = this.themeState.stats.projectileDamageScale ?? 1;
    const shieldScale = this.themeState.flags.shieldVoltage && this.player.shield > 0 ? 1.25 : 1;
    const perpendicular = { x: -input.aim.y, y: input.aim.x };
    const plantsGarden = this.themeId === THEME.BLOOM && this.themeState.stats.gardenEvery > 0 && this.playerVolleyCount % this.themeState.stats.gardenEvery === 0;
    for (let index = 0; index < count; index++) {
      const offset = count === 1 ? 0 : (index - (count - 1) / 2) * 14;
      const x = this.player.x + perpendicular.x * offset;
      const y = this.player.y + perpendicular.y * offset;
      this.projectiles.push({
        x, y, px: x, py: y, dx: input.aim.x, dy: input.aim.y,
        r: this.themeId === THEME.HIJACK ? 8 : 5,
        damage: this.themeState.stats.damage * damageScale * shieldScale, baseDamage: this.themeState.stats.damage,
        life: 1.8, maxLife: 1.8, pierce: this.themeState.stats.pierce ?? 0,
        returned: false, hit: new Set(), volleyId: this.playerVolleyCount, twin: count > 1,
        bouncesRemaining: this.themeState.stats.wallBounces ?? 0, plantsGarden: plantsGarden && index === 0, gardenPlanted: false
      });
    }
    if (count > 1) this.mechanicStats.twinShots++;
    this.cooldown = 1 / this.themeState.stats.fireRate;
    this.emit('sound', { kind: 'shoot' });
  }

  updateFieldPhase(dt, input) {
    this.enemyLevels?.update(dt, this.enemies.length);
    this.spawnEnemies(dt);
    this.updatePlayerProjectiles(dt);
    this.updateGardens(dt);
    this.updateEnemies(dt);
    if (this.themeId === THEME.BLOOM) this.updateHarvest(dt, input);
    if (this.time >= this.options.fieldSeconds && !this.ended) {
      this.ended = true;
      this.emit('fieldComplete', { stats: this.summary() });
    }
  }

  spawnEnemies(dt) {
    if (!this.fieldPacing) return;
    for (const request of this.fieldPacing.update(dt, this.enemies.length)) this.spawnEnemy(request);
  }

  spawnEnemy(request = {}) {
    const side = this.rng.int(0, 3);
    const position = side < 2
      ? { x: side ? WORLD_WIDTH + 25 : -25, y: this.rng.range(75, WORLD_HEIGHT - 25) }
      : { x: this.rng.range(20, WORLD_WIDTH - 20), y: side === 2 ? 35 : WORLD_HEIGHT + 25 };
    const elite = this.rng.next() < Math.min(.25, .04 + this.time / 1500);
    const themeScale = this.themeId === THEME.BLOOM ? 1.22 : 1;
    const monsterLevel = this.enemyLevels?.level ?? 1;
    const levelSpec = enemyLevelSpec(monsterLevel);
    const hp = (elite ? 86 : 30) * themeScale * (1 + this.time / 500) * (1 + (this.stage - 1) * .15) * levelSpec.hpMultiplier;
    const stageSpeed = Math.min(1.45, 1 + (this.stage - 1) * .03);
    const baseSpeed = this.rng.range(elite ? 46 : 52, elite ? 58 : 68) * stageSpeed * levelSpec.speedMultiplier;
    const requestedType = Object.values(ENEMY_MOVEMENT).includes(request.movementType) ? request.movementType : null;
    const movementType = requestedType ?? selectEnemyMovement(this.themeState.level, this.rng.next());
    const runner = Boolean(request.runner) && movementType !== ENEMY_MOVEMENT.CURVE;
    this.enemies.push({
      ...position, r: (elite ? 19 : 13) * levelSpec.radiusMultiplier, hp, maxHp: hp, baseSpeed,
      speed: runner ? baseSpeed * 2.2 : baseSpeed,
      runner, runnerTime: runner ? 1.8 : 0,
      elite, monsterLevel, visualTier: levelSpec.visualTier, stacks: 0, flash: 0,
      xpValue: enemyXpForLevel(movementXp(movementType), elite, monsterLevel),
      ...createEnemyMovement(movementType, position, side, this.player, this.rng)
    });
    this.enemyLevels?.observePopulation(this.enemies.length);
  }

  updatePlayerProjectiles(dt) {
    const speed = this.themeState.stats.projectileSpeed;
    for (const shot of this.projectiles) {
      shot.px = shot.x; shot.py = shot.y; shot.life -= dt;
      if (this.themeId === THEME.CHAIN && this.themeState.flags.returning && !shot.returned && shot.life < shot.maxLife * .5) {
        const direction = normalize(this.player.x - shot.x, this.player.y - shot.y);
        shot.dx = direction.x; shot.dy = direction.y; shot.returned = true; shot.hit.clear();
        this.mechanicStats.returnTrips++;
        if (this.themeState.flags.returnPower) shot.damage *= 1.8;
      }
      shot.x += shot.dx * speed * dt;
      shot.y += shot.dy * speed * dt;
      this.handleWallBounce(shot);
      if (this.phase === PHASE.BOSS && this.boss && !shot.hit.has(this.boss) && circleHit(shot, this.boss)) {
        shot.hit.add(this.boss); this.damageBoss(shot.damage, false); shot.life = 0; continue;
      }
      for (const enemy of [...this.enemies]) {
        if (shot.hit.has(enemy) || !circleHit(shot, enemy)) continue;
        shot.hit.add(enemy);
        enemy.hp -= shot.damage;
        if (shot.twin && this.themeState.flags.twinFuse) this.applyTwinFuse(enemy, shot);
        enemy.flash = .08;
        if (shot.plantsGarden && !shot.gardenPlanted) {
          shot.gardenPlanted = true;
          this.plantGarden(enemy.x, enemy.y);
        }
        if (this.themeId === THEME.BLOOM) {
          enemy.stacks += this.themeState.stats.infection;
          if (!this.bloomCueShown) {
            this.bloomCueShown = true;
            this.emit('tutorialCue', { message: '탄환 → STACK 축적 · Q → 피해와 회복으로 수확', seconds: 3 });
          }
        }
        if (this.themeId === THEME.BLOOM && this.themeState.flags.livingNetwork && enemy.stacks >= 5) this.shareNetworkDamage(enemy, shot.damage);
        if (this.themeId === THEME.CHAIN && this.themeState.stats.chainJumps > 0) this.chainFrom(enemy, this.themeState.stats.chainJumps, new Set([enemy]), 0);
        if (enemy.hp <= 0) this.killEnemy(enemy, this.themeId === THEME.CHAIN ? 'projectile' : 'infection', 0);
        shot.pierce--;
        if (shot.pierce < 0) { shot.life = 0; break; }
      }
      const outside = shot.x <= 0 || shot.x >= WORLD_WIDTH || shot.y <= 45 || shot.y >= WORLD_HEIGHT;
      if (shot.plantsGarden && !shot.gardenPlanted && (shot.life <= 0 || outside)) {
        shot.gardenPlanted = true;
        this.plantGarden(clamp(shot.x, 20, WORLD_WIDTH - 20), clamp(shot.y, 60, WORLD_HEIGHT - 20));
      }
    }
    this.projectiles = this.projectiles.filter(shot => shot.life > 0 && shot.x > -90 && shot.x < WORLD_WIDTH + 90 && shot.y > -90 && shot.y < WORLD_HEIGHT + 90);
  }

  handleWallBounce(shot) {
    const hitX = shot.x <= 0 || shot.x >= WORLD_WIDTH;
    const hitY = shot.y <= 45 || shot.y >= WORLD_HEIGHT;
    if ((!hitX && !hitY) || (shot.bouncesRemaining ?? 0) <= 0) return;
    shot.x = clamp(shot.x, 1, WORLD_WIDTH - 1);
    shot.y = clamp(shot.y, 46, WORLD_HEIGHT - 1);
    shot.bouncesRemaining--;
    const target = this.enemies
      .filter(enemy => !shot.hit.has(enemy) && distanceSq(shot, enemy) <= 520 ** 2)
      .sort((left, right) => distanceSq(shot, left) - distanceSq(shot, right))[0];
    if (target) {
      const direction = normalize(target.x - shot.x, target.y - shot.y);
      shot.dx = direction.x; shot.dy = direction.y;
    } else {
      if (hitX) shot.dx *= -1;
      if (hitY) shot.dy *= -1;
    }
    shot.damage *= this.themeState.stats.bounceDamage ?? 1;
    shot.life = Math.max(shot.life, .9);
    this.mechanicStats.ricochets++;
    this.effect(shot.x, shot.y, '#9ffaff', 8, 120);
  }

  applyTwinFuse(enemy, shot) {
    enemy.twinHits ??= new Map();
    enemy.twinFused ??= new Set();
    const previous = enemy.twinHits.get(shot.volleyId);
    enemy.twinHits.set(shot.volleyId, this.time);
    if (previous === undefined || this.time - previous > .18 || enemy.twinFused.has(shot.volleyId)) return;
    enemy.twinFused.add(shot.volleyId);
    const damage = shot.baseDamage * .35;
    enemy.hp -= damage;
    this.mechanicStats.twinFuses++;
    this.effect(enemy.x, enemy.y, '#bffcff', 9, 145);
    this.floatingTexts.push({ x: enemy.x, y: enemy.y - enemy.r - 8, text: `쌍탄 +${Math.round(damage)}`, color: '#dffcff', life: .5, maxLife: .5 });
  }

  chainFrom(source, jumps, visited, depth) {
    if (jumps <= 0 || !this.eventBudget.allow(depth)) return;
    const target = this.enemies.filter(enemy => !visited.has(enemy)).sort((a, b) => distanceSq(source, a) - distanceSq(source, b))[0];
    if (!target || distanceSq(source, target) > 190 ** 2) return;
    visited.add(target);
    target.hp -= this.themeState.stats.chainDamage;
    target.flash = .13;
    this.addArc(source, target, this.themeState.stats.chainDamage, depth);
    this.effect(target.x, target.y, '#8ffcff', 8, 130);
    if (target.hp <= 0) this.killEnemy(target, 'chain', depth + 1);
    this.chainFrom(target, jumps - 1, visited, depth + 1);
    if (this.themeState.flags.stormEnd && jumps === 1) this.explode(target.x, target.y, 68, this.themeState.stats.chainDamage * 1.4, depth + 1);
  }

  explode(x, y, radius, damage, depth) {
    if (!this.eventBudget.allow(depth, 4)) return;
    let hits = 0;
    this.effect(x, y, '#ff5ba8', Math.min(38, 10 + radius / 4), radius * 2);
    for (const enemy of [...this.enemies]) {
      if (distanceSq({ x, y }, enemy) > (radius + enemy.r) ** 2) continue;
      enemy.hp -= damage; hits++;
      if (enemy.hp <= 0) this.killEnemy(enemy, 'explosion', depth + 1);
    }
    if (this.themeState.flags.supercritical && hits >= 4 && depth < 2) this.explode(x, y, radius * 1.55, damage * .72, depth + 1);
  }

  updateEnemies(dt) {
    for (const enemy of [...this.enemies]) {
      enemy.flash -= dt;
      enemy.speed ??= enemy.baseSpeed ?? 0;
      enemy.runnerTime ??= 0;
      if (enemy.runnerTime > 0) {
        enemy.runnerTime -= dt;
        if (enemy.runnerTime <= 0) enemy.speed = enemy.baseSpeed;
      }
      const escaped = updateEnemyMovement(enemy, this.player, dt);
      if (escaped) {
        const index = this.enemies.indexOf(enemy);
        if (index >= 0) this.enemies.splice(index, 1);
        this.floatingTexts.push({ x: enemy.x, y: enemy.y, text: '도주', color: '#a9bac4', life: .65, maxLife: .65 });
        continue;
      }
      if (distanceSq(enemy, this.player) <= (enemy.r + this.player.hitR) ** 2 && this.player.invuln <= 0) {
        this.hurt(enemy.elite ? 22 : 14);
        const direction = normalize(this.player.x - enemy.x, this.player.y - enemy.y);
        enemy.x -= direction.x * 25; enemy.y -= direction.y * 25;
      }
    }
  }

  shareNetworkDamage(source, damage) {
    const targets = this.enemies
      .filter(enemy => enemy !== source && enemy.stacks > 0 && distanceSq(source, enemy) <= 220 ** 2)
      .sort((a, b) => distanceSq(source, a) - distanceSq(source, b))
      .slice(0, 2);
    for (const target of targets) {
      target.hp -= damage * .45;
      this.effect(target.x, target.y, '#d998ff', 5, 90);
      if (target.hp <= 0) this.killEnemy(target, 'network', 0);
    }
  }

  plantGarden(x, y, small = false) {
    if (this.phase !== PHASE.FIELD) return;
    const radius = small ? 52 : this.themeState.stats.gardenRadius;
    const duration = small ? 2.5 : this.themeState.stats.gardenDuration;
    this.gardens.push({
      x, y, r: radius, life: duration, maxLife: duration, tick: 0,
      damage: small ? 3 : this.themeState.stats.gardenDamage, stacks: 1, infected: new Set()
    });
    while (this.gardens.length > 5) this.gardens.shift();
    this.mechanicStats.gardensPlanted++;
    this.effect(x, y, '#b8ff9f', 10, 110);
  }

  updateGardens(dt) {
    for (const garden of this.gardens) {
      garden.life -= dt;
      garden.tick -= dt;
      if (garden.tick > 0) continue;
      garden.tick += .5;
      for (const enemy of [...this.enemies]) {
        if (distanceSq(garden, enemy) > (garden.r + enemy.r) ** 2) continue;
        enemy.hp -= garden.damage;
        if (!garden.infected.has(enemy)) {
          garden.infected.add(enemy);
          enemy.stacks += garden.stacks;
        }
        this.mechanicStats.gardenHits++;
        enemy.flash = Math.max(enemy.flash, .05);
        if (enemy.hp <= 0) this.killEnemy(enemy, 'garden', 0);
      }
    }
    this.gardens = this.gardens.filter(garden => garden.life > 0);
  }

  pulseGardenHarvest(source, damage) {
    if (!this.themeState.flags.gardenHarvestPulse) return;
    const garden = this.gardens.find(item => distanceSq(item, source) <= item.r ** 2);
    if (!garden) return;
    for (const target of [...this.enemies]) {
      if (target === source || distanceSq(garden, target) > (garden.r + target.r) ** 2) continue;
      target.hp -= damage * .5;
      target.stacks += 1;
      this.effect(target.x, target.y, '#dca7ff', 5, 90);
      if (target.hp <= 0) this.killEnemy(target, 'garden-harvest', 0);
    }
  }

  updateHarvest(dt, input) {
    if (this.themeState.flags.terminalHarvest && input.harvestDown) {
      this.harvestCharge = Math.min(1, this.harvestCharge + dt);
      if (this.harvestCharge >= 1) { this.harvestAll(); this.harvestCharge = 0; }
    } else this.harvestCharge = 0;
    if (input.harvestPressed && !this.themeState.flags.terminalHarvest) {
      const target = this.enemies.filter(enemy => enemy.stacks > 0).sort((a, b) => distanceSq(this.player, a) - distanceSq(this.player, b))[0];
      if (target) this.harvest(target);
    }
  }

  harvestAll() { for (const enemy of [...this.enemies]) if (enemy.stacks > 0) this.harvest(enemy); }

  harvestPreview() {
    if (this.themeId !== THEME.BLOOM) return null;
    const target = this.enemies.filter(enemy => enemy.stacks > 0).sort((a, b) => distanceSq(this.player, a) - distanceSq(this.player, b))[0];
    if (!target) return null;
    const damage = target.stacks * this.themeState.stats.harvestDamage;
    const rawHeal = damage * this.themeState.stats.harvestHeal * .1;
    return {
      target,
      stacks: target.stacks,
      damage,
      heal: Math.min(Math.max(0, this.player.maxHp - this.player.hp), rawHeal),
      lethal: damage >= target.hp
    };
  }

  harvest(enemy) {
    const stacks = enemy.stacks;
    if (stacks <= 0) return;
    const damage = stacks * this.themeState.stats.harvestDamage;
    const beforeHp = this.player.hp;
    enemy.stacks = 0; enemy.hp -= damage;
    this.pulseGardenHarvest(enemy, damage);
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + damage * this.themeState.stats.harvestHeal * .1);
    this.effect(enemy.x, enemy.y, '#b65cff', 10 + stacks, 150);
    this.floatingTexts.push({ x: enemy.x, y: enemy.y - enemy.r - 12, text: `수확 -${Math.round(damage)}`, color: '#edc5ff', life: .7, maxLife: .7 });
    const healed = this.player.hp - beforeHp;
    if (healed > 0) this.floatingTexts.push({ x: this.player.x, y: this.player.y - this.player.r - 12, text: `+${Math.round(healed)} HP`, color: '#82ffbb', life: .7, maxLife: .7 });
    if (this.themeState.flags.harvestBurst && stacks >= 6) this.explode(enemy.x, enemy.y, 75, damage * .45, 0);
    if (enemy.hp <= 0) this.killEnemy(enemy, 'harvest', 0);
  }

  killEnemy(enemy, source, depth) {
    const index = this.enemies.indexOf(enemy);
    if (index < 0) return;
    this.enemies.splice(index, 1);
    this.kills++; this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo); this.comboTimer = 2.2;
    this.score += enemy.elite ? 80 : 15;
    if (this.themeId === THEME.CHAIN && this.themeState.stats.explosionRadius > 0 && source !== 'explosion') {
      this.explode(enemy.x, enemy.y, this.themeState.stats.explosionRadius, this.themeState.stats.damage * .8, depth + 1);
    }
    if (this.themeId === THEME.BLOOM && this.themeState.stats.spread > 0 && enemy.stacks > 0) {
      const targets = this.enemies.sort((a, b) => distanceSq(enemy, a) - distanceSq(enemy, b)).slice(0, this.themeState.stats.spread);
      for (const target of targets) target.stacks += Math.max(1, Math.ceil(enemy.stacks / 2));
    }
    this.effect(enemy.x, enemy.y, this.themeColor(), enemy.elite ? 28 : 14, enemy.elite ? 260 : 170);
    this.floatingTexts.push({ x: enemy.x, y: enemy.y - enemy.r - 18, text: `+${enemy.xpValue} XP`, color: '#fff2a8', life: .7, maxLife: .7 });
    this.awardDefeatXp(enemy.xpValue);
    if (this.enemyLevels?.defeated(this.enemies.length, this.themeState.level)) {
      this.emit('enemyLevelAdvanced', { level: this.enemyLevels.level });
    }
  }

  awardDefeatXp(amount) {
    const levels = addThemeXp(this.themeState, amount);
    this.emit('defeatRewarded', { amount });
    if (levels > 0) this.emit('themeLevelsGained', { count: levels, level: this.themeState.level });
    if (this.themeState.pendingChoices > 0 && !this.waitingForChoice) {
      this.waitingForChoice = true;
      this.emit('choiceRequested', {});
    }
  }

  choiceResolved() {
    if (this.themeState.pendingChoices > 0) this.themeState.pendingChoices--;
    this.waitingForChoice = false;
  }

  updateBossPhase(dt, input) {
    this.updatePlayerProjectiles(dt);
    if (!this.boss) return;
    this.boss.flash -= dt;
    const canFire = updateBossMotion(this.boss, this.player, dt, this.rng);
    if (canFire) {
      this.boss.attackTimer -= dt;
      if (this.boss.attackTimer <= 0) this.fireBossVolley();
    }
    this.parryGuarding = Boolean(input.parryDown);
    if (input.parryPressed) this.beginParry();
    this.updateHostile(dt, input);
    if (distanceSq(this.player, this.boss) < (this.player.hitR + this.boss.r) ** 2 && this.player.invuln <= 0) this.hurt(24 + this.stage * 2);
    if (this.time >= this.options.bossSeconds && !this.ended) this.finish('defeat');
  }

  fireBossVolley() {
    this.attackCount++;
    const baseCount = Math.min(7, 1 + Math.floor((this.stage - 1) / 2) * 2);
    const pattern = this.bossPacing?.nextPattern(baseCount) ?? { count: baseCount, fastCount: 0, nextDelay: 1.2 };
    if (this.themeState.flags.thirdDefault && this.attackCount % 3 === 0) {
      this.damageBoss(180 + this.stage * 25, false);
      this.boss.attackTimer = pattern.nextDelay;
      return;
    }
    const count = pattern.count;
    const base = Math.atan2(this.player.y - this.boss.y, this.player.x - this.boss.x);
    for (let index = 0; index < count; index++) {
      const spread = count === 1 ? 0 : (index / (count - 1) - .5) * 1.05;
      const angle = base + spread;
      const fast = index < pattern.fastCount;
      const speed = (220 + this.stage * 8) * (fast ? 1.65 : 1);
      this.hostile.push({ x: this.boss.x, y: this.boss.y, px: this.boss.x, py: this.boss.y, dx: Math.cos(angle), dy: Math.sin(angle), r: fast ? 8 : 10, speed, fast, damage: 14 + this.stage * 2, life: 5, reflected: false });
    }
    this.boss.attackTimer = pattern.nextDelay;
  }

  updateHostile(dt, input) {
    for (const shot of this.hostile) {
      shot.life -= dt; shot.px = shot.x; shot.py = shot.y;
      if (shot.orbiting) {
        shot.orbitTimer -= dt;
        const capacity = Math.max(1, this.themeState.stats.orbitCapacity);
        const angle = this.time * 4.2 + shot.orbitSlot / capacity * Math.PI * 2;
        shot.x = this.player.x + Math.cos(angle) * 55;
        shot.y = this.player.y + Math.sin(angle) * 55;
        if (shot.orbitTimer > 0) continue;
        this.releaseOrbitShot(shot);
      }
      if (shot.reflected) {
        const lead = Math.min(.35, Math.sqrt(distanceSq(shot, this.boss)) / Math.max(1, shot.speed));
        const desired = normalize(this.boss.x + this.boss.vx * lead - shot.x, this.boss.y + this.boss.vy * lead - shot.y);
        const turn = this.themeState.flags.borrowedAim || shot.captured ? .24 : .08;
        if (this.themeState.flags.borrowedAim) this.mechanicStats.borrowedAimTurns++;
        shot.dx += (desired.x - shot.dx) * turn; shot.dy += (desired.y - shot.dy) * turn;
        const direction = normalize(shot.dx, shot.dy); shot.dx = direction.x; shot.dy = direction.y;
      }
      shot.x += shot.dx * shot.speed * dt; shot.y += shot.dy * shot.speed * dt;
      const assist = shot === this.parryAssistShot ? 24 : 0;
      const catches = !shot.reflected && this.parryWindow > 0 && segmentCircleHit({ x: shot.px, y: shot.py }, shot, this.player, this.themeState.stats.parryRadius + shot.r + assist);
      if (catches) this.reflect(shot);
      else if (!shot.reflected && distanceSq(shot, this.player) <= (shot.r + this.player.hitR) ** 2) {
        if (input.parryDown) { this.hurt(shot.damage * .35); shot.life = 0; }
        else if (this.player.invuln <= 0) { this.hurt(shot.damage); shot.life = 0; }
      } else if (shot.reflected && segmentCircleHit({ x: shot.px, y: shot.py }, shot, this.boss, shot.r + this.boss.r + 12)) {
        let damage = shot.damage * 5 * this.themeState.stats.returnPower * (shot.orbitDamageMultiplier ?? 1);
        if (this.themeState.flags.finalWord && this.boss.hp / this.boss.maxHp <= .15) damage *= 3;
        this.damageBoss(damage, true); shot.life = 0; this.kills++; this.awardDefeatXp(3);
      }
    }
    this.resolveOrbitBlocks();
    this.hostile = this.hostile.filter(shot => shot.life > 0 && shot.x > -90 && shot.x < WORLD_WIDTH + 90 && shot.y > -90 && shot.y < WORLD_HEIGHT + 90);
  }

  reflect(shot) {
    if (shot === this.parryAssistShot) this.parryAssistShot = null;
    if (this.themeState.stats.orbitCapacity > 0) {
      const orbiting = this.hostile.filter(item => item.orbiting && item.life > 0);
      if (orbiting.length >= this.themeState.stats.orbitCapacity) this.releaseOrbitShot(orbiting.sort((left, right) => left.orbitTimer - right.orbitTimer)[0]);
      shot.reflected = true; shot.orbiting = true; shot.orbitTimer = .75;
      shot.orbitSlot = this.mechanicStats.orbitCaptures++; shot.life = 4;
    } else {
      const direction = normalize(this.boss.x - shot.x, this.boss.y - shot.y);
      shot.dx = direction.x; shot.dy = direction.y; shot.speed *= 1.45; shot.reflected = true; shot.life = 4;
    }
    this.parryChain++; this.maxParryChain = Math.max(this.maxParryChain, this.parryChain);
    this.player.shield += this.themeState.stats.shieldGain;
    this.effect(shot.x, shot.y, '#ffd84d', 22, 260);
    this.emit('sound', { kind: 'parry' });
  }

  beginParry() {
    const window = this.themeState.stats.parryWindow;
    const radius = this.themeState.stats.parryRadius + 24;
    this.parryWindow = window;
    this.parryAssistShot = null;
    let bestTime = Infinity;
    for (const shot of this.hostile) {
      if (shot.reflected || shot.orbiting || shot.life <= 0) continue;
      const relativeX = shot.x - this.player.x;
      const relativeY = shot.y - this.player.y;
      const velocityX = shot.dx * shot.speed - this.player.vx;
      const velocityY = shot.dy * shot.speed - this.player.vy;
      const speedSq = velocityX * velocityX + velocityY * velocityY;
      const approach = relativeX * velocityX + relativeY * velocityY;
      const currentDistance = Math.hypot(relativeX, relativeY);
      if (approach >= 0 && currentDistance > radius + shot.r) continue;
      const closestTime = speedSq > 0 ? clamp(-approach / speedSq, 0, window) : 0;
      const closestDistance = Math.hypot(relativeX + velocityX * closestTime, relativeY + velocityY * closestTime);
      if (closestDistance <= radius + shot.r && closestTime < bestTime) {
        this.parryAssistShot = shot;
        bestTime = closestTime;
      }
    }
  }

  releaseOrbitShot(shot) {
    if (!shot?.orbiting) return;
    const lead = .25;
    const direction = normalize(this.boss.x + this.boss.vx * lead - shot.x, this.boss.y + this.boss.vy * lead - shot.y);
    shot.dx = direction.x; shot.dy = direction.y; shot.speed *= 1.6;
    shot.orbiting = false; shot.captured = true; shot.life = Math.max(shot.life, 3);
    shot.orbitDamageMultiplier = 1.35 * this.themeState.stats.orbitDamage;
    this.mechanicStats.orbitReleases++;
  }

  resolveOrbitBlocks() {
    const orbiting = this.hostile.filter(shot => shot.orbiting && shot.life > 0);
    const incoming = this.hostile.filter(shot => !shot.reflected && shot.life > 0);
    for (const guard of orbiting) {
      const threat = incoming.find(shot => shot.life > 0 && distanceSq(guard, shot) <= (guard.r + shot.r + 5) ** 2);
      if (!threat) continue;
      guard.life = 0; threat.life = 0;
      this.mechanicStats.orbitBlocks++;
      this.effect(guard.x, guard.y, '#fff176', 14, 170);
    }
  }

  damageBoss(amount, reflected) {
    if (!this.boss || amount <= 0 || !Number.isFinite(amount)) return;
    const before = this.boss.shield;
    const shieldDamage = Math.min(this.boss.shield, amount);
    this.boss.shield -= shieldDamage;
    this.boss.hp -= amount - shieldDamage;
    this.boss.flash = .08; this.score += Math.round(amount);
    if (before > 0 && this.boss.shield <= 0 && this.themeState.flags.bankruptcy) this.boss.hp -= this.boss.maxShield;
    if (reflected) this.effect(this.boss.x, this.boss.y, '#ffd84d', 18, 220);
    if (this.boss.hp <= 0 && !this.ended) {
      this.ended = true;
      this.emit('bossCleared', { stats: this.summary() });
    }
  }

  hurt(amount) {
    if (this.options.god || this.player.invuln > 0) return;
    if (this.rng.next() < this.dodgeChance) { this.player.invuln = .2; this.emit('miss', {}); return; }
    const shieldDamage = Math.min(this.player.shield, amount);
    this.player.shield -= shieldDamage;
    this.player.hp -= amount - shieldDamage;
    this.damageTaken += amount;
    this.player.invuln = .52;
    this.parryChain = 0;
    if (this.themeId === THEME.BLOOM && this.themeState.flags.retaliatorySpores && this.retaliationCooldown <= 0) {
      this.retaliationCooldown = 1.5;
      this.mechanicStats.retaliationPulses++;
      for (const enemy of this.enemies) {
        if (distanceSq(this.player, enemy) > 55 ** 2) continue;
        enemy.stacks += 2;
        this.effect(enemy.x, enemy.y, '#b8ff9f', 7, 100);
      }
    }
    this.emit('sound', { kind: 'hurt' });
  }

  trackCalmPlay() {
    if (this.kills > 0) return;
    const minute = Math.floor(this.time / 60);
    if (minute > this.calmMinute) {
      this.calmMinute = minute;
      this.emit('calmCreditEarned', { count: 1 });
    }
  }

  finish(result) {
    if (this.ended) return;
    this.ended = true;
    this.emit('runEnded', { result, stats: this.summary() });
  }

  effect(x, y, color, count, force) {
    for (let index = 0; index < count && this.effects.length < 900; index++) {
      const angle = this.rng.range(0, Math.PI * 2);
      const speed = this.rng.range(force * .3, force);
      this.effects.push({ x, y, dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed, color, life: this.rng.range(.2, .65), maxLife: .65, r: this.rng.range(2, 5) });
    }
  }

  addArc(source, target, damage, depth) {
    const dx = target.x - source.x; const dy = target.y - source.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / length; const ny = dx / length;
    const points = [{ x: source.x, y: source.y }];
    for (let index = 1; index <= 3; index++) {
      const ratio = index / 4; const jitter = this.rng.range(-15, 15);
      points.push({ x: source.x + dx * ratio + nx * jitter, y: source.y + dy * ratio + ny * jitter });
    }
    points.push({ x: target.x, y: target.y });
    this.arcs.push({ points, damage: Math.round(damage), depth, life: .18, maxLife: .18 });
    this.floatingTexts.push({ x: target.x, y: target.y - target.r - 8, text: `⚡${Math.round(damage)}`, color: '#bffcff', life: .5, maxLife: .5 });
  }

  updateEffects(dt) {
    for (const effect of this.effects) { effect.life -= dt; effect.x += effect.dx * dt; effect.y += effect.dy * dt; effect.dx *= .94; effect.dy *= .94; }
    this.effects = this.effects.filter(effect => effect.life > 0);
    for (const arc of this.arcs) arc.life -= dt;
    this.arcs = this.arcs.filter(arc => arc.life > 0);
    for (const item of this.floatingTexts) { item.life -= dt; item.y -= 22 * dt; }
    this.floatingTexts = this.floatingTexts.filter(item => item.life > 0);
  }

  emit(type, payload) { this.events.push({ type, ...payload }); }

  summary() {
    return {
      themeId: this.themeId, phase: this.phase, stage: this.stage, duration: this.time,
      kills: this.kills, score: this.score, level: this.themeState.level,
      enemyLevel: this.enemyLevels?.level ?? null, damageTaken: this.damageTaken,
      maxCombo: this.maxCombo, maxParryChain: this.maxParryChain, mechanics: { ...this.mechanicStats }
    };
  }

  hud() {
    const limit = this.phase === PHASE.BOSS ? this.options.bossSeconds : this.options.fieldSeconds;
    const remaining = Math.max(0, limit - this.time);
    const harvest = this.harvestPreview();
    return {
      theme: this.themeId.toUpperCase(), stage: this.stage, phase: this.phase.toUpperCase(),
      health: `HP ${Math.max(0, Math.ceil(this.player.hp))}/${this.player.maxHp}${this.player.shield ? ` + ${Math.ceil(this.player.shield)}` : ''}`,
      level: `LV ${this.themeState.level} · XP ${Math.floor(this.themeState.xp)}/${xpRequiredForLevel(this.themeState.level)}`,
      timer: `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(Math.floor(remaining % 60)).padStart(2, '0')}`,
      score: `${this.score.toLocaleString()} · KILL ${this.kills}`,
      enemyLevel: this.enemyLevels?.level ?? null,
      enemyAi: this.enemyLevels ? `MONSTER LV ${this.enemyLevels.level} · ${enemyAiRoster(this.enemies)}` : 'BOSS · RULE HIJACK',
      combo: this.themeId === THEME.HIJACK ? `PARRY ×${this.parryChain}` : this.themeId === THEME.BLOOM ? `STACK ${harvest?.stacks ?? 0} · ${harvest?.lethal ? '수확 처치 가능' : `수확 ${Math.round(harvest?.damage ?? 0)}`}` : `CHAIN ×${Math.floor(this.combo)}`,
      ability: this.themeId === THEME.BLOOM
        ? harvest ? `Q 수확 · ${Math.round(harvest.damage)} 피해 · ${Math.round(harvest.heal)} 회복` : '탄환으로 STACK 축적 · Q 수확'
        : this.phase === PHASE.BOSS
          ? this.parryWindow > 0 ? `E 패링 ACTIVE · ${this.parryWindow.toFixed(2)}s` : this.parryGuarding ? 'E GUARD · 피해 65% 감소' : 'E 패링/가드'
          : 'F 공격 토글'
    };
  }

  themeColor() { return this.themeId === THEME.BLOOM ? '#b65cff' : this.themeId === THEME.HIJACK ? '#ffd84d' : '#52f7ff'; }
}

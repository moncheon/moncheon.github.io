// @ts-check

import { SCENE, THEME } from '../config.js';
import { SeededRng } from '../domain/math.js';
import { applyUpgrade, ChoiceDirector } from '../domain/upgrades.js';
import { AudioService } from '../engine/AudioService.js';
import { CombatWorld } from '../game/CombatWorld.js';
import { nextStageGroup, stageVisualFor } from '../game/StageVisualRegistry.js';

const THEME_SALT = Object.freeze({ [THEME.CHAIN]: 101, [THEME.BLOOM]: 211, [THEME.HIJACK]: 307 });
const STAGE_TRANSITION_MS = 1200;

export class GameApp {
  constructor({ options, session, scenes, input, renderer, ui, loop, assets, themes, showcase, audio = new AudioService() }) {
    this.options = options;
    this.session = session;
    this.scenes = scenes;
    this.input = input;
    this.renderer = renderer;
    this.ui = ui;
    this.loop = loop;
    this.assets = assets;
    this.themes = themes;
    this.audio = audio;
    this.showcase = showcase;
    this.showcaseActive = false;
    this.playSpeed = options.speed;
    this.world = null;
    this.transitionTimer = null;
    this.lastSeed = options.seed;
    this.boundKeydown = event => this.onSystemKey(event);
  }

  async initialize() {
    try { await this.assets.preload(['global']); }
    catch (error) { console.warn('Asset manifest unavailable; procedural fallback remains active.', error); }
    this.ui.bind({
      start: () => this.startOrResume(), skip: () => this.skipAvailableStages(),
      restart: () => this.startNew(this.lastSeed), newSeed: () => this.startNew(this.randomSeed()),
      dev: () => this.enterShowcase(), abandon: () => this.abandonRun(), home: () => this.returnHome()
    });
    document.addEventListener('keydown', this.boundKeydown, true);
    this.showTitle();
    this.loop.start();
  }

  showTitle() {
    if (!this.scenes.is(SCENE.TITLE)) this.scenes.transition(SCENE.TITLE);
    this.world = null;
    this.input.setGameplayEnabled(Boolean(this.session.campaign));
    this.ui.showTitle(this.session.profile, Boolean(this.session.campaign), this.session.maxSkippableStage());
  }

  enterShowcase() {
    void this.audio.unlock();
    for (let stage = 1; stage <= 12; stage++) this.assets.prefetchGroup(stageVisualFor(stage).group);
    this.showcaseActive = true;
    this.loop.speed = 1;
    this.ui.showShowcase();
    this.showcase.enter();
  }

  exitShowcase() {
    this.showcase.exit(); this.showcaseActive = false;
    this.loop.speed = this.playSpeed;
    this.input.attachCanvas(this.renderer.canvas); this.input.resetAttack();
    this.showTitle();
  }

  startOrResume() {
    void this.audio.unlock();
    if (!this.session.campaign) this.session.start(this.options.seed);
    this.lastSeed = this.session.campaign.seed;
    this.input.resetAttack();
    this.preparePhase();
  }

  startNew(seed) {
    void this.audio.unlock();
    this.clearTransition();
    this.lastSeed = seed;
    this.session.start(seed);
    this.input.resetAttack();
    this.preparePhase();
  }

  skipAvailableStages() {
    const maximum = this.session.maxSkippableStage();
    if (maximum < 1) return;
    void this.audio.unlock();
    this.clearTransition();
    this.lastSeed = this.options.seed;
    this.session.startSkipped(this.lastSeed, maximum);
    this.input.resetAttack();
    this.preparePhase();
  }

  preparePhase() {
    const campaign = this.session.campaign;
    if (!campaign) return this.showTitle();
    this.clearTransition();
    const themeId = campaign.currentTheme;
    const draftCount = this.session.openingDraftCount(themeId);
    this.input.setGameplayEnabled(true);
    if (draftCount > 0) {
      this.openDraft(themeId, draftCount, '시작 능력 일괄 선택', `${this.themes.get(themeId).label} · ${draftCount}개를 고른 뒤 한 번에 시작`, 'opening');
      return;
    }
    this.activateWorld();
  }

  activateWorld() {
    const campaign = this.session.campaign;
    if (!campaign) return;
    const seed = (campaign.seed + campaign.stage * 1009 + THEME_SALT[campaign.currentTheme]) >>> 0;
    const visual = stageVisualFor(campaign.stage);
    this.assets.prefetchGroup(visual.group);
    this.assets.prefetchGroup(nextStageGroup(campaign.stage));
    this.world = new CombatWorld({
      themeId: campaign.currentTheme, phase: campaign.phase, stage: campaign.stage,
      themeState: this.session.themeState(), rng: new SeededRng(seed), options: this.options,
      dodgeChance: this.session.dodgeChance()
    });
    this.scenes.transition(SCENE.PLAYING);
    this.ui.showPlaying();
    this.ui.showToast(`${visual.vi} · ${visual.ko} · ${this.themes.get(campaign.currentTheme).label}`);
  }

  openDraft(themeId, count, title, subtitle, source) {
    const campaign = this.session.campaign;
    if (!campaign) return;
    this.scenes.transition(SCENE.DRAFT);
    const state = this.session.themeState(themeId);
    const seed = (campaign.seed + campaign.stage * 4099 + state.upgradeIds.length * 97 + count) >>> 0;
    const rows = new ChoiceDirector(new SeededRng(seed)).makeDraftRows(state, count);
    this.ui.showDraft(rows, title, subtitle, selections => {
      const unlockedBefore = campaign.unlockedThemes.includes(THEME.BLOOM);
      for (const selection of selections) {
        if (!selection.choice) throw new Error('Every draft row requires a choice');
        applyUpgrade(this.session.themeState(selection.themeId), selection.choice);
        this.session.recordUpgrade(selection.themeId, selection.choice, source);
      }
      if (source === 'opening') this.session.consumeOpeningDraft(themeId);
      else if (source === 'runtime') this.world?.choiceResolved();
      if (!unlockedBefore && campaign.unlockedThemes.includes(THEME.BLOOM)) this.ui.showToast('PARASITE BLOOM 공개');
      this.activateWorldAfterDraft(source);
    });
  }

  activateWorldAfterDraft(source) {
    if (source === 'runtime' && this.world) {
      this.scenes.transition(SCENE.PLAYING);
      this.ui.showPlaying();
      this.syncWorldStats();
      return;
    }
    this.activateWorld();
  }

  syncWorldStats() {
    if (!this.world) return;
    const nextMax = Math.ceil(this.session.themeState().stats.maxHp);
    const difference = nextMax - this.world.player.maxHp;
    this.world.player.maxHp = nextMax;
    this.world.player.hp = Math.min(nextMax, this.world.player.hp + Math.max(0, difference));
  }

  fixedUpdate(dt) {
    if (this.showcaseActive) {
      this.showcase.fixedUpdate(dt); this.input.endFrame(); return;
    }
    if (this.scenes.is(SCENE.PLAYING) && this.world) {
      const events = this.world.update(dt, this.input.snapshot(this.world.player));
      const terminal = events.find(event => ['fieldComplete', 'bossCleared', 'runEnded'].includes(event.type));
      for (const event of events) {
        if (event === terminal || event.type === 'choiceRequested') continue;
        this.handleWorldEvent(event);
      }
      if (terminal) this.handleWorldEvent(terminal);
      else for (const event of events) if (event.type === 'choiceRequested') this.handleWorldEvent(event);
    }
    this.input.endFrame();
  }

  render(realDt) {
    if (this.showcaseActive) { this.showcase.render(); this.ui.update(realDt); return; }
    this.renderer.render(this.world, this.input.pointer);
    if (this.world && !this.scenes.is(SCENE.TITLE) && !this.scenes.is(SCENE.ENDED)) {
      const visual = stageVisualFor(this.world.stage);
      this.ui.updateHud({ ...this.world.hud(), location: `${visual.vi} · ${visual.ko}`, weather: `${visual.time} · ${visual.weather}` }, this.input.attackEnabled, this.playSpeed);
    }
    this.ui.update(realDt);
  }

  handleWorldEvent(event) {
    if (!this.session.campaign) return;
    if (event.type === 'sound') this.audio.play(event.kind);
    else if (event.type === 'miss') this.ui.showToast('MISS · 회피');
    else if (event.type === 'tutorialCue') this.ui.showToast(event.message, event.seconds);
    else if (event.type === 'defeatRewarded') this.session.saveCampaign();
    else if (event.type === 'enemyLevelAdvanced') {
      const first = this.session.claimSpeedToggleHint();
      if (first && this.playSpeed === 1) this.ui.showCoachBubble('게임이 너무 쉬운가요? T를 눌러보세요', 5);
      else if (!first) this.ui.showToast(`MONSTER LV ${event.level} · HP↑ SPEED↑ XP↑`);
    }
    else if (event.type === 'themeLevelsGained') {
      const gained = this.session.recordThemeLevels(this.session.campaign.currentTheme, event.count);
      this.session.saveCampaign();
      this.ui.showToast(`LEVEL ${event.level}${gained ? ` · GLOBAL +${event.count} XP` : ''}`);
    } else if (event.type === 'choiceRequested') {
      this.openDraft(this.session.campaign.currentTheme, 1, '처치 보상 진화', '전투를 끊는 선택은 이번 한 번뿐입니다.', 'runtime');
    } else if (event.type === 'calmCreditEarned') {
      this.session.addCalmCredit(this.session.campaign.currentTheme);
      this.ui.showToast('무처치 행동 보상 +1 · 다음 진입 선택지');
    } else if (event.type === 'fieldComplete') {
      this.beginTransition(() => this.session.enterBoss(event.stats), 'RULE HIJACK 보스 진입');
    } else if (event.type === 'bossCleared') {
      this.beginTransition(() => this.session.clearBoss(event.stats), '보스 규칙 탈취 · GLOBAL +10 XP');
    } else if (event.type === 'runEnded') this.finishRun(event.result, event.stats);
  }

  beginTransition(mutate, message) {
    if (!this.scenes.is(SCENE.PLAYING)) return;
    this.scenes.transition(SCENE.TRANSITION);
    this.input.setGameplayEnabled(false);
    mutate();
    this.audio.play('transition');
    const campaign = this.session.campaign;
    this.ui.showTransition(stageVisualFor(campaign?.stage ?? 1), message);
    this.transitionTimer = window.setTimeout(() => this.preparePhase(), STAGE_TRANSITION_MS);
  }

  onSystemKey(event) {
    if (event.code === 'KeyM' && !event.repeat) {
      const muted = this.audio.toggleMuted();
      this.ui.showToast(muted ? 'SOUND OFF' : 'SOUND ON');
      return;
    }
    if (this.showcaseActive && event.code === 'Escape' && !event.repeat) { event.preventDefault(); this.exitShowcase(); return; }
    if (event.code === 'KeyT' && !event.repeat && this.scenes.is(SCENE.PLAYING)) {
      event.preventDefault(); this.togglePlaySpeed(); return;
    }
    if (event.code === 'KeyQ' && !event.repeat && this.scenes.is(SCENE.PAUSED)) {
      event.preventDefault(); this.abandonRun(); return;
    }
    if (event.code === 'KeyH' && !event.repeat && this.scenes.is(SCENE.ENDED)) {
      event.preventDefault(); this.returnHome(); return;
    }
    if (!['KeyP', 'Escape'].includes(event.code) || event.repeat) return;
    if (this.scenes.is(SCENE.PLAYING)) {
      event.preventDefault(); this.scenes.transition(SCENE.PAUSED); this.ui.showPaused();
    } else if (this.scenes.is(SCENE.PAUSED)) {
      event.preventDefault(); this.scenes.transition(SCENE.PLAYING); this.ui.hidePaused();
    }
  }

  togglePlaySpeed() {
    this.playSpeed = this.playSpeed === 3 ? 1 : 3;
    this.loop.speed = this.playSpeed;
    this.ui.hideCoachBubble?.();
    this.ui.showToast(`SPEED ${this.playSpeed}×`);
  }

  abandonRun() {
    if (!this.scenes.is(SCENE.PAUSED) || !this.world || !this.session.campaign) return;
    this.finishRun('abandon', this.world.summary());
  }

  finishRun(result, stats) {
    if (!this.session.campaign) return;
    const summary = this.formatEndSummary(result, stats);
    this.lastSeed = this.session.campaign.seed;
    this.session.finish(result, stats);
    this.scenes.transition(SCENE.ENDED);
    this.input.setGameplayEnabled(false);
    this.input.resetAttack();
    this.ui.showEnd(this.session.profile, summary);
  }

  returnHome() {
    if (!this.scenes.is(SCENE.ENDED)) return;
    this.showTitle();
  }

  clearTransition() {
    if (this.transitionTimer !== null) window.clearTimeout(this.transitionTimer);
    this.transitionTimer = null;
  }

  formatEndSummary(result, stats) {
    const label = result === 'defeat' ? '캠페인 종료' : result === 'abandon' ? '캠페인 포기' : '완료';
    const visual = stageVisualFor(stats.stage);
    return `${label} · ${visual.vi} · Stage ${stats.stage} · ${stats.themeId.toUpperCase()} LV ${stats.level} · 처치 ${stats.kills} · ${Math.floor(stats.duration)}초`;
  }

  randomSeed() { return Math.floor(Math.random() * 0xffffffff) || 1; }
}

// @ts-check

import { PHASE, THEME, fieldThemeForStage } from '../config.js';
import { addGlobalXp, createThemeState, dodgeChance, maxSkippableStage, openingPickCount } from '../domain/progression.js';
import { createCampaignState } from '../domain/state.js';

export class RunSession {
  constructor(repository, profile, campaign = null) {
    this.repository = repository;
    this.profile = profile;
    this.campaign = campaign;
  }

  start(seed) {
    this.campaign = createCampaignState(seed);
    this.campaign.openingPicksPerTheme = openingPickCount(this.profile.globalLevel);
    this.saveCampaign();
    return this.campaign;
  }

  resumeOrStart(seed) { return this.campaign ?? this.start(seed); }

  startSkipped(seed, lastStage) {
    const safeLast = Math.min(maxSkippableStage(this.profile.noHitBosses), Math.max(0, Math.floor(lastStage)));
    this.start(seed);
    for (let stage = 1; stage <= safeLast; stage++) {
      const fieldTheme = fieldThemeForStage(stage);
      this.unlockTheme(fieldTheme);
      this.unlockTheme(THEME.HIJACK);
      this.grantSkippedLevels(fieldTheme, 3);
      this.grantSkippedLevels(THEME.HIJACK, 2);
    }
    this.campaign.stage = safeLast + 1;
    this.campaign.phase = PHASE.FIELD;
    this.campaign.currentTheme = fieldThemeForStage(this.campaign.stage);
    this.unlockTheme(this.campaign.currentTheme);
    this.saveCampaign();
    return this.campaign;
  }

  grantSkippedLevels(themeId, count) {
    const state = this.themeState(themeId);
    state.level += count;
    this.campaign.skippedDraftPicks[themeId] = (this.campaign.skippedDraftPicks[themeId] ?? 0) + count;
  }

  themeState(themeId = this.campaign.currentTheme) {
    if (!this.campaign) throw new Error('Campaign has not started');
    this.campaign.themeStates[themeId] ??= createThemeState(themeId);
    return this.campaign.themeStates[themeId];
  }

  unlockTheme(themeId) {
    if (!this.campaign.unlockedThemes.includes(themeId)) this.campaign.unlockedThemes.push(themeId);
    this.themeState(themeId);
  }

  recordThemeLevels(themeId, count) {
    if (count <= 0) return 0;
    this.profile.totalThemeLevelsGained += count;
    return this.awardPermanent(`level:${this.campaign.id}:${themeId}:${this.themeState(themeId).level}`, count);
  }

  recordUpgrade(themeId, definition, phase = 'runtime') {
    const themes = this.campaign.genome.themes;
    themes[themeId] ??= { upgrades: [] };
    themes[themeId].upgrades.push({ id: definition.id, phase, stage: this.campaign.stage });
    if (themeId === THEME.CHAIN && this.themeState(THEME.CHAIN).upgradeIds.length >= 3) this.unlockTheme(THEME.BLOOM);
    this.saveCampaign();
  }

  openingDraftCount(themeId) {
    const state = this.themeState(themeId);
    const globalPicks = state.entryDraftApplied ? 0 : this.campaign.openingPicksPerTheme;
    return globalPicks + (this.campaign.skippedDraftPicks[themeId] ?? 0) + state.calmCredits;
  }

  consumeOpeningDraft(themeId) {
    const state = this.themeState(themeId);
    state.entryDraftApplied = true;
    state.calmCredits = 0;
    this.campaign.skippedDraftPicks[themeId] = 0;
    this.saveCampaign();
  }

  addCalmCredit(themeId) {
    this.themeState(themeId).calmCredits++;
    this.saveCampaign();
  }

  claimSpeedToggleHint() {
    if (!this.campaign || this.campaign.hints.speedToggleShown) return false;
    this.campaign.hints.speedToggleShown = true;
    this.saveCampaign();
    return true;
  }

  enterBoss(fieldStats) {
    this.campaign.genome.stages.push({ stage: this.campaign.stage, themeId: this.campaign.currentTheme, phase: PHASE.FIELD, stats: fieldStats });
    if (fieldStats.damageTaken <= 0) {
      this.profile.noHitBosses++;
      this.updateAchievement('no-hit-boss', { value: this.profile.noHitBosses, complete: true });
    }
    this.campaign.phase = PHASE.BOSS;
    this.campaign.currentTheme = THEME.HIJACK;
    this.unlockTheme(THEME.HIJACK);
    this.saveCampaign();
  }

  clearBoss(stats) {
    const stage = this.campaign.stage;
    this.campaign.genome.stages.push({ stage, themeId: THEME.HIJACK, phase: PHASE.BOSS, stats });
    this.profile.totalBossStagesCleared++;
    this.awardPermanent(`boss:${this.campaign.id}:${stage}`, 10);
    if (stats.kills <= 0) {
      this.profile.pacifistBosses++;
      this.updateAchievement('pacifist-boss', { value: this.profile.pacifistBosses, complete: true });
    }
    this.campaign.stage++;
    this.campaign.phase = PHASE.FIELD;
    this.campaign.currentTheme = fieldThemeForStage(this.campaign.stage);
    this.unlockTheme(this.campaign.currentTheme);
    this.saveProfile();
    this.saveCampaign();
  }

  finish(result, stats) {
    if (!this.campaign) return;
    const completedStats = this.campaign.genome.stages.map(stage => stage.stats ?? {});
    const totalDuration = completedStats.reduce((sum, item) => sum + (Number(item.duration) || 0), Number(stats.duration) || 0);
    const totalKills = completedStats.reduce((sum, item) => sum + (Number(item.kills) || 0), Number(stats.kills) || 0);
    if (result === 'defeat' && totalDuration >= 60 && totalKills === 0) {
      const progress = Math.min(360, Math.floor(totalDuration));
      this.updateAchievement('pacifist-boss', { value: progress, text: `${progress}/360`, revealed: true });
    }
    this.campaign.genome.result = result;
    this.campaign.genome.final = { stage: this.campaign.stage, themeId: this.campaign.currentTheme, stats };
    this.repository.saveGenome(this.campaign.genome);
    this.repository.clearCampaign();
    this.campaign = null;
    this.saveProfile();
  }

  updateAchievement(id, patch) {
    const previous = this.profile.achievements[id] ?? { value: 0, text: '', revealed: false, complete: false };
    this.profile.achievements[id] = { ...previous, ...patch, revealed: patch.revealed ?? true };
    if (patch.complete && !this.profile.achievementRewards.includes(id)) this.profile.achievementRewards.push(id);
    this.saveProfile();
  }

  awardPermanent(eventId, xp) {
    if (this.profile.rewardLedger.includes(eventId)) return 0;
    this.profile.rewardLedger.push(eventId);
    if (this.profile.rewardLedger.length > 5000) this.profile.rewardLedger.splice(0, this.profile.rewardLedger.length - 5000);
    const gained = addGlobalXp(this.profile, xp);
    this.saveProfile();
    return gained;
  }

  dodgeChance() { return dodgeChance(this.profile.noHitBosses, this.campaign.stage); }
  maxSkippableStage() { return maxSkippableStage(this.profile.noHitBosses); }
  saveProfile() { this.repository.saveProfile(this.profile); }
  saveCampaign() { if (this.campaign) this.repository.saveCampaign(this.campaign); }
}

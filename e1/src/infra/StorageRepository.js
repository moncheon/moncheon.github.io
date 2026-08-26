// @ts-check

import { STORAGE_PREFIX } from '../config.js';
import { normalizeCampaignState, normalizeProfileState } from '../domain/state.js';

export class StorageRepository {
  constructor(storage = localStorage) { this.storage = storage; }
  get profileKey() { return `${STORAGE_PREFIX}:profile:v1`; }
  get campaignKey() { return `${STORAGE_PREFIX}:campaign:v1`; }
  get genomeKey() { return `${STORAGE_PREFIX}:genome:last:v1`; }

  loadProfile() { return normalizeProfileState(this.read(this.profileKey)); }
  loadCampaign() { return normalizeCampaignState(this.read(this.campaignKey)); }
  saveProfile(profile) { this.write(this.profileKey, profile); }
  saveCampaign(campaign) { this.write(this.campaignKey, campaign); }
  clearCampaign() { this.storage.removeItem(this.campaignKey); }
  saveGenome(genome) { this.write(this.genomeKey, genome); }

  read(key) {
    try { const raw = this.storage.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  }
  write(key, value) { this.storage.setItem(key, JSON.stringify(value)); }
}

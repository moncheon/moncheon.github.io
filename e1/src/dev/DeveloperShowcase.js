// @ts-check

import { PHASE, THEME } from '../config.js';
import { SeededRng } from '../domain/math.js';
import { createThemeState } from '../domain/progression.js';
import { applyUpgrade, ChoiceDirector, UPGRADE_CATALOG } from '../domain/upgrades.js';
import { CombatWorld } from '../game/CombatWorld.js';
import { CanvasRenderer } from '../render/CanvasRenderer.js';
import { AutoplayController } from './AutoplayController.js';
import { botAiProfileForStage } from './BotAiProfiles.js';

const PRESETS = Object.freeze({ [THEME.CHAIN]: 'chain-arc', [THEME.BLOOM]: 'bloom-spread', [THEME.HIJACK]: 'hijack-aim' });
const PHASE_FOR_THEME = Object.freeze({ [THEME.CHAIN]: PHASE.FIELD, [THEME.BLOOM]: PHASE.FIELD, [THEME.HIJACK]: PHASE.BOSS });
const LABELS = Object.freeze({ [THEME.CHAIN]: 'CHAIN', [THEME.BLOOM]: 'BLOOM', [THEME.HIJACK]: 'HIJACK' });

const required = selector => {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Showcase element missing: ${selector}`);
  return element;
};

export function simulationStepCount(speed, focused = false) {
  const safeSpeed = speed === 3 ? 3 : 1;
  return safeSpeed === 3 && focused ? 1 : safeSpeed;
}

export class DeveloperShowcase {
  constructor({ input, assets, options, seed, onExit }) {
    this.input = input; this.assets = assets; this.options = options; this.seed = seed; this.onExit = onExit;
    this.root = required('#showcase');
    this.directDraft = required('#dev-direct-draft');
    this.directChoices = required('#dev-direct-choices');
    this.speedButton = required('#dev-speed');
    this.bind();
    this.resetSession();
  }

  resetSession() {
    this.manualTheme = THEME.CHAIN;
    this.manualSpeed = 1;
    this.manualStates = Object.fromEntries(Object.values(THEME).map(id => [id, createThemeState(id)]));
    this.manualStages = Object.fromEntries(Object.values(THEME).map(id => [id, 1]));
    this.manualLastUpgrades = Object.fromEntries(Object.values(THEME).map(id => [id, null]));
    this.manualSlot = this.createSlot('manual', this.manualTheme, false, required('#dev-manual-canvas'));
    this.autoSlots = [
      this.createSlot('auto-chain', THEME.CHAIN, true, required('#dev-chain-canvas')),
      this.createSlot('auto-bloom', THEME.BLOOM, true, required('#dev-bloom-canvas')),
      this.createSlot('auto-hijack', THEME.HIJACK, true, required('#dev-hijack-canvas'))
    ];
  }

  bind() {
    required('#dev-exit').addEventListener('click', () => this.onExit());
    this.speedButton.addEventListener('click', () => this.toggleSpeed());
    for (const button of Array.from(document.querySelectorAll('[data-dev-theme]'))) {
      button.addEventListener('click', () => this.switchTheme(button.getAttribute('data-dev-theme')));
    }
  }

  enter() {
    this.resetSession();
    this.root.classList.remove('hidden');
    this.input.attachCanvas(required('#dev-manual-canvas'));
    this.input.setGameplayEnabled(true);
    this.input.resetAttack();
    this.refreshControls();
  }

  exit() {
    this.root.classList.add('hidden'); this.directDraft.classList.add('hidden');
  }

  createSlot(id, themeId, automatic, canvas) {
    const seed = (this.seed + id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) >>> 0;
    const rng = new SeededRng(seed);
    const themeState = automatic ? this.createPresetState(themeId) : this.manualStates[themeId];
    const botProfile = automatic ? botAiProfileForStage(themeId, 1) : null;
    const slot = { id, themeId, automatic, stage: 1, rng, themeState, world: null, renderer: new CanvasRenderer(canvas, this.assets), bot: automatic ? new AutoplayController(rng, .15, botProfile.id) : null, lastUpgrade: automatic ? PRESETS[themeId] : null };
    slot.world = this.createWorld(slot);
    return slot;
  }

  createPresetState(themeId) {
    const state = createThemeState(themeId);
    const definition = UPGRADE_CATALOG.find(item => item.id === PRESETS[themeId]);
    if (!definition) throw new Error(`Missing showcase preset for ${themeId}`);
    applyUpgrade(state, definition); state.level = 1;
    return state;
  }

  createWorld(slot) {
    return new CombatWorld({
      themeId: slot.themeId, phase: PHASE_FOR_THEME[slot.themeId], stage: slot.stage,
      themeState: slot.themeState, rng: new SeededRng(slot.rng.int(1, 0xffffffff)),
      options: this.options, dodgeChance: 0
    });
  }

  switchTheme(themeId) {
    if (!Object.values(THEME).includes(themeId) || themeId === this.manualTheme) return;
    this.directDraft.classList.add('hidden');
    this.manualTheme = themeId;
    this.manualSlot.themeId = themeId;
    this.manualSlot.themeState = this.manualStates[themeId];
    this.manualSlot.stage = this.manualStages[themeId];
    this.manualSlot.lastUpgrade = this.manualLastUpgrades[themeId];
    this.manualSlot.world = this.createWorld(this.manualSlot);
    this.refreshControls();
  }

  toggleSpeed() { this.manualSpeed = this.manualSpeed === 1 ? 3 : 1; this.refreshControls(); }

  fixedUpdate(dt) {
    const world = this.manualSlot.world;
    const directInput = this.input.snapshot(world.player, { shiftFocus: this.manualSpeed === 3 });
    if (directInput.speedTogglePressed) this.toggleSpeed();
    const focused = this.manualSpeed === 3 && directInput.focusDown;
    world.player.hitR = this.manualSpeed === 3 ? 6 : world.player.r;
    world.player.opacity = this.manualSpeed === 3 && !focused ? .55 : 1;
    world.player.focusVisible = focused;
    this.root.setAttribute('data-direct-speed', String(this.manualSpeed));
    this.root.setAttribute('data-direct-focused', String(focused));
    this.root.setAttribute('data-direct-hit-radius', String(world.player.hitR));
    if (this.directDraft.classList.contains('hidden')) {
      const steps = simulationStepCount(this.manualSpeed, focused);
      for (let index = 0; index < steps; index++) {
        const stepInput = index === 0 ? directInput : { ...directInput, harvestPressed: false, parryPressed: false, dashPressed: false, speedTogglePressed: false };
        const events = world.update(dt, stepInput);
        if (this.handleManualEvents(events)) break;
      }
    }
    for (const slot of this.autoSlots) {
      for (let index = 0; index < simulationStepCount(3); index++) {
        const events = slot.world.update(dt, slot.bot.snapshot(slot.world, dt));
        if (this.handleAutoEvents(slot, events)) break;
      }
    }
  }

  handleManualEvents(events) {
    const terminal = events.find(event => ['fieldComplete', 'bossCleared', 'runEnded'].includes(event.type));
    if (terminal) {
      if (terminal.type === 'runEnded') {
        this.manualStates[this.manualTheme] = createThemeState(this.manualTheme);
        this.manualLastUpgrades[this.manualTheme] = null; this.manualStages[this.manualTheme] = 1;
        this.manualSlot.themeState = this.manualStates[this.manualTheme]; this.manualSlot.lastUpgrade = null; this.manualSlot.stage = 1;
      } else {
        this.manualSlot.stage++; this.manualStages[this.manualTheme] = this.manualSlot.stage;
      }
      this.manualSlot.world = this.createWorld(this.manualSlot);
      return true;
    }
    if (events.some(event => event.type === 'choiceRequested')) {
      this.showDirectChoice(); return true;
    }
    return false;
  }

  handleAutoEvents(slot, events) {
    const terminal = events.find(event => ['fieldComplete', 'bossCleared', 'runEnded'].includes(event.type));
    for (const event of events) {
      if (event.type !== 'choiceRequested' || terminal) continue;
      const choices = new ChoiceDirector(slot.rng).makeOffer(slot.themeState);
      const choice = slot.bot.chooseUpgrade(choices, slot.world);
      applyUpgrade(slot.themeState, choice); slot.lastUpgrade = choice.id; slot.world.choiceResolved();
    }
    if (terminal) {
      if (terminal.type !== 'runEnded') slot.stage++;
      slot.bot.useProfile(botAiProfileForStage(slot.themeId, slot.stage).id);
      slot.world = this.createWorld(slot);
      return true;
    }
    return false;
  }

  showDirectChoice() {
    const choices = new ChoiceDirector(this.manualSlot.rng).makeOffer(this.manualSlot.themeState);
    this.directChoices.replaceChildren(...choices.map(choice => {
      const button = document.createElement('button'); button.className = 'dev-choice';
      button.innerHTML = `<strong>${choice.title}</strong><span>${choice.description}</span>`;
      button.addEventListener('click', () => {
        applyUpgrade(this.manualSlot.themeState, choice); this.manualSlot.lastUpgrade = choice.id; this.manualLastUpgrades[this.manualTheme] = choice.id;
        this.manualSlot.world.choiceResolved(); this.directDraft.classList.add('hidden');
      });
      return button;
    }));
    this.directDraft.classList.remove('hidden');
  }

  render() {
    this.manualSlot.renderer.render(this.manualSlot.world, this.input.pointer);
    for (const slot of this.autoSlots) slot.renderer.render(slot.world);
    this.updateHud(this.manualSlot);
    for (const slot of this.autoSlots) this.updateHud(slot);
  }

  updateHud(slot) {
    const hud = slot.world.hud();
    const node = required(`[data-dev-hud="${slot.id}"]`);
    const speed = slot.automatic ? '3× AUTO' : `${this.manualSpeed}× DIRECT`;
    const botState = slot.bot ? ` · ${slot.bot.status()} · MISS ${Math.round(slot.bot.missRatio() * 100)}%` : '';
    const build = slot.lastUpgrade ? ` · ${slot.lastUpgrade}` : '';
    node.textContent = `${speed} · ${LABELS[slot.themeId]} S${slot.stage} LV ${slot.themeState.level} · ${hud.timer} · ${hud.health} · ${hud.score}${botState}${build}`;
    const detail = document.querySelector(`[data-dev-ai="${slot.id}"]`);
    if (detail && slot.bot) {
      const identity = slot.bot.identity();
      detail.textContent = `BOT ${identity.name} [${identity.temperament}] · FOE ${hud.enemyAi}`;
    }
  }

  refreshControls() {
    this.speedButton.textContent = `DIRECT SPEED ${this.manualSpeed}× (T)`;
    for (const button of Array.from(document.querySelectorAll('[data-dev-theme]'))) button.classList.toggle('selected', button.getAttribute('data-dev-theme') === this.manualTheme);
  }
}

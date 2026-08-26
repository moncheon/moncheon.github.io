// @ts-check

import { parseRuntimeOptions, SCENE } from './config.js';
import { AssetLoader } from './engine/AssetLoader.js';
import { GameLoop } from './engine/GameLoop.js';
import { InputController } from './engine/InputController.js';
import { SceneStateMachine } from './engine/SceneStateMachine.js';
import { GameApp } from './app/GameApp.js';
import { ThemeRegistry } from './game/ThemeRegistry.js';
import { RunSession } from './game/RunSession.js';
import { StorageRepository } from './infra/StorageRepository.js';
import { CanvasRenderer } from './render/CanvasRenderer.js';
import { DomUi } from './ui/DomUi.js';
import { DeveloperShowcase } from './dev/DeveloperShowcase.js';

const canvas = document.querySelector('#game');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Game canvas is missing');

const options = parseRuntimeOptions(location.search);
const repository = new StorageRepository();
const session = new RunSession(repository, repository.loadProfile(), repository.loadCampaign());
const scenes = new SceneStateMachine(SCENE.TITLE);
const ui = new DomUi();
const assets = new AssetLoader();
const renderer = new CanvasRenderer(canvas, assets);
const input = new InputController(canvas, enabled => ui.showToast(`AUTO ATTACK ${enabled ? 'ON' : 'OFF'}`));
let app;
const loop = new GameLoop(dt => app.fixedUpdate(dt), dt => app.render(dt), options.speed);
const showcase = new DeveloperShowcase({ input, assets, options: { ...options, speed: 1 }, seed: options.seed, onExit: () => app.exitShowcase() });
app = new GameApp({ options, session, scenes, input, renderer, ui, loop, assets, themes: new ThemeRegistry(), showcase });

await app.initialize();
Object.defineProperty(window, '__GAME_APP__', { value: app, configurable: true });

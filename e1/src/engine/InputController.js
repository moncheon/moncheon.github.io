// @ts-check

import { WORLD_HEIGHT, WORLD_WIDTH } from '../config.js';
import { normalize } from '../domain/math.js';

export class InputController {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {(enabled: boolean) => void} [onAttackToggle]
   */
  constructor(canvas, onAttackToggle) {
    this.canvas = canvas;
    this.onAttackToggle = onAttackToggle ?? (() => {});
    this.keys = new Set();
    this.pressed = new Set();
    this.attackEnabled = false;
    this.gameplayEnabled = false;
    this.pointer = { x: WORLD_WIDTH * .75, y: WORLD_HEIGHT / 2 };
    this.lastAim = { x: 1, y: 0 };
    this.bound = {
      keydown: event => this.onKeyDown(event),
      keyup: event => this.onKeyUp(event),
      blur: () => this.keys.clear(),
      pointermove: event => this.onPointerMove(event),
      pointerdown: event => { event.preventDefault(); },
      contextmenu: event => event.preventDefault()
    };
    document.addEventListener('keydown', this.bound.keydown, true);
    document.addEventListener('keyup', this.bound.keyup, true);
    window.addEventListener('blur', this.bound.blur);
    document.addEventListener('contextmenu', this.bound.contextmenu);
    this.attachCanvas(canvas);
  }

  attachCanvas(canvas) {
    this.canvas?.removeEventListener?.('pointermove', this.bound.pointermove);
    this.canvas?.removeEventListener?.('pointerdown', this.bound.pointerdown);
    this.canvas = canvas;
    canvas.addEventListener('pointermove', this.bound.pointermove);
    canvas.addEventListener('pointerdown', this.bound.pointerdown);
  }

  setGameplayEnabled(enabled) { this.gameplayEnabled = Boolean(enabled); }
  resetAttack() { this.attackEnabled = false; this.onAttackToggle(false); }

  onKeyDown(event) {
    const code = event.code || (event.key?.length === 1 ? `Key${event.key.toUpperCase()}` : event.key);
    const fresh = !this.keys.has(code);
    if (fresh) this.pressed.add(code);
    this.keys.add(code);
    if (['Space', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) event.preventDefault();
    if (this.gameplayEnabled && fresh && (code === 'KeyF' || event.key?.toLowerCase() === 'f')) {
      event.preventDefault();
      this.attackEnabled = !this.attackEnabled;
      this.onAttackToggle(this.attackEnabled);
    }
  }

  onKeyUp(event) {
    const code = event.code || (event.key?.length === 1 ? `Key${event.key.toUpperCase()}` : event.key);
    this.keys.delete(code);
  }

  onPointerMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = Math.max(0, Math.min(WORLD_WIDTH, (event.clientX - rect.left) * WORLD_WIDTH / rect.width));
    this.pointer.y = Math.max(0, Math.min(WORLD_HEIGHT, (event.clientY - rect.top) * WORLD_HEIGHT / rect.height));
  }

  snapshot(player, options = {}) {
    const aim = normalize(this.pointer.x - player.x, this.pointer.y - player.y, this.lastAim);
    this.lastAim = aim;
    return Object.freeze({
      moveX: Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')),
      moveY: Number(this.keys.has('KeyS')) - Number(this.keys.has('KeyW')),
      aim,
      attack: this.attackEnabled,
      harvestDown: this.keys.has('KeyQ'),
      harvestPressed: this.pressed.has('KeyQ'),
      parryDown: this.keys.has('KeyE'),
      parryPressed: this.pressed.has('KeyE'),
      focusDown: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
      speedTogglePressed: this.pressed.has('KeyT'),
      dashPressed: this.pressed.has('Space') || (!options.shiftFocus && (this.pressed.has('ShiftLeft') || this.pressed.has('ShiftRight')))
    });
  }

  endFrame() { this.pressed.clear(); }
}

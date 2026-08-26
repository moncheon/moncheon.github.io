// @ts-check

import { SCENE } from '../config.js';

const ALLOWED = Object.freeze({
  [SCENE.TITLE]: [SCENE.PLAYING, SCENE.DRAFT],
  [SCENE.PLAYING]: [SCENE.DRAFT, SCENE.PAUSED, SCENE.TRANSITION, SCENE.ENDED],
  [SCENE.DRAFT]: [SCENE.PLAYING, SCENE.TRANSITION, SCENE.ENDED],
  [SCENE.PAUSED]: [SCENE.PLAYING, SCENE.ENDED],
  [SCENE.TRANSITION]: [SCENE.PLAYING, SCENE.DRAFT, SCENE.ENDED],
  [SCENE.ENDED]: [SCENE.PLAYING, SCENE.DRAFT, SCENE.TITLE]
});

export class SceneStateMachine {
  constructor(initial = SCENE.TITLE) { this.current = initial; }
  is(scene) { return this.current === scene; }
  transition(next) {
    if (next === this.current) return this.current;
    if (!ALLOWED[this.current]?.includes(next)) throw new Error(`Invalid scene transition: ${this.current} -> ${next}`);
    this.current = next;
    return this.current;
  }
}

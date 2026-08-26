// @ts-check

import { FIXED_STEP, MAX_STEPS_PER_FRAME } from '../config.js';

export class GameLoop {
  constructor(update, render, speed = 1) {
    this.update = update;
    this.render = render;
    this.speed = speed;
    this.last = performance.now();
    this.accumulator = 0;
    this.running = false;
    this.frame = now => this.tick(now);
  }
  start() { if (!this.running) { this.running = true; requestAnimationFrame(this.frame); } }
  tick(now) {
    if (!this.running) return;
    const realDt = Math.min(.05, (now - this.last) / 1000);
    this.last = now;
    this.accumulator += realDt * this.speed;
    let steps = 0;
    while (this.accumulator >= FIXED_STEP && steps++ < MAX_STEPS_PER_FRAME) {
      this.update(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
    }
    this.render(realDt);
    requestAnimationFrame(this.frame);
  }
}

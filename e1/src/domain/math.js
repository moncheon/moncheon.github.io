// @ts-check

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const distanceSq = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
export const circleHit = (a, b) => distanceSq(a, b) <= (a.r + b.r) ** 2;

export function normalize(x, y, fallback = { x: 1, y: 0 }) {
  const magnitude = Math.hypot(x, y);
  return magnitude > .0001 ? { x: x / magnitude, y: y / magnitude } : { ...fallback };
}

export function segmentCircleHit(start, end, circle, radius) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq ? clamp(((circle.x - start.x) * dx + (circle.y - start.y) * dy) / lengthSq, 0, 1) : 0;
  const x = start.x + dx * t;
  const y = start.y + dy * t;
  return (x - circle.x) ** 2 + (y - circle.y) ** 2 <= radius ** 2;
}

export class SeededRng {
  constructor(seed = Date.now()) { this.seed = (Number(seed) >>> 0) || 0x9e3779b9; }
  next() {
    let t = this.seed += 0x6d2b79f5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  range(min, max) { return min + (max - min) * this.next(); }
  int(min, maxInclusive) { return Math.floor(this.range(min, maxInclusive + 1)); }
  pick(items) { return items[Math.floor(this.next() * items.length)]; }
  shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index--) {
      const target = this.int(0, index);
      [copy[index], copy[target]] = [copy[target], copy[index]];
    }
    return copy;
  }
}

export class EventBudget {
  constructor(perFrame = 700, maxDepth = 7) { this.perFrame = perFrame; this.maxDepth = maxDepth; this.used = 0; }
  reset() { this.used = 0; }
  allow(depth = 0, cost = 1) {
    if (depth > this.maxDepth || this.used + cost > this.perFrame) return false;
    this.used += cost;
    return true;
  }
}

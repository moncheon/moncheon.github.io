// @ts-check

export class FieldPacingDirector {
  constructor(rng, stage = 1) {
    this.rng = rng;
    this.stage = Math.max(1, stage);
    this.spawnTimer = 0;
    this.surgeIn = this.rng.range(7.5, 16.5);
    this.burstRemaining = 0;
    this.runnersRemaining = 0;
    this.burstTimer = 0;
    this.recovery = 0;
    this.burstsStarted = 0;
    this.recoveriesStarted = 0;
  }

  update(dt, enemyCount) {
    const requests = [];
    if (enemyCount >= 120) return requests;
    if (this.recovery > 0) {
      this.recovery -= dt;
      return requests;
    }
    if (this.burstRemaining > 0) {
      this.burstTimer -= dt;
      while (this.burstTimer <= 0 && this.burstRemaining > 0 && enemyCount + requests.length < 120) {
        const runner = this.runnersRemaining > 0;
        requests.push({ runner, source: 'surge' });
        this.burstRemaining--;
        if (runner) this.runnersRemaining--;
        this.burstTimer += .12;
      }
      if (this.burstRemaining === 0) {
        this.recovery = this.rng.range(3.75, 6);
        this.recoveriesStarted++;
        this.surgeIn = this.rng.range(7.5, 16.5);
      }
      return requests;
    }

    this.surgeIn -= dt;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      requests.push({ runner: false, source: 'drift' });
      const stageRate = Math.min(1.65, 1 + (this.stage - 1) * .045);
      this.spawnTimer = Math.max(.42, this.rng.range(.675, .975) / stageRate);
    }
    if (this.surgeIn <= 0) {
      this.burstRemaining = this.rng.int(3, 5);
      this.runnersRemaining = this.rng.int(1, Math.min(2, this.burstRemaining));
      this.burstTimer = 0;
      this.burstsStarted++;
    }
    return requests;
  }

  snapshot() {
    return { burstsStarted: this.burstsStarted, recoveriesStarted: this.recoveriesStarted, recovery: this.recovery, burstRemaining: this.burstRemaining };
  }
}

export class BossPacingDirector {
  constructor(rng, stage = 1) {
    this.rng = rng;
    this.stage = Math.max(1, stage);
    this.beatsRemaining = this.rng.int(2, 3);
    this.recoveriesStarted = 0;
  }

  nextPattern(baseCount) {
    const fastCount = this.rng.next() < .32 ? this.rng.int(1, Math.min(2, baseCount)) : 0;
    this.beatsRemaining--;
    let nextDelay;
    if (this.beatsRemaining <= 0) {
      nextDelay = this.rng.range(2.5, 4);
      this.beatsRemaining = this.rng.int(2, 3);
      this.recoveriesStarted++;
    } else {
      nextDelay = Math.max(.72, this.rng.range(.9, 1.3) - (this.stage - 1) * .015);
    }
    return { count: baseCount, fastCount, nextDelay };
  }
}

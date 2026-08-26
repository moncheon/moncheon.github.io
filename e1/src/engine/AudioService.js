// @ts-check

const TONES = Object.freeze({ shoot: [180, .018], parry: [740, .08], hurt: [90, .11], dash: [360, .045], transition: [520, .18] });

export class AudioService {
  constructor() { this.context = null; this.muted = false; }

  async unlock() {
    if (!this.context) {
      const AudioContextClass = window.AudioContext;
      if (AudioContextClass) this.context = new AudioContextClass();
    }
    if (this.context?.state === 'suspended') await this.context.resume();
  }

  toggleMuted() { this.muted = !this.muted; return this.muted; }

  play(kind) {
    if (this.muted || !this.context || !TONES[kind]) return;
    const [frequency, duration] = TONES[kind];
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = kind === 'hurt' ? 'sawtooth' : 'square';
    gain.gain.setValueAtTime(.035, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, this.context.currentTime + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(); oscillator.stop(this.context.currentTime + duration);
  }
}

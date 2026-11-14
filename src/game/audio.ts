import { WeaponId } from './types';

class GameAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicInterval: number | null = null;
  private soundVol = 0.75;
  private musicVol = 0.45;
  private inCombat = false;
  private inBoss = false;
  private stepIndex = 0;

  public init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.9;
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.soundVol;
    this.sfxGain.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVol;
    this.musicGain.connect(this.masterGain);

    this.startMusicLoop();
  }

  public setVolumes(sound: number, music: number) {
    this.soundVol = Math.max(0, Math.min(1, sound));
    this.musicVol = Math.max(0, Math.min(1, music));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.soundVol, this.ctx.currentTime, 0.05);
    }
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicVol, this.ctx.currentTime, 0.1);
    }
  }

  public setCombatIntensity(combat: boolean, boss: boolean) {
    this.inCombat = combat;
    this.inBoss = boss;
  }

  private startMusicLoop() {
    if (this.musicInterval !== null) return;
    // Dorian / Phrygian Greek war-theme pulse every 420ms
    const scale = [110, 116.54, 138.59, 146.83, 164.81, 174.61, 207.65, 220]; // A Phrygian dominant
    this.musicInterval = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || this.ctx.state !== 'running' || this.musicVol <= 0.01) return;
      const now = this.ctx.currentTime;
      const step = this.stepIndex % 16;
      this.stepIndex++;

      // Deep war drum on beats
      if (this.inBoss || this.inCombat) {
        if (step % 4 === 0 || (this.inBoss && step % 2 === 0 && step % 4 !== 2)) {
          this.synthDrum(now, this.inBoss ? 0.28 : 0.16);
        }
      } else if (step % 8 === 0) {
        this.synthDrum(now, 0.09);
      }

      // Low brass/choir drone every 4 steps
      if (step % 4 === 0) {
        const idx = step === 0 ? 0 : step === 4 ? 1 : step === 8 ? 3 : 4;
        const freq = scale[idx] * (this.inBoss ? 0.5 : 0.5);
        this.synthPad(now, freq, 1.5, this.inBoss ? 0.14 : 0.08);
      }

      // Heroic horn motif during boss fight
      if (this.inBoss && (step === 0 || step === 3 || step === 6 || step === 10 || step === 12)) {
        const motif = [0, 1, 4, 3, 1];
        const note = scale[motif[step % motif.length]] * 1.0;
        this.synthBrass(now, note, 0.45, 0.11);
      }
    }, 360);
  }

  private synthDrum(time: number, gainVal: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(115, time);
    osc.frequency.exponentialRampToValueAtTime(36, time + 0.22);
    g.gain.setValueAtTime(gainVal, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.3);
  }

  private synthPad(time: number, freq: number, dur: number, gainVal: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, time);
    g.gain.setValueAtTime(0.001, time);
    g.gain.linearRampToValueAtTime(gainVal, time + 0.25);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  private synthBrass(time: number, freq: number, dur: number, gainVal: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, time);
    filter.frequency.exponentialRampToValueAtTime(350, time + dur);
    g.gain.setValueAtTime(0.001, time);
    g.gain.linearRampToValueAtTime(gainVal, time + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  private playNoiseBurst(duration: number, filterFreq: number, q: number, gainVal: number, highpass = false) {
    if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
    const len = Math.floor(this.ctx.sampleRate * duration);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.4));
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = highpass ? 'highpass' : 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = q;
    const g = this.ctx.createGain();
    const now = this.ctx.currentTime;
    g.gain.setValueAtTime(gainVal, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    src.start(now);
  }

  public playSwing(weapon: WeaponId, heavy = false) {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    if (weapon === 'blades') {
      // Metallic chain whip whoosh
      this.playNoiseBurst(heavy ? 0.24 : 0.15, heavy ? 1100 : 1800, 1.5, heavy ? 0.45 : 0.3, false);
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(heavy ? 480 : 720, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + (heavy ? 0.22 : 0.12));
      g.gain.setValueAtTime(0.14, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (weapon === 'hammer') {
      this.playNoiseBurst(0.28, 420, 0.9, 0.45, false);
    } else {
      // Lightning spear crackle whoosh
      this.playNoiseBurst(0.16, 2400, 2.2, 0.35, true);
    }
  }

  public playImpact(heavy = false) {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // Heavy thud + metallic crunch
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(heavy ? 180 : 240, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + (heavy ? 0.22 : 0.12));
    g.gain.setValueAtTime(heavy ? 0.55 : 0.35, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.24 : 0.13));
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);

    this.playNoiseBurst(heavy ? 0.16 : 0.09, heavy ? 1400 : 2200, 1.2, heavy ? 0.45 : 0.28, false);
  }

  public playParry() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [980, 1480, 2210].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0.22 / (i + 1), now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.48);
    });
  }

  public playDodge() {
    this.init();
    this.playNoiseBurst(0.16, 750, 0.8, 0.24, false);
  }

  public playJump() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.12);
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playFootstep() {
    if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
    this.playNoiseBurst(0.05, 320, 1.0, 0.08, false);
  }

  public playExplosion() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.55);
    g.gain.setValueAtTime(0.5, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.62);
    this.playNoiseBurst(0.55, 450, 0.7, 0.55, false);
  }

  public playLightning() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    this.playNoiseBurst(0.32, 3200, 1.8, 0.45, true);
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.25);
    g.gain.setValueAtTime(0.25, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playBossRoar() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc2.type = 'square';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.9);
    osc2.frequency.setValueAtTime(98, now);
    osc2.frequency.exponentialRampToValueAtTime(41, now + 0.9);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(460, now);
    g.gain.setValueAtTime(0.01, now);
    g.gain.linearRampToValueAtTime(0.42, now + 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc2.start(now);
    osc.stop(now + 1.0);
    osc2.stop(now + 1.0);
  }

  public playPuzzleChime() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [330, 440, 554.37, 659.25].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      g.gain.setValueAtTime(0.2, now + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.45);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.5);
    });
  }

  public playChestOpen() {
    this.playPuzzleChime();
  }

  public playMenuClick() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.06);
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playCinematicSting(intense = false) {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const freqs = intense ? [73.42, 110, 146.83] : [98, 146.83, 196];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(intense ? 780 : 520, now);
      filter.frequency.exponentialRampToValueAtTime(180, now + 1.4);
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.14 / (idx + 1), now + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.45);
      osc.connect(filter);
      filter.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 1.5);
    });
  }

  public playVoiceCadence(role: 'hero' | 'oracle' | 'boss', volume: number) {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const baseFreq = role === 'hero' ? 92 : role === 'oracle' ? 235 : 58;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = role === 'oracle' ? 'triangle' : 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.linearRampToValueAtTime(baseFreq * 0.85, now + 0.45);
    filter.type = 'bandpass';
    filter.frequency.value = role === 'oracle' ? 680 : 320;
    filter.Q.value = 3.2;
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.07 * volume, now + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.52);
  }

  public dispose() {
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export const gameAudio = new GameAudioEngine();

import type { Microphone } from "./microphone";
import type { WaveSimulation } from "./wave-simulation";

export interface RippleMapperOptions {
  // Frequency band ranges (as fraction of total bins)
  bassEnd?: number; // Default: 0.1 (first 10% of bins)
  midEnd?: number; // Default: 0.4 (10-40% of bins)
  // Treble is everything above midEnd

  // Thresholds for triggering ripples (0-1)
  bassThreshold?: number;
  midThreshold?: number;
  trebleThreshold?: number;

  // Amplitude multipliers
  bassAmplitude?: number;
  midAmplitude?: number;
  trebleAmplitude?: number;

  // Ripple radius (normalized, 0-1)
  bassRadius?: number;
  midRadius?: number;
  trebleRadius?: number;

  // Volume influence (how much volume affects amplitude)
  volumeInfluence?: number;
}

export class AudioRippleMapper {
  private microphone: Microphone;
  private waveSimulation: WaveSimulation;

  // Smoothed values for stability
  private smoothBass: number = 0;
  private smoothMid: number = 0;
  private smoothTreble: number = 0;
  private smoothVolume: number = 0;
  private smoothingFactor: number = 0.3;

  // Configuration
  bassEnd: number;
  midEnd: number;
  bassThreshold: number;
  midThreshold: number;
  trebleThreshold: number;
  bassAmplitude: number;
  midAmplitude: number;
  trebleAmplitude: number;
  bassRadius: number;
  midRadius: number;
  trebleRadius: number;
  volumeInfluence: number;

  // Frame counter for rate limiting
  private frameCount: number = 0;

  constructor(
    microphone: Microphone,
    waveSimulation: WaveSimulation,
    options: RippleMapperOptions = {}
  ) {
    this.microphone = microphone;
    this.waveSimulation = waveSimulation;

    // Frequency ranges
    this.bassEnd = options.bassEnd ?? 0.1;
    this.midEnd = options.midEnd ?? 0.4;

    // Thresholds
    this.bassThreshold = options.bassThreshold ?? 0.3;
    this.midThreshold = options.midThreshold ?? 0.2;
    this.trebleThreshold = options.trebleThreshold ?? 0.15;

    // Amplitudes
    this.bassAmplitude = options.bassAmplitude ?? 1.5;
    this.midAmplitude = options.midAmplitude ?? 0.8;
    this.trebleAmplitude = options.trebleAmplitude ?? 0.3;

    // Radii (normalized)
    this.bassRadius = options.bassRadius ?? 0.15;
    this.midRadius = options.midRadius ?? 0.06;
    this.trebleRadius = options.trebleRadius ?? 0.02;

    // Volume influence
    this.volumeInfluence = options.volumeInfluence ?? 0.7;
  }

  /**
   * Analyze audio and inject ripples into the wave simulation
   */
  update(): void {
    this.frameCount++;

    const samples = this.microphone.samples;
    const volume = this.microphone.volume;
    const numBins = samples.length;

    // Calculate frequency band energies
    const bassEndIdx = Math.floor(numBins * this.bassEnd);
    const midEndIdx = Math.floor(numBins * this.midEnd);

    let bassSum = 0;
    let midSum = 0;
    let trebleSum = 0;

    for (let i = 0; i < bassEndIdx; i++) {
      bassSum += samples[i];
    }
    for (let i = bassEndIdx; i < midEndIdx; i++) {
      midSum += samples[i];
    }
    for (let i = midEndIdx; i < numBins; i++) {
      trebleSum += samples[i];
    }

    const bass = bassSum / bassEndIdx;
    const mid = midSum / (midEndIdx - bassEndIdx);
    const treble = trebleSum / (numBins - midEndIdx);

    // Smooth values
    this.smoothBass += (bass - this.smoothBass) * this.smoothingFactor;
    this.smoothMid += (mid - this.smoothMid) * this.smoothingFactor;
    this.smoothTreble += (treble - this.smoothTreble) * this.smoothingFactor;
    this.smoothVolume += (volume - this.smoothVolume) * this.smoothingFactor;

    // Volume multiplier (0.3 to 1.7 range based on volume)
    const volumeMult =
      1.0 + (this.smoothVolume * 2 - 0.5) * this.volumeInfluence;

    // Inject bass ripples (center-ish, large, slow injection rate)
    if (this.smoothBass > this.bassThreshold && this.frameCount % 3 === 0) {
      const x = 0.4 + Math.random() * 0.2;
      const y = 0.4 + Math.random() * 0.2;
      const amp = this.smoothBass * this.bassAmplitude * volumeMult;
      this.waveSimulation.injectRippleNormalized(x, y, amp, this.bassRadius);
    }

    // Inject mid ripples (random positions, medium size)
    if (this.smoothMid > this.midThreshold && this.frameCount % 2 === 0) {
      const count = Math.ceil(this.smoothMid * 3);
      for (let i = 0; i < count; i++) {
        const x = 0.1 + Math.random() * 0.8;
        const y = 0.1 + Math.random() * 0.8;
        const amp = this.smoothMid * this.midAmplitude * volumeMult * 0.7;
        this.waveSimulation.injectRippleNormalized(x, y, amp, this.midRadius);
      }
    }

    // Inject treble ripples (many small ones across surface)
    if (this.smoothTreble > this.trebleThreshold) {
      const count = Math.ceil(this.smoothTreble * 8);
      for (let i = 0; i < count; i++) {
        const x = Math.random();
        const y = Math.random();
        const amp = this.smoothTreble * this.trebleAmplitude * volumeMult * 0.5;
        this.waveSimulation.injectRippleNormalized(x, y, amp, this.trebleRadius);
      }
    }
  }

  // Getters for current smoothed values (useful for debugging/display)
  get currentBass(): number {
    return this.smoothBass;
  }
  get currentMid(): number {
    return this.smoothMid;
  }
  get currentTreble(): number {
    return this.smoothTreble;
  }
  get currentVolume(): number {
    return this.smoothVolume;
  }
}

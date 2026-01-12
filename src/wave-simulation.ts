/**
 * 2D Wave Simulation using the wave equation
 * Uses double-buffering for stable computation
 */
export class WaveSimulation {
  readonly resolution: number;
  private current: Float32Array;
  private previous: Float32Array;
  private velocity: Float32Array;

  // Simulation parameters
  waveSpeed: number = 0.5;
  damping: number = 0.99;

  constructor(resolution: number = 256) {
    this.resolution = resolution;
    const size = resolution * resolution;
    this.current = new Float32Array(size);
    this.previous = new Float32Array(size);
    this.velocity = new Float32Array(size);
  }

  /**
   * Inject a ripple at the specified grid position
   * @param x Grid x position (0 to resolution-1)
   * @param y Grid y position (0 to resolution-1)
   * @param amplitude Height of the ripple
   * @param radius Radius of the ripple in grid units
   */
  injectRipple(x: number, y: number, amplitude: number, radius: number): void {
    const r2 = radius * radius;

    const minX = Math.max(0, Math.floor(x - radius));
    const maxX = Math.min(this.resolution - 1, Math.ceil(x + radius));
    const minY = Math.max(0, Math.floor(y - radius));
    const maxY = Math.min(this.resolution - 1, Math.ceil(y + radius));

    for (let iy = minY; iy <= maxY; iy++) {
      for (let ix = minX; ix <= maxX; ix++) {
        const dx = ix - x;
        const dy = iy - y;
        const dist2 = dx * dx + dy * dy;

        if (dist2 < r2) {
          // Smooth falloff using cosine
          const dist = Math.sqrt(dist2);
          const factor = 0.5 * (1 + Math.cos((Math.PI * dist) / radius));
          const index = iy * this.resolution + ix;
          this.current[index] += amplitude * factor;
        }
      }
    }
  }

  /**
   * Inject a ripple using normalized coordinates (0-1)
   */
  injectRippleNormalized(
    nx: number,
    ny: number,
    amplitude: number,
    radiusNormalized: number
  ): void {
    const x = nx * (this.resolution - 1);
    const y = ny * (this.resolution - 1);
    const radius = radiusNormalized * this.resolution;
    this.injectRipple(x, y, amplitude, radius);
  }

  /**
   * Step the simulation forward one frame
   */
  update(): void {
    const res = this.resolution;
    const c2 = this.waveSpeed * this.waveSpeed;

    for (let y = 1; y < res - 1; y++) {
      for (let x = 1; x < res - 1; x++) {
        const idx = y * res + x;

        // Sample neighbors
        const left = this.current[idx - 1];
        const right = this.current[idx + 1];
        const up = this.current[idx - res];
        const down = this.current[idx + res];
        const center = this.current[idx];

        // Laplacian (discrete second derivative)
        const laplacian = left + right + up + down - 4 * center;

        // Wave equation: acceleration = c² * laplacian
        this.velocity[idx] += c2 * laplacian;
        this.velocity[idx] *= this.damping;
      }
    }

    // Apply velocity to heights
    for (let i = 0; i < this.current.length; i++) {
      this.previous[i] = this.current[i];
      this.current[i] += this.velocity[i];
    }

    // Boundary conditions (fixed edges)
    for (let i = 0; i < res; i++) {
      this.current[i] = 0; // Top edge
      this.current[(res - 1) * res + i] = 0; // Bottom edge
      this.current[i * res] = 0; // Left edge
      this.current[i * res + (res - 1)] = 0; // Right edge
    }
  }

  /**
   * Get the current height data for rendering
   */
  getHeightData(): Float32Array {
    return this.current;
  }

  /**
   * Reset the simulation
   */
  reset(): void {
    this.current.fill(0);
    this.previous.fill(0);
    this.velocity.fill(0);
  }
}

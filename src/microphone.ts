export class Microphone {
  private readonly fftSize: number;
  public initialized: boolean;
  private audioContext!: AudioContext;
  private microphone!: MediaStreamAudioSourceNode;
  private analyser!: AnalyserNode;
  private dataArray!: Uint8Array<ArrayBuffer>;

  constructor(fftSize: number) {
    this.fftSize = fftSize;
    this.initialized = false;
  }

  static async create(fftSize: number): Promise<Microphone> {
    const instance = new Microphone(fftSize);
    await instance.init(); // Async operation happens here
    return instance;
  }

  private async init(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.handleStream(stream);
      this.initialized = true;
      console.info("Microphone initialized");
    } catch (err) {
      console.error("Microphone initialization failed:", err);
      throw err;
    }
  }

  private handleStream(stream: MediaStream): void {
    this.audioContext = new AudioContext();
    this.microphone = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
    this.microphone.connect(this.analyser);
  }

  // can change to get samples() ??
  get samples(): number[] {
    this.analyser.getByteTimeDomainData(this.dataArray);
    const normSamples = [...this.dataArray].map((e) => e / 128 - 1);
    return normSamples;
  }

  // can change to get volume() ??
  get volume(): number {
    this.analyser.getByteTimeDomainData(this.dataArray);
    const normSamples = [...this.dataArray].map((e) => e / 128 - 1);
    let sum = 0;
    for (const element of normSamples) {
      sum += element * element;
    }
    const volume = Math.sqrt(sum / normSamples.length);
    return volume;
  }

  get frequencyData(): Uint8Array {
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  get averageFrequency(): number {
    this.analyser.getByteFrequencyData(this.dataArray);
    const sum = this.dataArray.reduce((acc, val) => acc + val, 0);
    return sum / this.dataArray.length;
  }
}

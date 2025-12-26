export class Microphone {
  private fftSize: number;
  public initialized: boolean = false;
  private audioContext?: AudioContext;
  private microphone?: MediaStreamAudioSourceNode;
  private analyser?: AnalyserNode;
  private dataArray?: Uint8Array;

  constructor(fftSize: number) {
    this.fftSize = fftSize;
    this.init();
  }

  private init(): void {
    const media = navigator.mediaDevices;
    media
      .getUserMedia({ audio: true })
      .then((stream) => {
        this.handleStream(stream);
        this.initialized = true;
        console.info("Microphone initialized");
      })
      .catch((err) => {
        console.error("Microphone initialization failed:", err);
        alert("Microphone access failed. Please check your permissions.");
      });
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

  get samples(): number[] {
    if (!this.analyser || !this.dataArray) {
      return [];
    }
    this.analyser.getByteTimeDomainData(this.dataArray);
    let normSamples = [...this.dataArray].map((e) => e / 128 - 1);
    return normSamples;
  }

  getVolume(): number {
    if (!this.analyser || !this.dataArray) {
      return 0;
    }
    this.analyser.getByteTimeDomainData(this.dataArray);
    let normSamples = [...this.dataArray].map((e) => e / 128 - 1);
    let sum = 0;
    for (let i = 0; i < normSamples.length; i++) {
      sum += normSamples[i] * normSamples[i];
    }
    let volume = Math.sqrt(sum / normSamples.length);
    return volume;
  }
}


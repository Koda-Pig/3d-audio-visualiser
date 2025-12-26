export class Microphone {
  constructor(fftSize) {
    // Fast Fourier Transform - used by web audio api,
    // to slice raw stream data into a specific amount of audio samples
    this.fftSize = fftSize;
    this.initialized = false;
    this.init(fftSize);
  }
  init() {
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
  handleStream(stream) {
    this.audioContext = new AudioContext();
    this.microphone = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
    this.microphone.connect(this.analyser);
  }
  get samples() {
    this.analyser.getByteTimeDomainData(this.dataArray);
    let normSamples = [...this.dataArray].map((e) => e / 128 - 1);
    return normSamples;
  }
  getVolume() {
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

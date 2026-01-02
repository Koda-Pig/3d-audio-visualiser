import { Microphone } from "./microphone";
import { FFT_SIZE } from "./constants";

function handleFullscreenClick() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
}

export function setupUi(
  startBtn: HTMLButtonElement,
  fullscreenBtn: HTMLButtonElement,
  onMicrophoneReady: (microphone: Microphone) => void
) {
  let isHidden = false;
  async function handleStartClick() {
    isHidden = !isHidden;
    startBtn.classList.toggle("hide");

    const userConfirmed = confirm(
      "This application needs access to your microphone to visualize audio. Do you grant permission?"
    );

    if (!userConfirmed) {
      alert("Microphone access is needed to use this application.");
      return;
    }

    const microphone = await Microphone.create(FFT_SIZE);
    onMicrophoneReady(microphone); // Pass it back to main script
  }

  startBtn.addEventListener("click", handleStartClick);
  fullscreenBtn.addEventListener("click", handleFullscreenClick);
}

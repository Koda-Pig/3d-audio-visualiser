import { Microphone } from "./microphone";

let fftSize = 512;

export function setupUi(
  element: HTMLButtonElement,
  onMicrophoneReady: (microphone: Microphone) => void
) {
  let isHidden = false;
  async function handleBtnClick() {
    isHidden = !isHidden;
    element.classList.toggle("hide");

    const userConfirmed = confirm(
      "This application needs access to your microphone to visualize audio. Do you grant permission?"
    );

    if (!userConfirmed) {
      alert("Microphone access is needed to use this application.");
      return;
    }

    const microphone = await Microphone.create(fftSize);
    onMicrophoneReady(microphone); // Pass it back to main script
  }
  element.addEventListener("click", handleBtnClick);
}

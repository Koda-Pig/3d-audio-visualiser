import { Bar } from "./bar.js";
import { Microphone } from "./microphone.js";
import "./style.scss";

const startBtn = document.querySelector("#start-btn");
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const moth = document.querySelector("#moth");
const mothGradient = moth.querySelector("#gradient");
const mothGradientStops = mothGradient.querySelectorAll("stop");
const fullscreenWrapper = document.querySelector("#fullscreen-wrapper");
const fullscreenBtn = document.querySelector("#fullscreen-btn");
const fullscreenArrow = document.querySelector("#fullscreen-arrow");
const colorRanges = Array.from(document.querySelectorAll("input[type=range]"));
const colorInputs = Array.from(document.querySelectorAll("input[type=color]"));
const windowWidth = window.innerWidth;
const windowHeight = window.innerHeight;
canvas.width = windowWidth;
canvas.height = windowHeight;

let userColorSet = [255, 255, 255];
let softVolume = 0;
let timeoutID;
let fftSize = 512;
let barsLeft = [];
let barsRight = [];
let cursorTimeout = 3000;
let wakeLock = null;

const colorTemplate = (color1, color2, color3) => {
  return `rgb(${color1}, ${color2} , ${color3})`;
};

const createBars = () => {
  for (let i = 1; i < fftSize / 1.9; i++) {
    let color = colorTemplate(0, i * 0.6, Math.random() * 200);
    barsLeft.push(new Bar(0, i * 1.5, 1.4, 1, color, i));
    barsRight.push(new Bar(0, i * 1.5, 1.4, 1, color, i));
  }
};

const animate = (microphone) => {
  if (!microphone.initialized) {
    requestAnimationFrame(() => animate(microphone));
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const samples = microphone.samples;
  const volume = microphone.getVolume();

  Array.from(["left", "right"]).forEach((wing, i) => {
    let isLeft = wing === "left";
    ctx.save();
    if (isLeft) {
      ctx.translate(canvas.width / 2 + 21, canvas.height / 2 - 120);
      ctx.scale(1, 1);
    }
    if (!isLeft) {
      ctx.translate(canvas.width / 2 - 21, canvas.height / 2 - 120);
      ctx.scale(-1, 1);
    }
    ctx.rotate(1.7);
    barsLeft.forEach((bar, i) => {
      bar.update(samples[i]);
      bar.draw(ctx, windowHeight);
    });
    ctx.restore();
  });

  softVolume = (softVolume * 0.1 + volume * 0.1).toFixed(4);
  moth.style.scale = 0.82 + softVolume * 3;

  requestAnimationFrame(() => animate(microphone));
};

const changeWingColors = (colorArray) => {
  Array.from([...barsLeft, ...barsRight]).forEach((bar, index) => {
    bar.color = colorTemplate(
      colorArray[0],
      index * colorArray[1],
      Math.random() * colorArray[2]
    );
  });
};

const changeMothColors = (e, index) => {
  mothGradientStops[index].setAttribute("stop-color", e.target.value);
};

const hideCursor = () => {
  document.body.classList.add("hide-cursor");
};

const resetCursorHideTimer = () => {
  clearTimeout(timeoutID); // Clear the existing timeout
  document.body.classList.remove("hide-cursor"); // Show the cursor
  timeoutID = setTimeout(hideCursor, cursorTimeout); // Reset the timer to hide the cursor again
};

const requestWakeLock = async () => {
  try {
    wakeLock = await navigator.wakeLock.request("screen");
  } catch (error) {
    console.error("Failed to activate screen wakeLock:", error);
  }
};

const handleVisibilityChange = () => {
  if (wakeLock === null) return;

  if (document.visibilityState === "visible") {
    requestWakeLock();
  } else {
    wakeLock
      .release()
      .then(() => console.info("Screen wakeLock released"))
      .catch((error) =>
        console.error("Failed to release screen wakeLock:", error)
      );
    wakeLock = null;
  }
};

const startListening = () => {
  const userConfirmed = confirm(
    "This application needs access to your microphone to visualize audio. Do you grant permission?"
  );

  if (!userConfirmed) {
    alert("Microphone access is needed to use this application.");
    return;
  }

  const microphone = new Microphone(fftSize);

  createBars();
  animate(microphone);

  timeoutID = setTimeout(hideCursor, cursorTimeout);
};

startBtn.addEventListener("click", (e) => {
  startListening();
  e.target.classList.add("hide");
});

window.addEventListener("mousemove", resetCursorHideTimer);

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// Add event listener for arrow to show fullscreen button
fullscreenArrow.addEventListener("click", () =>
  fullscreenWrapper.classList.toggle("show")
);

colorRanges.forEach((input, index) => {
  input.addEventListener("change", (e) => {
    userColorSet[index] = +e.target.value;
    changeWingColors(userColorSet);
  });
});

colorInputs.forEach((input, index) => {
  input.addEventListener("change", (e) => {
    changeMothColors(e, index);
  });
});

fullscreenBtn.addEventListener("click", () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
});

// Keep screen from going to sleep
// Check if the wakeLock API is supported by the browser
if ("wakeLock" in navigator) {
  requestWakeLock();

  document.addEventListener("visibilitychange", () => {
    handleVisibilityChange();
  });
} else {
  console.warn("The wakeLock API is not supported by this browser.");
}

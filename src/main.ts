import "./style.css";
import * as THREE from "three";
import {
  EffectComposer,
  RenderPass,
  UnrealBloomPass,
  OutputPass
} from "three/examples/jsm/Addons.js";
import { setupUi } from "./ui.ts";
import type { Microphone } from "./microphone.ts";
import { GUI } from "lil-gui";

const renderer = new THREE.WebGLRenderer({ antialias: true });
let microphone: Microphone | null = null;
let mouseX = 0;
let mouseY = 0;
let smoothBass = 0;
let smoothMid = 0;
let smoothTreble = 0;
let wakeLock: null | WakeLockSentinel = null;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderScene = new RenderPass(scene, camera);

const THRESHOLD = 1;
const STRENGTH = 0.1;
const RADIUS = 0.8;
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  STRENGTH,
  RADIUS,
  THRESHOLD
);

const params = {
  red: 0.25,
  green: 0.25,
  blue: 1,
  threshold: THRESHOLD,
  strength: 0.4,
  radius: 0.8,
  rotationSpeed: 0.02
};

const outputPass = new OutputPass();
const bloomComposer = new EffectComposer(renderer);

bloomComposer.addPass(renderScene);
bloomComposer.addPass(bloomPass);
bloomComposer.addPass(outputPass);

// Sets orbit control to move the camera around.
// const orbit = new OrbitControls(camera, renderer.domElement);
// orbit.update(); // Has to be done everytime we update the camera position.

// Camera positioning.
camera.position.set(6, 8, 14);

const uniforms = {
  u_time: { value: 0 },
  u_frequency: { value: 0 },
  u_bass: { value: 0 },
  u_mid: { value: 0 },
  u_treble: { value: 0 },
  u_red: { value: params.red },
  u_green: { value: params.green },
  u_blue: { value: params.blue }
};

const material = new THREE.ShaderMaterial({
  wireframe: true,
  uniforms,
  vertexShader: document.getElementById("vertexshader")!.textContent,
  fragmentShader: document.getElementById("fragmentshader")!.textContent
});
const sphere = new THREE.IcosahedronGeometry(4, 30);
const mesh = new THREE.Mesh(sphere, material);
scene.add(mesh);

const clock = new THREE.Clock();

const gui = new GUI();
const colorsFolder = gui.addFolder("Colors");
const bloomFolder = gui.addFolder("Bloom");
const rotationFolder = gui.addFolder("Rotation");

colorsFolder
  .add(params, "red", 0, 1)
  .onChange((value: string) => (uniforms.u_red.value = Number(value)));
colorsFolder
  .add(params, "green", 0, 1)
  .onChange((value: string) => (uniforms.u_green.value = Number(value)));
colorsFolder
  .add(params, "blue", 0, 1)
  .onChange((value: string) => (uniforms.u_blue.value = Number(value)));
bloomFolder
  .add(params, "threshold", 0, 1)
  .onChange((value: string) => (bloomPass.threshold = Number(value)));
bloomFolder
  .add(params, "strength", 0, 3)
  .onChange((value: string) => (bloomPass.strength = Number(value)));
bloomFolder
  .add(params, "radius", 0, 1)
  .onChange((value: string) => (bloomPass.radius = Number(value)));

rotationFolder.add(params, "rotationSpeed", 0, 1);

const getAverage = (data: Uint8Array, index1: number, index2: number) =>
  data.slice(index1, index2).reduce((a, b) => a + b) / (index2 - index1);

const smooth = (current: number, target: number, factor: number): number =>
  current + (target - current) * factor;

async function requestWakeLock() {
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    console.info("WakeLock initialised.");
  } catch (error) {
    console.error("Failed to activate screen wakeLock:", error);
  }
}

function handleVisibilityChange() {
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
}

function animate() {
  if (microphone) {
    uniforms.u_frequency.value = microphone.averageFrequency;

    const freqData = microphone.frequencyData;

    const bass = getAverage(freqData, 0, 10);
    const mid = getAverage(freqData, 10, 50);
    const treble = getAverage(freqData, 50, 100);

    // smooth it out
    smoothBass = smooth(smoothBass, bass, 0.5); // making this 2 looks sick, but makes it change too quick
    smoothMid = smooth(smoothMid, mid, 0.5); // making this 2 looks sick, but makes it change too quick
    smoothTreble = smooth(smoothTreble, treble, 0.5); // making this 2 looks sick, but makes it change too quick

    uniforms.u_bass.value = smoothBass;
    uniforms.u_mid.value = smoothMid;
    uniforms.u_treble.value = smoothTreble;
  }

  camera.position.x += (mouseX - camera.position.x) * 0.05;
  camera.position.y += (mouseY - camera.position.y) * 0.05;
  camera.lookAt(scene.position);

  mesh.rotation.y += (params.rotationSpeed * Math.PI) / 180; // Convert degrees to radians

  uniforms.u_time.value = clock.getElapsedTime();
  bloomComposer.render();
}

// might need to move this inside the function below
renderer.setAnimationLoop(animate);
setupUi(
  document.querySelector<HTMLButtonElement>("#start-btn")!,
  document.querySelector<HTMLButtonElement>("#fullscreen-btn")!,
  (mic) => {
    microphone = mic;
    if ("wakeLock" in navigator) {
      requestWakeLock();
    } else {
      console.warn("The wakeLock API is not supported by this browser.");
    }
  }
);

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  bloomComposer.setSize(window.innerWidth, window.innerHeight);
});

document.addEventListener("mousemove", (e) => {
  mouseX = (e.clientX - window.innerWidth / 2) / 100;
  mouseY = (e.clientY - window.innerHeight / 2) / 100;
});

if ("wakeLock" in navigator) {
  document.addEventListener("visibilitychange", handleVisibilityChange);
}

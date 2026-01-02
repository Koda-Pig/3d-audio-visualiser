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

const FFT_SIZE: AnalyserNode["fftSize"] = 512;

const renderer = new THREE.WebGLRenderer({ antialias: true });
let microphone: Microphone | null = null;
let mouseX = 0;
let mouseY = 0;
let orbitalAngle = 0;
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

const THRESHOLD = 0;
const STRENGTH = 0.3;
const RADIUS = 0.1;
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  STRENGTH,
  RADIUS,
  THRESHOLD
);

const params = {
  red: 0,
  green: 0,
  blue: 0,
  threshold: THRESHOLD,
  strength: STRENGTH,
  radius: RADIUS,
  rotationSpeed: 0.02,
  mode: "nested", // "nested" || "orbiting"
  orbitalRadius: 3,
  orbitalSpeed: 0.5,
  sphere1Size: 4,
  sphere2Size: 2,
  sampleIntensity: 8,
  sampleAmplification: 1.5,
  sampleSmoothing: 0.1,
  sampleDecay: 0.02
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

// Calculate sample count based on fftSize (frequencyBinCount = fftSize / 2)
const SAMPLE_COUNT = FFT_SIZE / 2;

// Store smoothed samples for smoothing between frames
let smoothedSamples: Float32Array | null = null;

// Create DataTexture for time-domain samples
// Use RGBA format to pack samples (4 samples per pixel for better compatibility)
// Map [-1, 1] range to [0, 255] for UnsignedByteType
const textureWidth = Math.ceil(SAMPLE_COUNT / 4);
const sampleDataArray = new Uint8Array(textureWidth * 4);
const sampleTexture = new THREE.DataTexture(
  sampleDataArray,
  textureWidth,
  1,
  THREE.RGBAFormat,
  THREE.UnsignedByteType
);
sampleTexture.needsUpdate = true;

const baseUniforms = {
  u_time: { value: 0 },
  u_samples: { value: sampleTexture },
  u_sampleCount: { value: SAMPLE_COUNT },
  u_textureWidth: { value: textureWidth },
  u_sampleIntensity: { value: params.sampleIntensity },
  u_sampleAmplification: { value: params.sampleAmplification },
  u_red: { value: params.red },
  u_green: { value: params.green },
  u_blue: { value: params.blue }
};
const uniforms1 = {
  ...baseUniforms,
  u_is_secondary: { value: 0 }
};
const uniforms2 = {
  ...baseUniforms,
  u_is_secondary: { value: 1 }
};

function createSphere(radius: number, material: THREE.ShaderMaterial) {
  const sphere = new THREE.IcosahedronGeometry(radius, 30);
  return new THREE.Mesh(sphere, material);
}

const material1 = new THREE.ShaderMaterial({
  wireframe: true,
  uniforms: uniforms1,
  vertexShader: document.getElementById("vertexshader")!.textContent,
  fragmentShader: document.getElementById("fragmentshader")!.textContent
});
const material2 = new THREE.ShaderMaterial({
  wireframe: true,
  uniforms: uniforms2,
  vertexShader: document.getElementById("vertexshader")!.textContent,
  fragmentShader: document.getElementById("fragmentshader")!.textContent
});
const sphere1 = createSphere(params.sphere1Size, material1);
const sphere2 = createSphere(params.sphere2Size, material2);
scene.add(sphere1);
scene.add(sphere2);
const SPHERE1_BASE_RADIUS = params.sphere1Size;
const SPHERE2_BASE_RADIUS = params.sphere2Size;

const clock = new THREE.Clock();

const gui = new GUI();
const bloomFolder = gui.addFolder("Bloom");
const rotationFolder = gui.addFolder("Rotation");
const modeFolder = gui.addFolder("Mode");

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
modeFolder
  .add(params, "mode", ["nested", "orbiting"])
  .onChange((value: string) => {
    if (value === "nested") {
      // set sphere 1 to large size, sphere 2 to small size
      params.sphere1Size = 4;
      params.sphere2Size = 2;
    } else {
      // set sphere 1 and 2 to same size
      params.sphere1Size = 3;
      params.sphere2Size = 3;
    }
    // Update the sphere scales directly
    sphere1.scale.setScalar(params.sphere1Size / SPHERE1_BASE_RADIUS);
    sphere2.scale.setScalar(params.sphere2Size / SPHERE2_BASE_RADIUS);
  });
modeFolder.add(params, "orbitalRadius", 1, 6).name("Orbital Radius");
modeFolder.add(params, "orbitalSpeed", 0, 9).name("Orbital Speed");
modeFolder
  .add(params, "sphere1Size", 0.5, 8)
  .name("Sphere 1 Size")
  .onChange((value: number) => {
    sphere1.scale.setScalar(value / SPHERE1_BASE_RADIUS);
  });

modeFolder
  .add(params, "sphere2Size", 0.5, 8)
  .name("Sphere 2 Size")
  .onChange((value: number) => {
    sphere2.scale.setScalar(value / SPHERE2_BASE_RADIUS);
  });

const samplesFolder = gui.addFolder("Samples");
samplesFolder.add(params, "sampleIntensity", 0, 30).name("Intensity");
samplesFolder.add(params, "sampleAmplification", 0.5, 5).name("Amplification");
samplesFolder.add(params, "sampleDecay", 0.001, 0.1).name("Decay Rate");

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
    // Get time-domain samples
    const samples = microphone.samples;

    // Initialize smoothed array on first frame
    if (!smoothedSamples) {
      smoothedSamples = new Float32Array(
        Math.min(samples.length, SAMPLE_COUNT)
      );
      for (let i = 0; i < smoothedSamples.length; i++) {
        smoothedSamples[i] = samples[i];
      }
    }

    // Apply envelope follower pattern (like example project)
    // Fast attack when increasing, slow decay when decreasing
    const decayRate = params.sampleDecay;
    for (let i = 0; i < Math.min(samples.length, SAMPLE_COUNT); i++) {
      // Use absolute value for envelope (magnitude, not waveform)
      const sampleMagnitude = Math.abs(samples[i]);

      // Fast attack: if new value is greater, jump to it immediately
      if (sampleMagnitude > smoothedSamples[i]) {
        smoothedSamples[i] = sampleMagnitude;
      } else {
        // Slow decay: decrease by decay rate (exponential decay)
        smoothedSamples[i] = smoothedSamples[i] * (1 - decayRate);
      }
    }

    // Copy smoothed samples to texture data array
    // Pack samples into RGBA format: map [-1, 1] to [0, 255]
    for (let i = 0; i < Math.min(smoothedSamples.length, SAMPLE_COUNT); i++) {
      const pixelIndex = Math.floor(i / 4);
      const channelIndex = i % 4;
      const normalizedValue = (smoothedSamples[i] + 1) * 0.5; // Map [-1, 1] to [0, 1]
      sampleDataArray[pixelIndex * 4 + channelIndex] = Math.floor(
        normalizedValue * 255
      );
    }
    sampleTexture.needsUpdate = true;

    [uniforms1, uniforms2].forEach((uniforms) => {
      uniforms.u_sampleIntensity.value = params.sampleIntensity;
      uniforms.u_sampleAmplification.value = params.sampleAmplification;
    });
  }

  camera.position.x += (mouseX - camera.position.x) * 0.05;
  camera.position.y += (mouseY - camera.position.y) * 0.05;
  camera.lookAt(scene.position);

  sphere1.rotation.y += (params.rotationSpeed * Math.PI) / 180; // Convert degrees to radians
  sphere2.rotation.y -= (params.rotationSpeed * Math.PI) / 180; // Convert degrees to radians

  // Mode-specific animation logic
  if (params.mode === "nested") {
    // Nested mode: rotate spheres around their own centers
    sphere1.position.set(0, 0, 0);
    sphere2.position.set(0, 0, 0);
  } else if (params.mode === "orbiting") {
    // Orbiting mode: spheres orbit around center
    orbitalAngle += params.orbitalSpeed * 0.01; // Adjust speed multiplier as needed

    const angle1 = orbitalAngle;
    const angle2 = orbitalAngle + Math.PI; // Opposite side

    sphere1.position.x = params.orbitalRadius * Math.cos(angle1);
    sphere1.position.z = params.orbitalRadius * Math.sin(angle1);
    sphere1.position.y = 0;

    sphere2.position.x = params.orbitalRadius * Math.cos(angle2);
    sphere2.position.z = params.orbitalRadius * Math.sin(angle2);
    sphere2.position.y = 0;
  }

  [uniforms1, uniforms2].forEach((uniforms) => {
    uniforms.u_time.value = clock.getElapsedTime();
  });
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

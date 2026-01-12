import "./style.css";
import "./wakelock";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GUI } from "lil-gui";
import { setupUi } from "./ui";
import type { Microphone } from "./microphone";
import { WaveSimulation } from "./wave-simulation";
import { WaterMaterial } from "./water-material";
import { AudioRippleMapper } from "./audio-ripple-mapper";

// Configuration
const WATER_SIZE = 100;
const SIMULATION_RESOLUTION = 256;

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 40, 60);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 20;
controls.maxDistance = 150;
controls.maxPolarAngle = Math.PI / 2.1; // Prevent going below water
controls.target.set(0, 0, 0);

// Wave simulation
const waveSimulation = new WaveSimulation(SIMULATION_RESOLUTION);

// Water material
const waterMaterial = new WaterMaterial({
  resolution: SIMULATION_RESOLUTION,
  heightScale: 5.0,
  waterColorDeep: new THREE.Color(0x001a33),
  waterColorShallow: new THREE.Color(0x006994),
  skyColorHorizon: new THREE.Color(0x4a6fa5),
  skyColorZenith: new THREE.Color(0x1a1a2e),
  sunDirection: new THREE.Vector3(0.5, 0.8, 0.3).normalize(),
  sunColor: new THREE.Color(0xffffee),
  sunIntensity: 1.2,
  fresnelPower: 2.5,
  specularPower: 256,
});

// Water plane geometry
const waterGeometry = new THREE.PlaneGeometry(
  WATER_SIZE,
  WATER_SIZE,
  SIMULATION_RESOLUTION - 1,
  SIMULATION_RESOLUTION - 1
);
waterGeometry.rotateX(-Math.PI / 2); // Make horizontal

const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
scene.add(waterMesh);

// Audio integration
let microphone: Microphone | null = null;
let audioRippleMapper: AudioRippleMapper | null = null;

// GUI setup
const gui = new GUI({ title: "Water Controls" });
gui.close();

const simFolder = gui.addFolder("Simulation");
simFolder.add(waveSimulation, "waveSpeed", 0.1, 1.0, 0.01).name("Wave Speed");
simFolder.add(waveSimulation, "damping", 0.9, 0.999, 0.001).name("Damping");
simFolder.add(waterMaterial, "heightScale", 1, 15, 0.5).name("Height Scale");

const waterFolder = gui.addFolder("Water");
waterFolder.add(waterMaterial, "fresnelPower", 0.5, 5, 0.1).name("Fresnel");
waterFolder.add(waterMaterial, "sunIntensity", 0, 3, 0.1).name("Sun Intensity");
waterFolder.addColor({ color: "#001a33" }, "color").name("Deep Color").onChange((v: string) => {
  waterMaterial.waterColorDeep.set(v);
});
waterFolder.addColor({ color: "#006994" }, "color").name("Shallow Color").onChange((v: string) => {
  waterMaterial.waterColorShallow.set(v);
});

// Audio sensitivity folder (populated when microphone is ready)
let audioFolder: GUI | null = null;

function setupAudioGui(mapper: AudioRippleMapper) {
  audioFolder = gui.addFolder("Audio Sensitivity");
  audioFolder.add(mapper, "bassThreshold", 0, 1, 0.05).name("Bass Threshold");
  audioFolder.add(mapper, "midThreshold", 0, 1, 0.05).name("Mid Threshold");
  audioFolder.add(mapper, "trebleThreshold", 0, 1, 0.05).name("Treble Threshold");
  audioFolder.add(mapper, "bassAmplitude", 0, 5, 0.1).name("Bass Amplitude");
  audioFolder.add(mapper, "midAmplitude", 0, 3, 0.1).name("Mid Amplitude");
  audioFolder.add(mapper, "trebleAmplitude", 0, 1, 0.05).name("Treble Amplitude");
  audioFolder.add(mapper, "volumeInfluence", 0, 1, 0.05).name("Volume Influence");
}

// Handle microphone ready
function onMicrophoneReady(mic: Microphone) {
  microphone = mic;
  audioRippleMapper = new AudioRippleMapper(microphone, waveSimulation, {
    bassThreshold: 0.25,
    midThreshold: 0.15,
    trebleThreshold: 0.1,
    bassAmplitude: 2.0,
    midAmplitude: 1.0,
    trebleAmplitude: 0.4,
    bassRadius: 0.12,
    midRadius: 0.05,
    trebleRadius: 0.015,
    volumeInfluence: 0.6,
  });
  setupAudioGui(audioRippleMapper);
  gui.open();
}

// Setup UI
const startBtn = document.getElementById("start-btn") as HTMLButtonElement;
const fullscreenBtn = document.getElementById("fullscreen-btn") as HTMLButtonElement;
setupUi(startBtn, fullscreenBtn, onMicrophoneReady);

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Update audio-driven ripples
  if (audioRippleMapper) {
    audioRippleMapper.update();
  }

  // Step wave simulation
  waveSimulation.update();

  // Update shader with new height data
  waterMaterial.updateHeightMap(waveSimulation.getHeightData());

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);
}

animate();

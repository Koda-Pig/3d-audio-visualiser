import "./style.css";
import "./wakelock";
import * as THREE from "three";
import { GUI } from "lil-gui";
import { setupUi } from "./ui";
import type { Microphone } from "./microphone";
import { FFT_SIZE } from "./constants";

let microphone: Microphone | null = null;
let smoothBass = 0;
let smoothMid = 0;
let smoothTreble = 0;
let smoothBrightness = 0;

// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75, // FOV
  window.innerWidth / window.innerHeight, // Aspect ratio
  0.1, // Near clipping plane
  1000 // Far clipping plane
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Position camera
camera.position.z = 5;

const params = {
  red: 0.5,
  green: 0.3,
  blue: 1
};

const uniforms = {
  u_time: { value: 0 },
  u_samples: { value: new Float32Array(FFT_SIZE) },
  u_sample_count: { value: FFT_SIZE },
  u_red: { value: params.red },
  u_green: { value: params.green },
  u_blue: { value: params.blue },
  u_bass: { value: 0 },
  u_mid: { value: 0 },
  u_treble: { value: 0 },
  u_smooth_brightness: { value: 0 }
};

const getAverage = (data: Uint8Array, index1: number, index2: number) =>
  data.slice(index1, index2).reduce((a, b) => a + b) / (index2 - index1);

const smooth = (current: number, target: number, factor: number): number =>
  current + (target - current) * factor;

const geometry = new THREE.IcosahedronGeometry(2, 20);
const material = new THREE.ShaderMaterial({
  wireframe: true,
  uniforms: uniforms,
  vertexShader: `
    uniform float u_time;
    uniform float u_samples[${FFT_SIZE}];
    uniform float u_sample_count;
    varying float vDisplacement;

    void main() {
      // Convert position to spherical coordinates
      vec3 normalizedPos = normalize(position);
      
      // Calculate elevation angle (phi) - from 0 at top to π at bottom
      float phi = acos(normalizedPos.y); // Range: 0 to π
      float normalizedPhi = phi / 3.14159; // Normalize phi to 0-1
      
      // Map to frequency bin index
      int sampleIndex = int(normalizedPhi * (u_sample_count - 1.0));
      sampleIndex = clamp(sampleIndex, 0, int(u_sample_count - 1.0));
      
      // Get displacement from frequency data
      float displacement = u_samples[sampleIndex] * 0.5;
      vDisplacement = displacement;
      
      vec3 newPosition = position + normal * displacement;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }`,
  fragmentShader: `
    uniform float u_bass;
    uniform float u_mid;
    uniform float u_treble;
    uniform float u_smooth_brightness;
    
    varying float vDisplacement;
  
    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }
  
    void main() {
      float bassIntensity = u_bass / 255.0;
      float midIntensity = u_mid / 255.0;
      float trebleIntensity = u_treble / 255.0;
  
      // Base hue from audio
      float baseHue = mod(bassIntensity * 0.5 + midIntensity * 0.3, 1.0);
      
      // Add MORE displacement variation for visible color shifts
      float hue = mod(baseHue + vDisplacement * 2.0, 1.0); // Changed from 0.2 to 2.0!
  
      float saturation = 0.7 + midIntensity * 0.3;
      
      // Fix brightness - make it much more responsive!
      float value = 0.3 + (u_smooth_brightness / 255.0) * 0.5; // Changed significantly!
      
      vec3 color = hsv2rgb(vec3(hue, saturation, value));
      gl_FragColor = vec4(color, 1.0);
    }`
});
const sphere = new THREE.Mesh(geometry, material);
const clock = new THREE.Clock();
scene.add(sphere);

const gui = new GUI();
const colorsFolder = gui.addFolder("Colors");
colorsFolder.add(params, "red", 0, 1).onChange((value: string) => {
  uniforms.u_red.value = Number(value);
});
colorsFolder.add(params, "green", 0, 1).onChange((value: string) => {
  uniforms.u_green.value = Number(value);
});
colorsFolder.add(params, "blue", 0, 1).onChange((value: string) => {
  uniforms.u_blue.value = Number(value);
});

setupUi(
  document.querySelector<HTMLButtonElement>("#start-btn")!,
  document.querySelector<HTMLButtonElement>("#fullscreen-btn")!,
  (mic) => (microphone = mic)
);

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  sphere.rotation.x += 0.0005;
  sphere.rotation.y += 0.0005;
  renderer.render(scene, camera);

  if (microphone) {
    const samples = microphone.samples;
    const freqData = microphone.frequencyData;

    const bass = getAverage(freqData, 0, 10);
    const mid = getAverage(freqData, 10, 50);
    const treble = getAverage(freqData, 50, 100);
    const rawBrightness = bass + treble;

    // Smooth the values
    smoothBass = smooth(smoothBass, bass, 0.5);
    smoothMid = smooth(smoothMid, mid, 0.5);
    smoothTreble = smooth(smoothTreble, treble, 0.5);
    smoothBrightness = smooth(smoothBrightness, rawBrightness, 0.1);

    uniforms.u_samples.value = new Float32Array(samples);
    uniforms.u_bass.value = smoothBass;
    uniforms.u_mid.value = smoothMid;
    uniforms.u_treble.value = smoothTreble;
    uniforms.u_smooth_brightness.value = smoothBrightness;
  }
  uniforms.u_time.value = clock.getElapsedTime();
}
animate();

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

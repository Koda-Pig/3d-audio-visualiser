import "./style.css";
import "./wakelock";
import * as THREE from "three";
import { GUI } from "lil-gui";
import { setupUi } from "./ui";
import type { Microphone } from "./microphone";
import { FFT_SIZE } from "./constants";

let microphone: Microphone | null = null;

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
  u_blue: { value: params.blue }
};

const geometry = new THREE.IcosahedronGeometry(2, 20);
const material = new THREE.ShaderMaterial({
  wireframe: true,
  uniforms: uniforms,
  vertexShader: `
    uniform float u_time;
    uniform float u_samples[${FFT_SIZE}];
    uniform float u_sample_count;

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
      
      vec3 newPosition = position + normal * displacement;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }`,
  fragmentShader: `
    uniform float u_red;
    uniform float u_blue;
    uniform float u_green;
    void main() {
      gl_FragColor = vec4(vec3(u_red, u_green, u_blue), 1. );
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
    uniforms.u_samples.value = new Float32Array(samples);
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

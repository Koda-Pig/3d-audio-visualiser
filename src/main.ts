import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/Addons.js";
import { RenderPass } from "three/examples/jsm/Addons.js";
import { UnrealBloomPass } from "three/examples/jsm/Addons.js";
import { OutputPass } from "three/examples/jsm/Addons.js";
import { setupUi } from "./ui.ts";
import type { Microphone } from "./microphone.ts";

const renderer = new THREE.WebGLRenderer({ antialias: true });
let microphone: Microphone | null = null;
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

const THRESHOLD = 0.5;
const STRENGTH = 0.2;
const RADIUS = 0.8;
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  STRENGTH,
  RADIUS,
  THRESHOLD
);

const outputPass = new OutputPass();
const bloomComposer = new EffectComposer(renderer);

bloomComposer.addPass(renderScene);
bloomComposer.addPass(bloomPass);
bloomComposer.addPass(outputPass);

// Sets orbit control to move the camera around.
const orbit = new OrbitControls(camera, renderer.domElement);

// Camera positioning.
camera.position.set(6, 8, 14);
// Has to be done everytime we update the camera position.
orbit.update();

const uniforms = {
  u_time: { value: 0 },
  u_frequency: { value: 0 }
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

// let currentScale = 1;
// const lerpFactor = 0.1; // Lower = smoother

function animate() {
  if (microphone) {
    uniforms.u_frequency.value = microphone.averageFrequency;
  }

  uniforms.u_time.value = clock.getElapsedTime();
  bloomComposer.render();
}

// might need to move this inside the function below
renderer.setAnimationLoop(animate);
setupUi(document.querySelector<HTMLButtonElement>("#start-btn")!, (mic) => {
  microphone = mic;
});

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  bloomComposer.setSize(window.innerWidth, window.innerHeight);
});

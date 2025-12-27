import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { setupUi } from "./ui.ts";
import type { Microphone } from "./microphone.ts";

const renderer = new THREE.WebGLRenderer({ antialias: true });
let microphone: Microphone | null = null;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

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
    // const volume = microphone.volume;
    // const targetScale = 1 + volume * 2;
    // Lerp it like you're werth it
    // currentScale += (targetScale - currentScale) * lerpFactor;
    // mesh.scale.setScalar(currentScale);

    // this is just using one of the samples, but there's a whole bunch
    // that could all be used by different stuff
    uniforms.u_frequency.value = microphone.averageFrequency;
  }

  uniforms.u_time.value = clock.getElapsedTime();
  renderer.render(scene, camera);
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
});

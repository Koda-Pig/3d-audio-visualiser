import "./style.css";
import * as THREE from "three";
import { Microphone } from "./microphone";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);

document.body.appendChild(renderer.domElement);

// Create the main cube
const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
const cubeMaterial = new THREE.MeshBasicMaterial({ 
  color: 0x00ff00,
  wireframe: true 
});
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
scene.add(cube);

camera.position.z = 8;

// Bar configuration
const barsPerFace = 25; // 5x5 grid per face
const totalBars = barsPerFace * 6; // 6 faces
const barSpacing = 0.3;
const barBaseSize = 0.1;
const bars: THREE.Mesh[] = [];
const barBasePositions: THREE.Vector3[] = [];
const barNormals: THREE.Vector3[] = [];
const barHeights: number[] = new Array(totalBars).fill(0);

// Create bars for each face of the cube
function createBarsForFace(
  faceIndex: number,
  normal: THREE.Vector3,
  up: THREE.Vector3,
  right: THREE.Vector3
): void {
  const gridSize = Math.sqrt(barsPerFace); // 5
  const startOffset = -((gridSize - 1) * barSpacing) / 2;

  for (let i = 0; i < barsPerFace; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;

    const x = startOffset + col * barSpacing;
    const y = startOffset + row * barSpacing;

    // Position on the face (base position on cube surface)
    const basePosition = new THREE.Vector3()
      .addScaledVector(normal, 1.01) // Slightly outside cube surface
      .addScaledVector(right, x)
      .addScaledVector(up, y);

    // Create bar geometry (will be scaled in animation)
    const barGeometry = new THREE.BoxGeometry(
      barBaseSize,
      barBaseSize,
      0.1
    );
    const barMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL((faceIndex * 60) / 360, 1, 0.5),
    });
    const bar = new THREE.Mesh(barGeometry, barMaterial);
    bar.position.copy(basePosition);
    // Orient bar to extend outward from face
    bar.lookAt(basePosition.clone().add(normal));
    // Add bar as child of cube so it rotates with the cube
    cube.add(bar);
    bars.push(bar);
    barBasePositions.push(basePosition.clone());
    barNormals.push(normal.clone());
  }
}

// Create bars for all 6 faces
// Front face (+Z)
createBarsForFace(
  0,
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(1, 0, 0)
);
// Back face (-Z)
createBarsForFace(
  1,
  new THREE.Vector3(0, 0, -1),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(-1, 0, 0)
);
// Right face (+X)
createBarsForFace(
  2,
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, 0, -1)
);
// Left face (-X)
createBarsForFace(
  3,
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, 0, 1)
);
// Top face (+Y)
createBarsForFace(
  4,
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, 0, -1),
  new THREE.Vector3(1, 0, 0)
);
// Bottom face (-Y)
createBarsForFace(
  5,
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(1, 0, 0)
);

// Initialize microphone
const fftSize = 512;
let microphone: Microphone | null = null;

// Start button handler
function startListening(): void {
  const userConfirmed = confirm(
    "This application needs access to your microphone to visualize audio. Do you grant permission?"
  );

  if (!userConfirmed) {
    alert("Microphone access is needed to use this application.");
    return;
  }

  microphone = new Microphone(fftSize);
  startButton.style.display = "none";
}

// Create start button
const startButton = document.createElement("button");
startButton.textContent = "Start Audio Visualizer";
startButton.style.position = "absolute";
startButton.style.top = "50%";
startButton.style.left = "50%";
startButton.style.transform = "translate(-50%, -50%)";
startButton.style.zIndex = "1000";
startButton.addEventListener("click", startListening);
document.body.appendChild(startButton);

// Animation loop
function animate(): void {
  requestAnimationFrame(animate);

  // Rotate cube
  cube.rotation.x += 0.01;
  cube.rotation.y -= 0.01;

  // Update bars based on microphone input
  if (microphone && microphone.initialized) {
    const samples = microphone.samples;

    for (let i = 0; i < bars.length; i++) {
      // Map sample to bar (cycle through samples)
      const sampleIndex = i % samples.length;
      const micInput = Math.abs(samples[sampleIndex]);

      // Calculate target height (similar to bar.js pattern)
      const sound = micInput * 1.5; // Scaled down for 3D space

      // Update height with smoothing
      if (sound > barHeights[i]) {
        barHeights[i] = sound;
      } else {
        barHeights[i] -= barHeights[i] * 0.01; // Smooth decay
      }

      // Update bar scale and position
      const targetHeight = Math.max(barHeights[i], 0.1); // Minimum height
      bars[i].scale.z = targetHeight;
      
      // Update bar position to extend from cube surface
      // Position = base position + extension along normal
      const extension = barNormals[i].clone().multiplyScalar(targetHeight * 0.5);
      bars[i].position.copy(barBasePositions[i]).add(extension);
    }
  }

  renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();

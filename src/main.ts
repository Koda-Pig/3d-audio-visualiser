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
const barNormals: THREE.Vector3[] = []; // Store normal direction for each bar
const barBasePositions: THREE.Vector3[] = []; // Store base position on cube surface for each bar
const barHeights: number[] = new Array(totalBars).fill(0);

// Configuration parameters
let barSensitivity = 30; // Configurable bar height scaling
let rotationSpeedX = 0.01;
let rotationSpeedY = -0.01;

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
      .addScaledVector(normal, 1.0) // On cube surface (edge of cube)
      .addScaledVector(right, x)
      .addScaledVector(up, y);

    // Create bar geometry - depth is small, will be scaled along z-axis
    // Geometry extends from -0.05 to +0.05 in local z
    // We'll position the bar center so the back edge (-0.05) stays at the cube surface
    const barGeometry = new THREE.BoxGeometry(barBaseSize, barBaseSize, 0.1);
    const barMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL((faceIndex * 60) / 360, 1, 0.5)
    });
    const bar = new THREE.Mesh(barGeometry, barMaterial);
    
    // Store the base position (on cube surface) - this is where the back edge should stay
    // We'll update the bar position in the animation loop to keep the base fixed
    barBasePositions.push(basePosition.clone());
    
    // Initially position bar center at basePosition + normal * 0.05
    // This puts the back edge (-0.05 in local z) at the cube surface
    const initialOffset = normal.clone().multiplyScalar(0.05);
    bar.position.copy(basePosition).add(initialOffset);
    
    // Orient bar so its local z-axis points along the face normal (outward)
    // Use quaternion to rotate z-axis to match normal
    const quaternion = new THREE.Quaternion();
    const defaultZ = new THREE.Vector3(0, 0, 1);
    quaternion.setFromUnitVectors(defaultZ, normal);
    bar.quaternion.copy(quaternion);
    
    // Add bar as child of cube so it rotates with the cube
    cube.add(bar);
    
    // Store the bar and its normal
    bars.push(bar);
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

// Create UI controls container
const controlsContainer = document.createElement("div");
controlsContainer.style.position = "absolute";
controlsContainer.style.top = "20px";
controlsContainer.style.left = "20px";
controlsContainer.style.zIndex = "1000";
controlsContainer.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
controlsContainer.style.padding = "15px";
controlsContainer.style.borderRadius = "8px";
controlsContainer.style.color = "white";
controlsContainer.style.fontFamily = "system-ui, sans-serif";
controlsContainer.style.fontSize = "14px";
controlsContainer.style.display = "none"; // Hidden until microphone is active
document.body.appendChild(controlsContainer);

// Microphone status indicator
const micStatusIndicator = document.createElement("div");
micStatusIndicator.style.marginBottom = "10px";
micStatusIndicator.style.padding = "8px";
micStatusIndicator.style.borderRadius = "4px";
micStatusIndicator.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
micStatusIndicator.style.display = "none";
micStatusIndicator.innerHTML = '<span style="color: #ff4444;">●</span> Microphone: Inactive';
controlsContainer.appendChild(micStatusIndicator);

// Bar sensitivity control
const sensitivityLabel = document.createElement("label");
sensitivityLabel.textContent = "Bar Sensitivity: ";
sensitivityLabel.style.display = "block";
sensitivityLabel.style.marginBottom = "5px";
controlsContainer.appendChild(sensitivityLabel);

const sensitivitySlider = document.createElement("input");
sensitivitySlider.type = "range";
sensitivitySlider.min = "5";
sensitivitySlider.max = "100";
sensitivitySlider.value = barSensitivity.toString();
sensitivitySlider.style.width = "200px";
sensitivitySlider.style.marginBottom = "10px";
sensitivitySlider.addEventListener("input", (e) => {
  barSensitivity = parseFloat((e.target as HTMLInputElement).value);
  sensitivityValue.textContent = barSensitivity.toFixed(0);
});
controlsContainer.appendChild(sensitivitySlider);

const sensitivityValue = document.createElement("span");
sensitivityValue.textContent = barSensitivity.toFixed(0);
sensitivityValue.style.marginLeft = "10px";
sensitivityLabel.appendChild(sensitivityValue);

// Rotation speed control
const rotationLabel = document.createElement("label");
rotationLabel.textContent = "Rotation Speed: ";
rotationLabel.style.display = "block";
rotationLabel.style.marginBottom = "5px";
controlsContainer.appendChild(rotationLabel);

const rotationSlider = document.createElement("input");
rotationSlider.type = "range";
rotationSlider.min = "0";
rotationSlider.max = "50";
rotationSlider.value = "10";
rotationSlider.style.width = "200px";
rotationSlider.addEventListener("input", (e) => {
  const speed = parseFloat((e.target as HTMLInputElement).value) / 1000;
  rotationSpeedX = speed;
  rotationSpeedY = -speed;
  rotationValue.textContent = (speed * 1000).toFixed(1);
});
controlsContainer.appendChild(rotationSlider);

const rotationValue = document.createElement("span");
rotationValue.textContent = "10.0";
rotationValue.style.marginLeft = "10px";
rotationLabel.appendChild(rotationValue);

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
  
  // Check microphone initialization status
  const checkMicStatus = setInterval(() => {
    if (microphone?.initialized) {
      startButton.style.display = "none";
      controlsContainer.style.display = "block";
      micStatusIndicator.style.display = "block";
      micStatusIndicator.style.backgroundColor = "rgba(0, 255, 0, 0.3)";
      micStatusIndicator.innerHTML = '<span style="color: #44ff44;">●</span> Microphone: Active';
      clearInterval(checkMicStatus);
    }
  }, 100);
  
  // Timeout after 5 seconds
  setTimeout(() => {
    clearInterval(checkMicStatus);
    if (!microphone?.initialized) {
      micStatusIndicator.style.display = "block";
      micStatusIndicator.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
      micStatusIndicator.innerHTML = '<span style="color: #ff4444;">●</span> Microphone: Failed to initialize';
    }
  }, 5000);
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

  // Rotate cube with configurable speed
  cube.rotation.x += rotationSpeedX;
  cube.rotation.y += rotationSpeedY;

  // Update bars based on microphone input
  if (microphone?.initialized) {
    const samples = microphone.samples;

    for (let i = 0; i < bars.length; i++) {
      // Map sample to bar (cycle through samples)
      const sampleIndex = i % samples.length;
      const micInput = Math.abs(samples[sampleIndex]);

      // Calculate target height with configurable sensitivity
      const sound = micInput * barSensitivity;

      // Update height with smoothing
      if (sound > barHeights[i]) {
        barHeights[i] = sound;
      } else {
        barHeights[i] -= barHeights[i] * 0.01; // Smooth decay
      }

      // Update bar scale - bars extend along their local z-axis
      const targetHeight = Math.max(barHeights[i], 0.1); // Minimum height
      bars[i].scale.z = targetHeight;
      
      // Update bar position to keep the base edge at the cube surface
      // Geometry extends from -0.05 to +0.05 in local z
      // When scaled by targetHeight, it extends from -0.05*targetHeight to +0.05*targetHeight
      // To keep the back edge (-0.05*targetHeight) at basePosition, we offset the center by 0.05*targetHeight
      // along the normal direction (in cube's local space)
      // Get the bar's local z-axis direction in cube's local space
      const localZ = new THREE.Vector3(0, 0, 1);
      localZ.applyQuaternion(bars[i].quaternion);
      const baseOffset = localZ.clone().multiplyScalar(0.05 * targetHeight);
      bars[i].position.copy(barBasePositions[i]).add(baseOffset);
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

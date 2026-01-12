import * as THREE from "three";

const vertexShader = /* glsl */ `
  varying vec2 vScreenPos;
  varying vec3 vRayDir;

  uniform mat4 u_inverseProjection;
  uniform mat4 u_inverseView;

  void main() {
    // Pass through clip-space position directly for fullscreen quad
    vScreenPos = position.xy;

    // Calculate ray direction in world space
    // position.xy is in [-1, 1] clip space
    vec4 clipPos = vec4(position.xy, 1.0, 1.0);
    vec4 viewPos = u_inverseProjection * clipPos;
    viewPos = viewPos / viewPos.w;
    viewPos.w = 0.0; // Direction, not position
    vec4 worldDir = u_inverseView * viewPos;
    vRayDir = normalize(worldDir.xyz);

    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 u_waterColorDeep;
  uniform vec3 u_waterColorShallow;
  uniform vec3 u_skyColorHorizon;
  uniform vec3 u_skyColorZenith;
  uniform vec3 u_sunDirection;
  uniform vec3 u_sunColor;
  uniform float u_sunIntensity;
  uniform float u_fresnelPower;
  uniform float u_specularPower;
  uniform sampler2D u_heightMap;
  uniform float u_heightScale;
  uniform float u_resolution;
  uniform float u_simulationScale;

  varying vec2 vScreenPos;
  varying vec3 vRayDir;

  void main() {
    vec3 rayDir = normalize(vRayDir);

    // If looking up (ray won't hit water plane), discard
    if (rayDir.y >= 0.0) {
      discard;
    }

    // Calculate ray-plane intersection with y=0 plane
    // Ray: P = cameraPosition + t * rayDir
    // Plane: y = 0
    // Solve: cameraPosition.y + t * rayDir.y = 0
    float t = -cameraPosition.y / rayDir.y;

    // Calculate world position at intersection
    vec3 worldPos = cameraPosition + t * rayDir;

    // Map world XZ to UV coordinates
    // simulationScale controls the world size covered by the simulation
    vec2 uv = worldPos.xz / u_simulationScale + 0.5;

    // Calculate distance from center for edge fading
    vec2 uvCentered = uv - 0.5;
    float distFromCenter = length(uvCentered) * 2.0; // 0 at center, 1 at edges

    // Fade factor: smooth transition from full waves to flat at edges
    float fadeFactor = 1.0 - smoothstep(0.8, 1.0, distFromCenter);

    // Clamp UVs to valid range for sampling
    vec2 clampedUv = clamp(uv, 0.0, 1.0);

    // Sample height at this point
    float height = texture2D(u_heightMap, clampedUv).r * fadeFactor;

    // Sample neighbors for normal calculation
    float texelSize = 1.0 / u_resolution;

    float heightL = texture2D(u_heightMap, clamp(clampedUv + vec2(-texelSize, 0.0), 0.0, 1.0)).r * fadeFactor;
    float heightR = texture2D(u_heightMap, clamp(clampedUv + vec2(texelSize, 0.0), 0.0, 1.0)).r * fadeFactor;
    float heightU = texture2D(u_heightMap, clamp(clampedUv + vec2(0.0, texelSize), 0.0, 1.0)).r * fadeFactor;
    float heightD = texture2D(u_heightMap, clamp(clampedUv + vec2(0.0, -texelSize), 0.0, 1.0)).r * fadeFactor;

    // Calculate normal from height differences (matching original behavior)
    vec3 normal = normalize(vec3(
      (heightL - heightR) * u_heightScale,
      2.0,
      (heightD - heightU) * u_heightScale
    ));

    // Update world position with actual height
    worldPos.y = height * u_heightScale;

    vec3 viewDir = normalize(cameraPosition - worldPos);

    // Fresnel effect - more reflective at grazing angles
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), u_fresnelPower);
    fresnel = clamp(fresnel, 0.02, 1.0); // Always some reflection

    // Water color based on "depth" (inverted height)
    float depthFactor = clamp(-height * 2.0 + 0.5, 0.0, 1.0);
    vec3 waterColor = mix(u_waterColorShallow, u_waterColorDeep, depthFactor);

    // Sky reflection - simulate gradient sky
    vec3 reflectDir = reflect(-viewDir, normal);
    float skyGradient = clamp(reflectDir.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 skyColor = mix(u_skyColorHorizon, u_skyColorZenith, skyGradient);

    // Specular highlight (sun reflection)
    vec3 halfDir = normalize(u_sunDirection + viewDir);
    float specular = pow(max(dot(normal, halfDir), 0.0), u_specularPower);
    specular *= u_sunIntensity;

    // Combine: water color + fresnel reflection + specular
    vec3 color = mix(waterColor, skyColor, fresnel);
    color += u_sunColor * specular;

    // Subtle ambient occlusion in troughs
    float ao = clamp(height * 0.5 + 1.0, 0.7, 1.0);
    color *= ao;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export interface WaterMaterialOptions {
  resolution: number;
  simulationScale?: number;
  heightScale?: number;
  waterColorDeep?: THREE.Color;
  waterColorShallow?: THREE.Color;
  skyColorHorizon?: THREE.Color;
  skyColorZenith?: THREE.Color;
  sunDirection?: THREE.Vector3;
  sunColor?: THREE.Color;
  sunIntensity?: number;
  fresnelPower?: number;
  specularPower?: number;
}

export class WaterMaterial extends THREE.ShaderMaterial {
  private heightTexture: THREE.DataTexture;
  private resolution: number;

  constructor(options: WaterMaterialOptions) {
    const resolution = options.resolution;

    // Create height map texture
    const data = new Float32Array(resolution * resolution);
    const heightTexture = new THREE.DataTexture(
      data,
      resolution,
      resolution,
      THREE.RedFormat,
      THREE.FloatType
    );
    heightTexture.minFilter = THREE.LinearFilter;
    heightTexture.magFilter = THREE.LinearFilter;
    heightTexture.wrapS = THREE.ClampToEdgeWrapping;
    heightTexture.wrapT = THREE.ClampToEdgeWrapping;
    heightTexture.needsUpdate = true;

    const uniforms = {
      u_heightMap: { value: heightTexture },
      u_heightScale: { value: options.heightScale ?? 5.0 },
      u_resolution: { value: resolution },
      u_simulationScale: { value: options.simulationScale ?? 100.0 },
      u_inverseProjection: { value: new THREE.Matrix4() },
      u_inverseView: { value: new THREE.Matrix4() },
      u_waterColorDeep: {
        value: options.waterColorDeep ?? new THREE.Color(0x001e3c),
      },
      u_waterColorShallow: {
        value: options.waterColorShallow ?? new THREE.Color(0x0077b6),
      },
      u_skyColorHorizon: {
        value: options.skyColorHorizon ?? new THREE.Color(0x87ceeb),
      },
      u_skyColorZenith: {
        value: options.skyColorZenith ?? new THREE.Color(0x1e90ff),
      },
      u_sunDirection: {
        value: options.sunDirection ?? new THREE.Vector3(0.5, 0.7, 0.5).normalize(),
      },
      u_sunColor: { value: options.sunColor ?? new THREE.Color(0xffffee) },
      u_sunIntensity: { value: options.sunIntensity ?? 1.0 },
      u_fresnelPower: { value: options.fresnelPower ?? 2.0 },
      u_specularPower: { value: options.specularPower ?? 256.0 },
    };

    super({
      vertexShader,
      fragmentShader,
      uniforms,
    });

    this.heightTexture = heightTexture;
    this.resolution = resolution;
  }

  /**
   * Update the height map from simulation data
   */
  updateHeightMap(data: Float32Array): void {
    if (data.length !== this.resolution * this.resolution) {
      console.warn("Height data size mismatch");
      return;
    }
    const image = this.heightTexture.image as { data: Float32Array };
    image.data.set(data);
    this.heightTexture.needsUpdate = true;
  }

  /**
   * Update camera matrices for ray casting (must be called each frame)
   */
  updateCameraMatrices(camera: THREE.PerspectiveCamera): void {
    this.uniforms.u_inverseProjection.value.copy(camera.projectionMatrixInverse);
    this.uniforms.u_inverseView.value.copy(camera.matrixWorld);
  }

  // Accessors for common uniforms
  get heightScale(): number {
    return this.uniforms.u_heightScale.value;
  }
  set heightScale(value: number) {
    this.uniforms.u_heightScale.value = value;
  }

  get sunIntensity(): number {
    return this.uniforms.u_sunIntensity.value;
  }
  set sunIntensity(value: number) {
    this.uniforms.u_sunIntensity.value = value;
  }

  get fresnelPower(): number {
    return this.uniforms.u_fresnelPower.value;
  }
  set fresnelPower(value: number) {
    this.uniforms.u_fresnelPower.value = value;
  }

  get waterColorDeep(): THREE.Color {
    return this.uniforms.u_waterColorDeep.value;
  }
  get waterColorShallow(): THREE.Color {
    return this.uniforms.u_waterColorShallow.value;
  }

  get sunDirection(): THREE.Vector3 {
    return this.uniforms.u_sunDirection.value;
  }

  get simulationScale(): number {
    return this.uniforms.u_simulationScale.value;
  }
  set simulationScale(value: number) {
    this.uniforms.u_simulationScale.value = value;
  }
}

import * as THREE from "three";

const vertexShader = /* glsl */ `
  uniform sampler2D u_heightMap;
  uniform float u_heightScale;
  uniform float u_resolution;

  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    vUv = uv;

    // Sample height at this vertex
    float height = texture2D(u_heightMap, uv).r;

    // Sample neighbors for normal calculation
    float texelSize = 1.0 / u_resolution;
    float heightL = texture2D(u_heightMap, uv + vec2(-texelSize, 0.0)).r;
    float heightR = texture2D(u_heightMap, uv + vec2(texelSize, 0.0)).r;
    float heightU = texture2D(u_heightMap, uv + vec2(0.0, texelSize)).r;
    float heightD = texture2D(u_heightMap, uv + vec2(0.0, -texelSize)).r;

    // Calculate normal from height differences
    vec3 normal = normalize(vec3(
      (heightL - heightR) * u_heightScale,
      2.0,
      (heightD - heightU) * u_heightScale
    ));

    // Displace vertex
    vec3 displaced = position;
    displaced.y += height * u_heightScale;

    vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
    vWorldPosition = worldPosition.xyz;
    vNormal = normalize(normalMatrix * normal);

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
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

  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);

    // Fresnel effect - more reflective at grazing angles
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), u_fresnelPower);
    fresnel = clamp(fresnel, 0.02, 1.0); // Always some reflection

    // Sample height for depth-based coloring
    float height = texture2D(u_heightMap, vUv).r;

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
}

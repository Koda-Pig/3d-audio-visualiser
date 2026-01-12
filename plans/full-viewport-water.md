# Plan: Full Viewport Water Visualization

## Goal
Make the water surface extend to the horizon in every direction, filling the entire viewport.

## Current State
- `WATER_SIZE = 100` (100x100 unit plane)
- `SIMULATION_RESOLUTION = 256` (256x256 vertex grid)
- Camera at (0, 40, 60) with 60° FOV, far plane at 1000
- Water plane is square and edges are visible at wide aspect ratios

## Problem Analysis
The water plane is finite and square. At the horizon, the camera can see further horizontally than the plane extends, exposing the background.

## Approach: Shader-Based Infinite Plane

Instead of scaling up a finite mesh (which stretches the wave simulation), render the water as an infinite plane using a fullscreen quad with raymarching.

### How It Works
1. Render a fullscreen quad (2 triangles covering the screen)
2. In the fragment shader, cast a ray from the camera through each pixel
3. Calculate where the ray intersects the y=0 plane (the water surface)
4. Sample the wave simulation texture using the intersection's world XZ coordinates
5. Apply existing water shading (fresnel, specular, colors)

### Benefits
- Truly infinite - no edges ever visible
- Constant vertex count (6 vertices) regardless of water extent
- Wave simulation remains unchanged (still 256x256)
- No performance scaling with water size

### Implementation Steps

#### Step 1: Create fullscreen quad geometry
```typescript
const quadGeometry = new THREE.PlaneGeometry(2, 2);
```

#### Step 2: Modify vertex shader
- Pass through clip-space positions directly
- Calculate world-space ray direction for each vertex

#### Step 3: Modify fragment shader
- Compute ray-plane intersection: `t = -cameraPosition.y / rayDir.y`
- Calculate world position: `worldPos = cameraPosition + t * rayDir`
- Map world XZ to UV: `uv = worldPos.xz / SIMULATION_SCALE + 0.5`
- Sample height texture and apply existing shading
- Discard fragments where ray misses plane (looking up at sky)

#### Step 4: Add simulation scale uniform
- New uniform `u_simulationScale` controls how world units map to simulation UVs
- Allows tuning how "zoomed in" the waves appear

#### Step 5: Handle edge cases
- Clamp or wrap UVs at simulation boundaries
- Fade wave amplitude at edges to avoid hard cutoffs

### Files to Modify
1. `src/water-material.ts` - New shaders for infinite plane
2. `src/main.ts` - Replace PlaneGeometry with fullscreen quad, add scale uniform

### Configuration
- `SIMULATION_SCALE`: World units covered by simulation (e.g., 200 = waves visible in 200x200 unit area centered on origin)
- Waves tile/fade beyond this area

### Risks
- More complex shader math
- Precision issues at extreme distances (mitigated by far plane)
- UV wrapping artifacts at simulation boundaries

### Alternative: Simple Large Plane (Fallback)
If shader approach proves problematic:
1. Use large fixed size (e.g., 10000x10000)
2. Keep simulation resolution at 256x256
3. Accept that waves will appear stretched at distance
4. Set background to match horizon color

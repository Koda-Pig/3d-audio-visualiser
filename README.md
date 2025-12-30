# 3D Audio Visualiser

## Deployment

Deployed to https://audio-visualiser-3d.netlify.app/

## TODO

1. Add more visual changes depending on unused data from microphone, such as samples, volume, and frequency data. Currently only averageFrequency is used.

## Factory Function Implementation Plan

### Goal
Create a factory function to generate multiple sphere meshes (e.g., nested spheres) that share the same shader material and react identically to audio data, while allowing different sizes.

### Implementation Steps

#### 1. Create Factory Function
- **Location**: In `src/main.ts`, before the sphere creation code
- **Function Signature**: `function createSphere(radius: number, material: THREE.ShaderMaterial): THREE.Mesh`
- **Implementation**:
  - Create a new `THREE.IcosahedronGeometry` with the provided radius and detail level (30)
  - Create a new `THREE.Mesh` using the geometry and shared material
  - Return the mesh instance

#### 2. Refactor Current Sphere Creation
- **Current code** (lines 87-89):
  ```typescript
  const sphere = new THREE.IcosahedronGeometry(4, 30);
  const mesh = new THREE.Mesh(sphere, material);
  scene.add(mesh);
  ```
- **Replace with**:
  ```typescript
  const outerSphere = createSphere(4, material);
  scene.add(outerSphere);
  ```

#### 3. Create Inner Sphere
- Use the factory function to create a smaller sphere (e.g., radius 2 or 2.5)
- Both spheres share the same `material` instance (already created with uniforms)
- Add inner sphere to scene: `scene.add(innerSphere)`

#### 4. Update Animation Loop
- **Current code** (line 167): `mesh.rotation.y += (params.rotationSpeed * Math.PI) / 180;`
- **Replace with**: Rotate both spheres individually
  ```typescript
  outerSphere.rotation.y += (params.rotationSpeed * Math.PI) / 180;
  innerSphere.rotation.y += (params.rotationSpeed * Math.PI) / 180;
  ```

### Key Considerations

1. **Material Sharing**: Both spheres use the same `ShaderMaterial` instance, ensuring they react identically to audio data since they share the same uniform values.

2. **Uniform Updates**: No changes needed to uniform updates - the existing code that updates `uniforms.u_bass`, `uniforms.u_treble`, etc. will automatically affect both spheres since they share the material.

3. **Geometry Independence**: Each sphere has its own geometry instance, allowing different sizes while sharing the material.

4. **Positioning**: The inner sphere is naturally centered at the origin (0, 0, 0), same as the outer sphere, so it will appear nested inside.

5. **Performance**: Sharing materials is efficient in Three.js and recommended when objects should have identical visual properties.

### Optional Enhancements

- Consider storing sphere meshes in an array for easier iteration: `const spheres = [outerSphere, innerSphere];`
- If different rotation speeds or directions are desired later, each mesh can be rotated independently
- Could add a `createNestedSpheres()` function that returns an array of spheres with configurable count and size ratios

## Questions

when the values in this smooth function are changed to 2 (instead of a sub-zero value like was intended) there is an interesting and desirable visual effect where mutliple colors show at the same time. This happens because I'm essentially overshooting the target value instead of gradually approaching it.

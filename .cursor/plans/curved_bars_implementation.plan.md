# Curved Bars Implementation Plan

## Overview

Replace the current `BoxGeometry` bars with curved bars using `TubeGeometry` and `CubicBezierCurve3` in Three.js. This will adapt the bezier curve approach from the 2D example (`bar.js`) to work in 3D space while maintaining the same visual effect.

## Analysis of Current vs. Example Implementation

### Current Implementation (`main.ts`)

- Uses `THREE.BoxGeometry(barBaseSize, barBaseSize, 0.1)` for straight bars
- Bars extend along their local z-axis via scaling (`bars[i].scale.z`)
- Base position stays fixed on cube surface

### Example Implementation (`bar.js`)

- Uses Canvas 2D `bezierCurveTo()` with 4 control points
- Control points create an S-curve:
- Start: implicit at current position
- CP1: `(this.x / 2, this.y / 2)`
- CP2: `(this.height * -0.5 - 0.2569373072970195 * windowHeight, this.height + 450)`
- End: `(this.x, this.y)`
- The curve creates a flowing, organic shape

## Implementation Strategy

### Approach: 3D Bezier Curves with TubeGeometry

Use Three.js `CubicBezierCurve3` to create 3D bezier curves that:

1. Start at the bar's base position on the cube surface
2. Curve outward along the face normal direction
3. End at a point that extends based on the bar height
4. Use control points to create an S-curve similar to the 2D example

### Key Components

1. **Curve Generation Function**

- Create a function that generates a `CubicBezierCurve3` for each bar
- Parameters: base position, normal direction, bar height
- Convert the 2D bezier pattern to 3D space

2. **TubeGeometry Creation**

- Replace `BoxGeometry` with `TubeGeometry`
- `TubeGeometry` takes a curve and creates a tube along it
- Parameters: `tubeRadius`, `radialSegments`, `tubularSegments`
- Update curve when bar height changes

3. **Dynamic Curve Updates**

- Regenerate the curve when bar height changes
- Update the mesh geometry (or recreate mesh) with new curve
- Optimize by reusing geometry where possible

### Curve Design in 3D

The 2D example uses:

```javascript
context.bezierCurveTo(
  this.x / 2,      // CP1: halfway to endpoint in x
  this.y / 2,      // CP1: halfway to endpoint in y
  this.height * -0.5 - offset,  // CP2: negative x offset based on height
  this.height + 450,            // CP2: positive y based on height
  this.x,          // End: x endpoint
  this.y           // End: y endpoint
);
```

For 3D, we need to:

- Start point: base position on cube surface
- End point: base position + (normal * height)
- Control point 1: halfway between start and end, offset perpendicular to normal
- Control point 2: offset in opposite direction from CP1, creating S-curve

### Implementation Steps

1. **Create Curve Generation Function**
   ```typescript
      function createBarCurve(
        basePosition: THREE.Vector3,
        normal: THREE.Vector3,
        height: number,
        faceIndex: number
      ): THREE.CubicBezierCurve3 {
        // Calculate start and end points
        // Calculate control points to create S-curve
        // Return CubicBezierCurve3
      }
   ```




2. **Replace BoxGeometry with TubeGeometry**

- In `createBarsForFace()`, use `TubeGeometry` instead of `BoxGeometry`
- Initial curve with minimum height
- Store curve reference for updates

3. **Update Animation Loop**

- When bar height changes, regenerate the curve
- Update mesh geometry with new curve
- Consider performance: only update when height changes significantly

4. **Handle Performance**

- Option A: Update geometry directly (may require dispose)
- Option B: Remove old mesh and create new one (simpler, may be slower)
- Option C: Use instancing if performance becomes an issue

### Curve Control Point Calculation

For each bar:

- **Start (p0)**: `basePosition` on cube surface
- **End (p3)**: `basePosition + normal * height`
- **Control Point 1 (p1)**: Offset perpendicular to normal, creating first curve
- **Control Point 2 (p2)**: Offset in opposite direction, creating S-curve

The perpendicular offset can be calculated using:

- The face's "up" or "right" vectors
- A combination to create the curve in 2D plane perpendicular to normal

### Code Structure Changes

**In `createBarsForFace()`:**

- Replace `BoxGeometry` with initial `TubeGeometry` from a curve
- Store curve generation parameters for later updates

**In animation loop:**

- Detect height changes
- Regenerate curve with new height
- Update or recreate geometry

### Considerations

1. **Performance**: Regenerating curves every frame may be expensive

- Only regenerate when height changes significantly
- Consider caching curves for common heights

2. **Curve Quality**: 

- `tubularSegments` controls curve smoothness
- Higher values = smoother but more expensive
- Start with 8-16 segments, adjust as needed

3. **Tube Radius**:

- Similar to current `barBaseSize` (0.1)
- May want slightly thinner for curved appearance

4. **Orientation**:

- Curves should curve outward from cube
- The S-curve should be visible from multiple angles

## Implementation Checklist

- [ ] Create `createBarCurve()` function
- [ ] Replace `BoxGeometry` with `TubeGeometry` in `createBarsForFace()`
- [ ] Store curve parameters for each bar
- [ ] Update animation loop to regenerate curves on height change
- [ ] Test performance and optimize if needed
- [ ] Adjust curve parameters for visual appeal
- [ ] Ensure curves work correctly with cube rotation

## Example Curve Generation (Pseudo-code)

```typescript
function createBarCurve(
  basePos: THREE.Vector3,
  normal: THREE.Vector3,
  height: number,
  up: THREE.Vector3,
  right: THREE.Vector3
): THREE.CubicBezierCurve3 {
  const start = basePos.clone();
  const end = basePos.clone().add(normal.clone().multiplyScalar(height));
  
  // Create perpendicular offset for S-curve
  const midPoint = start.clone().lerp(end, 0.5);
  
  // CP1: Offset in one direction
  const cp1 = midPoint.clone().add(right.clone().multiplyScalar(height * 0.3));
  
  // CP2: Offset in opposite direction  
  const cp2 = midPoint.clone().add(right.clone().multiplyScalar(-height * 0.3));
  
  return new THREE.CubicBezierCurve3(start, cp1, cp2, end);
}

```
# 3D Audio Visualiser

## Deployment

Deployed to https://audio-visualiser-3d.netlify.app/

## TODO

1. Add more visual changes depending on unused data from microphone, such as samples, volume, and frequency data. Currently only averageFrequency is used.
   1. Color changes
      1. Color change depending on ratio of bass/ treble/ mid?
      2. Multicolor? Seems to work with anti-smooth function.
   2. vertex displacement
2. Smooth brightness value in shader to reduce bloom flickering

   **Implementation Steps:**

   1. **In `main.ts`:**

      - Add a new variable `smoothBrightness` at the top level (around line 17-19, near other smooth variables)
        - Initialize to `0` (e.g., `let smoothBrightness = 0;`)
      - Add `u_smoothBrightness` to the `uniforms` object (around line 68-77)
        - Set initial value to `0` (e.g., `u_smoothBrightness: { value: 0 }`)

   2. **In the `animate()` function (around line 148-176):**

      - After calculating `bass` and `treble` values (lines 154-156)
      - Calculate raw brightness value: `const rawBrightness = bass + treble;`
        - This matches the current shader calculation: `(bassIntensity + trebleIntensity) * 0.001`
        - Note: The shader divides by 255.0, so raw brightness will be in the 0-255 range
      - Apply smoothing with a lower factor (e.g., 0.1) for smoother transitions:
        - `smoothBrightness = smooth(smoothBrightness, rawBrightness, 0.1);`
        - Use a lower factor (0.1) compared to bass/mid/treble (0.5) to make brightness changes more gradual
      - Update the uniform: `uniforms.u_smoothBrightness.value = smoothBrightness;`

   3. **In `fragshader.hlsl`:**

      - Add the new uniform declaration at the top (around line 1-8):
        - `uniform float u_smoothBrightness;`
      - In the `main()` function, replace the brightness calculation (line 25):
        - Current: `float value = 0.5 + (bassIntensity + trebleIntensity) * 0.001;`
        - New: `float value = 0.5 + (u_smoothBrightness / 255.0) * 0.001;`
        - This uses the pre-smoothed brightness value instead of calculating it from raw bass/treble

   4. **Result:**
      - The bloom effect will have smoother brightness transitions, reducing flickering
      - Hue and saturation will remain reactive to audio (still using `u_bass`, `u_mid`, `u_treble` directly)
      - Only the brightness/value component of the HSV color will be smoothed

## Questions

when the values in this smooth function are changed to 2 (instead of a sub-zero value like was intended) there is an interesting and desirable visual effect where mutliple colors show at the same time. This happens because I'm essentially overshooting the target value instead of gradually approaching it.

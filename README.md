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
   - Add `smoothBrightness` variable and `u_smoothBrightness` uniform in `main.ts`
   - Calculate raw brightness from bass/treble, then smooth it with a lower factor (e.g., 0.1) for smoother transitions
   - Update fragment shader to use `u_smoothBrightness` instead of calculated brightness value
   - This will smooth the bloom effect while keeping hue and saturation reactive to audio

## Questions

when the values in this smooth function are changed to 2 (instead of a sub-zero value like was intended) there is an interesting and desirable visual effect where mutliple colors show at the same time. This happens because I'm essentially overshooting the target value instead of gradually approaching it.

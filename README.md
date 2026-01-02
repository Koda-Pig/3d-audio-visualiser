# 3D Audio Visualiser

## Deployment

Deployed to https://audio-visualiser-3d.netlify.app/

## Resources

https://waelyasmina.net/articles/how-to-create-a-3d-audio-visualizer-using-three-js/

## TODO

1. Add more visual changes depending on unused data from microphone, such as samples, volume, and frequency data. Currently only averageFrequency is used.
2. Change secondary sphere to have inverted color ratio to primary sphere.
3. Add control for fftSize, which should control the intensity of the audio visualisation. Must be a power of 2.
4. oooooh: use the microphone samples as the number of vertices in the sphere. Then each one is connected to a different audio frequency.

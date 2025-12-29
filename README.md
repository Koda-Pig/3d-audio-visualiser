# 3D Audio Visualiser

## Deployment

Deployed to https://audio-visualiser-3d.netlify.app/

## TODO

1. Add more visual changes depending on unused data from microphone, such as samples, volume, and frequency data. Currently only averageFrequency is used.
   1. Color changes
      1. Color change depending on ratio of bass/ treble/ mid?
      2. Multicolor? Seems to work with anti-smooth function.
   2. vertex displacement

## Questions

when the values in this smooth function are changed to 2 (instead of a sub-zero value like was intended) there is an interesting and desirable visual effect where mutliple colors show at the same time. This happens because I'm essentially overshooting the target value instead of gradually approaching it.

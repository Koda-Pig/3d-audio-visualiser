varying float vDisplacement;
uniform float u_red;
uniform float u_green;
uniform float u_blue;
uniform float u_bass;
uniform float u_mid;
uniform float u_time;
uniform float u_treble;
uniform float u_smooth_brightness;
uniform float u_is_secondary;

vec3 hsv2rgb(vec3 c) {
	vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
	vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
	return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
	float bassIntensity = u_bass / 255.0;
	float midIntensity = u_mid / 255.0;
	float trebleIntensity = u_treble / 255.0;

	float baseHue;
	if (u_is_secondary > 0.5) {
		baseHue = mod(trebleIntensity * 0.3, 1.0);
	} else {
		baseHue = mod(bassIntensity * 0.5 + midIntensity * 0.3, 1.0);
	}

	float hue = mod(baseHue + vDisplacement * 0.2, 1.0);

	float saturation = 0.7 + midIntensity * 0.3;
	float value = 0.5 + (u_smooth_brightness / 255.0) * 0.001;
	vec3 color = hsv2rgb(vec3(hue, saturation, value));
	gl_FragColor = vec4(color, 1.0);
}
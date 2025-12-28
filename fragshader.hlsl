uniform float u_red;
uniform float u_green;
uniform float u_blue;
uniform float u_bass;
uniform float u_mid;
uniform float u_treble;

vec3 hsv2rgb(vec3 c) {
	vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
	vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
	return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
	float bassIntensity = u_bass / 255.0;
	float midIntensity = u_mid / 255.0;
	float trebleIntensity = u_treble / 255.0;

	float hue = mod(u_time * 0.1 + bassIntensity * 0.5 + midIntensity * 0.3, 1.0);
	float saturation = 0.7 + midIntensity * 0.3;
	float value = 0.5 + (bassIntensity + trebleIntensity) * 0.5;
	vec3 color = hsv2rgb(vec3(hue, saturation, value));
	gl_FragColor = vec4(color, 1.0);
}
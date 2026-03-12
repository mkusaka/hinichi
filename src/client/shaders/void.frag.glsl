/**
 * Domain-warped FBM plasma shader (Inigo Quilez technique).
 * Creates a slowly-evolving nebula / organic noise background.
 */

uniform float uTime;
uniform vec2 uResolution;
uniform float uMouse; // 0–1 mouse x position, subtle influence

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  vec2 shift = p;
  for (int i = 0; i < 6; i++) {
    value += amplitude * noise(shift);
    shift *= 2.01;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float time = uTime * 0.08;

  // Domain warping: layer 1
  vec2 q = vec2(
    fbm(uv * 4.0 + vec2(0.0, time)),
    fbm(uv * 4.0 + vec2(5.2, 1.3))
  );

  // Domain warping: layer 2 (mouse adds subtle offset)
  float mouseInfluence = uMouse * 0.3;
  vec2 r = vec2(
    fbm(uv * 4.0 + 4.0 * q + vec2(1.7 + mouseInfluence, 9.2) + time * 0.15),
    fbm(uv * 4.0 + 4.0 * q + vec2(8.3, 2.8 + mouseInfluence) + time * 0.13)
  );

  float f = fbm(uv * 4.0 + 4.0 * r);

  // Color palette: neon cyan → electric purple → hot magenta
  vec3 cyan    = vec3(0.0, 1.0, 0.84);
  vec3 magenta = vec3(1.0, 0.18, 0.58);
  vec3 purple  = vec3(0.42, 0.39, 1.0);

  vec3 color = mix(cyan, purple, clamp(f * f * 4.0, 0.0, 1.0));
  color = mix(color, magenta, clamp(length(q), 0.0, 1.0));

  // Keep subtle — background, not the star
  color *= 0.04 + 0.03 * f;

  gl_FragColor = vec4(color, 1.0);
}

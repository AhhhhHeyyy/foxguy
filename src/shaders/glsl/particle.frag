#version 300 es
precision mediump float;

in vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform float uTime;
uniform float uEAR;
uniform vec2 uGaze;
uniform float uBlink;
uniform float uIntensity;

out vec4 fragColor;

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec4 base = texture(uTexture, vTextureCoord);

  vec2 cell = floor(vTextureCoord * 40.0);
  vec2 offset = vec2(rand(cell), rand(cell + 1.7)) * 0.025;
  offset += uGaze * 0.008 * sin(uTime + rand(cell) * 6.28318);
  vec2 particleUV = fract(vTextureCoord * 40.0) - 0.5 + offset;
  float d = length(particleUV);

  float brightness = uBlink * 2.0 + uEAR * 0.4;
  float particle = smoothstep(0.12, 0.06, d) * brightness * uIntensity;

  float hue = rand(cell) + uTime * 0.2;
  vec3 color = 0.5 + 0.5 * cos(6.28318 * (hue + vec3(0.0, 0.33, 0.67)));

  fragColor = base + vec4(color * particle, 0.0);
}

#version 300 es
precision mediump float;

in vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform float uTime;
uniform float uEAR;
uniform float uIntensity;

out vec4 fragColor;

void main() {
  vec2 uv = vTextureCoord;
  float radius = (1.0 + uEAR * 3.0 + sin(uTime) * 0.3) * 0.004;

  vec4 center = texture(uTexture, uv);
  vec4 bloom = vec4(0.0);
  bloom += texture(uTexture, uv + vec2(radius, 0.0));
  bloom += texture(uTexture, uv + vec2(-radius, 0.0));
  bloom += texture(uTexture, uv + vec2(0.0, radius));
  bloom += texture(uTexture, uv + vec2(0.0, -radius));
  bloom /= 4.0;

  vec3 tint = mix(vec3(0.3, 0.7, 1.0), vec3(1.0, 0.8, 0.3), uEAR);
  fragColor = mix(center, bloom * vec4(tint, 1.0), 0.4 * uIntensity);
}

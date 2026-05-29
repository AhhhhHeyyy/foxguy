#version 300 es
precision mediump float;

in vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform float uEAR;
uniform vec2 uGaze;
uniform float uIntensity;

out vec4 fragColor;

void main() {
  vec2 eyeUV = vec2(0.5 + uGaze.x * 0.15, 0.45 + uGaze.y * 0.05);

  float d = distance(vTextureCoord, eyeUV);
  float radius = 0.1 + uEAR * 0.15;
  float edgeW = 0.03;

  float maskValue = smoothstep(radius, radius - edgeW, d);
  float edgeFactor = smoothstep(radius + edgeW, radius, d)
                   - smoothstep(radius, radius - edgeW, d);

  vec4 color = texture(uTexture, vTextureCoord);
  color.a *= mix(1.0, maskValue, uIntensity);
  color.rgb += vec3(0.8, 0.9, 1.0) * edgeFactor * uEAR * uIntensity;

  fragColor = color;
}

#version 300 es
precision mediump float;

in vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform float uTime;
uniform float uEAR;
uniform vec2 uGaze;
uniform float uIntensity;

out vec4 fragColor;

void main() {
  float mag = length(uGaze);

  vec2 uvOffset;
  uvOffset.x = sin(vTextureCoord.y * 12.0 + uTime * 2.0) * mag * 0.015;
  uvOffset.y = cos(vTextureCoord.x * 8.0 + uTime * 1.5) * mag * 0.010;

  uvOffset += uGaze * 0.008 * uEAR;
  uvOffset *= uIntensity;

  vec2 distortedUV = clamp(vTextureCoord + uvOffset, 0.0, 1.0);
  fragColor = texture(uTexture, distortedUV);
}

#version 300 es
precision mediump float;

in vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform float uIntensity;    // color tint strength
uniform float uDark;         // darkening strength (0 = no darken, 1 = black)
uniform float uBloomOpacity; // 0 = eyes open, 1 = eyes closed
uniform vec3 uColor;

out vec4 fragColor;

void main() {
  vec2 uv = vTextureCoord;
  vec4 center = texture(uTexture, uv);
  float e = uBloomOpacity;

  // pull brightness down
  vec3 result = center.rgb * (1.0 - e * uDark);
  // additive color overlay on top
  result += uColor * e * uIntensity;

  fragColor = vec4(result, center.a);
}

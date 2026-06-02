#version 300 es
precision mediump float;

in  vec2 vTextureCoord;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform vec2  uTexSize;     // blood-pool canvas pixel dimensions
uniform float uTime;
uniform float uGrainStr;    // 0–1
uniform float uPaperStr;    // 0–1

// ── Noise helpers ────────────────────────────────────────────────────────────

float hash(vec2 p) {
  p  = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i),               hash(i + vec2(1,0)), f.x),
    mix(hash(i + vec2(0,1)),   hash(i + vec2(1,1)), f.x),
    f.y
  );
}

// 4-octave fBm for paper fibers
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p  = p * 2.13 + vec2(5.3, 7.1);
    a *= 0.5;
  }
  return v;   // ≈ 0..1
}

// ── Main ─────────────────────────────────────────────────────────────────────

void main() {
  vec4 col = texture(uTexture, vTextureCoord);

  // Leave transparent regions untouched
  if (col.a < 0.01) { fragColor = col; return; }

  // Pixel coordinate in the input texture space
  vec2 px = vTextureCoord * uTexSize;

  // ── 1. Film grain (flickers at 24 fps) ──────────────────────────────────
  float t24  = floor(uTime * 24.0);
  float g    = hash(px * 0.47 + t24 * 7.31);
  float grain = (g - 0.5) * uGrainStr * 0.40 * col.a;

  // ── 2. Paper fibre (static fBm, normalised to canvas long-edge) ──────────
  float maxEdge = max(uTexSize.x, uTexSize.y);
  vec2  pUV     = px / maxEdge * 100.0;
  float paper   = (fbm(pUV) - 0.5) * uPaperStr * 0.32 * col.a;

  // ── Combine and re-clamp (stay in premultiplied range) ───────────────────
  vec3 rgb = clamp(col.rgb + grain + paper, 0.0, col.a);
  fragColor = vec4(rgb, col.a);
}

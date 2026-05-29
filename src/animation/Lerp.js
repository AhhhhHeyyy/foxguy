export const lerp = (a, b, t) => a + (b - a) * t

export const clamp = (v, min, max) => Math.min(Math.max(v, min), max)

export const mapRange = (v, inMin, inMax, outMin, outMax) =>
  outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin)

import { Filter, GlProgram } from 'pixi.js'
import vertSrc from './glsl/filter.vert?raw'
import fragSrc from './glsl/bloom.frag?raw'

const EAR_CLOSED = 0.18
const EAR_OPEN   = 0.35

export default class BloomFilter extends Filter {
  constructor() {
    const glProgram = GlProgram.from({ vertex: vertSrc, fragment: fragSrc })
    super({
      glProgram,
      resources: {
        uniforms: {
          uIntensity:    { value: 0.85,                               type: 'f32' },
          uDark:         { value: 0.92,                               type: 'f32' },
          uBloomOpacity: { value: 0.0,                                type: 'f32' },
          uColor:        { value: new Float32Array([0.29, 0.0, 0.0]), type: 'vec3<f32>' },
        },
      },
    })
    this.intensity = 0.85
    this.dark      = 0.92
    this._colorHex = '#4a0000'
    this._colorRgb = new Float32Array([0.29, 0.0, 0.0])
    this._smoothedOpacity = 0
  }

  get color() { return this._colorHex }
  set color(hex) {
    this._colorHex = hex
    this._colorRgb[0] = parseInt(hex.slice(1, 3), 16) / 255
    this._colorRgb[1] = parseInt(hex.slice(3, 5), 16) / 255
    this._colorRgb[2] = parseInt(hex.slice(5, 7), 16) / 255
  }

  update(state) {
    const openFactor = Math.max(0, Math.min(1, (state.ear - EAR_CLOSED) / (EAR_OPEN - EAR_CLOSED)))
    const eyeClosedFactor = 1 - openFactor

    // Ramp up based on sustained closure — a normal blink (~10 frames) stays subtle,
    // holding eyes closed reaches full strength after ~20 frames (0.33s)
    const RAMP_FRAMES = 20
    const sustainFactor = state.eyeOpen ? 0 : Math.min(1, state.blinkAge / RAMP_FRAMES)

    const target = eyeClosedFactor * sustainFactor
    // Fast attack, slow decay so the fade-out is graceful
    const t = target > this._smoothedOpacity ? 0.4 : 0.05
    this._smoothedOpacity += (target - this._smoothedOpacity) * t

    const u = this.resources.uniforms.uniforms
    u.uIntensity    = this.intensity
    u.uDark         = this.dark
    u.uBloomOpacity = this._smoothedOpacity
    u.uColor[0] = this._colorRgb[0]
    u.uColor[1] = this._colorRgb[1]
    u.uColor[2] = this._colorRgb[2]
  }
}

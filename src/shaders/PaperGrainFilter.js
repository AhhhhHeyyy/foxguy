import { Filter, GlProgram } from 'pixi.js'
import { CANVAS_W, CANVAS_H } from '../app/PixiApp.js'
import vertSrc from './glsl/filter.vert?raw'
import fragSrc from './glsl/paper_grain.frag?raw'

const SCALE = 0.5
const CW = Math.round(CANVAS_W * SCALE)
const CH = Math.round(CANVAS_H * SCALE)

export default class PaperGrainFilter extends Filter {
  constructor() {
    const glProgram = GlProgram.from({ vertex: vertSrc, fragment: fragSrc })
    super({
      glProgram,
      resources: {
        uniforms: {
          uTime:     { value: 0,        type: 'f32' },
          uTexSize:  { value: [CW, CH], type: 'vec2<f32>' },
          uGrainStr: { value: 0.55,     type: 'f32' },
          uPaperStr: { value: 0.45,     type: 'f32' },
        },
      },
    })
    this.grainStrength = 0.55
    this.paperStrength = 0.45
    this.intensity     = 1.0
  }

  update(state) {
    const u   = this.resources.uniforms.uniforms
    const mix = this.intensity
    u.uTime        = state.time
    u.uGrainStr    = this.grainStrength * mix
    u.uPaperStr    = this.paperStrength * mix
  }
}

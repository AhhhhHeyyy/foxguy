import { Filter, GlProgram } from 'pixi.js'
import vertSrc from './glsl/filter.vert?raw'
import fragSrc from './glsl/dissolve.frag?raw'

export default class DissolveFilter extends Filter {
  constructor() {
    const glProgram = GlProgram.from({ vertex: vertSrc, fragment: fragSrc })
    super({
      glProgram,
      resources: {
        uniforms: {
          uEAR: { value: 0.5, type: 'f32' },
          uGaze: { value: [0, 0], type: 'vec2<f32>' },
          uIntensity: { value: 1.0, type: 'f32' },
        },
      },
    })
    this.intensity = 1.0
  }

  update(state) {
    this.resources.uniforms.uniforms.uEAR = state.ear
    this.resources.uniforms.uniforms.uGaze[0] = state.gaze.x
    this.resources.uniforms.uniforms.uGaze[1] = state.gaze.y
    this.resources.uniforms.uniforms.uIntensity = this.intensity
  }
}

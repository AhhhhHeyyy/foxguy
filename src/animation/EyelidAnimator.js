import { lerp, clamp } from './Lerp.js'

const EAR_CLOSED = 0.18
const EAR_OPEN = 0.35

export default class EyelidAnimator {
  constructor(sprite61, sprite62) {
    this.sprite61 = sprite61
    this.sprite62 = sprite62
    this.currentOffset = 0
    this.maxOffset = 80
  }

  update(ear) {
    const openFactor = clamp((ear - EAR_CLOSED) / (EAR_OPEN - EAR_CLOSED), 0, 1)
    const targetOffset = openFactor * this.maxOffset
    this.currentOffset = lerp(this.currentOffset, targetOffset, 0.12)

    this.sprite61.position.y = -this.currentOffset
    this.sprite62.position.y = this.currentOffset
  }
}

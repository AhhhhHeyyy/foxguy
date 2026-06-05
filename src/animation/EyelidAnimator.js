import { lerp, clamp } from './Lerp.js'

const EAR_CLOSED = 0.18
const EAR_OPEN = 0.35

export default class EyelidAnimator {
  constructor(sprite61, sprite62) {
    this.sprite61 = sprite61
    this.sprite62 = sprite62
    this.currentOffset = 0
    this.closeOffset = 0
    this.openOffset = 700
    this.baseY61 = -49
    this.baseY62 = 365
  }

  update(ear) {
    const openFactor = clamp((ear - EAR_CLOSED) / (EAR_OPEN - EAR_CLOSED), 0, 1)
    const targetOffset = this.closeOffset + openFactor * (this.openOffset - this.closeOffset)
    this.currentOffset = lerp(this.currentOffset, targetOffset, 0.12)

    this.sprite61.position.y = -this.currentOffset + this.baseY61
    this.sprite62.position.y = this.currentOffset + this.baseY62
  }
}

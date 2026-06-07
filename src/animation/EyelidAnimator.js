import { lerp, clamp } from './Lerp.js'

const EAR_CLOSED = 0.16
const EAR_OPEN = 0.35

// Frames of sustained closure before allowing full close (~0.5s at 60fps)
const SUSTAINED_FRAMES = 30

export default class EyelidAnimator {
  constructor(sprite61, sprite62) {
    this.sprite61 = sprite61
    this.sprite62 = sprite62
    this.currentOffset = 0
    this.closeOffset = 20
    this.openOffset = 700
    this.baseY61 = -168
    this.baseY62 = -7
    this.closedFrames = 0
  }

  update(ear) {
    // Low-pass filter to reduce frame-to-frame EAR jitter
    this.smoothedEar = lerp(this.smoothedEar ?? ear, ear, 0.25)

    const openFactor = clamp((this.smoothedEar - EAR_CLOSED) / (EAR_OPEN - EAR_CLOSED), 0, 1)

    // Hysteresis: count up when clearly closed, decay slowly when clearly open,
    // hold steady in the middle to prevent oscillation while squinting
    if (openFactor < 0.1) {
      this.closedFrames = Math.min(this.closedFrames + 1, SUSTAINED_FRAMES)
    } else if (openFactor > 0.4) {
      this.closedFrames = Math.max(this.closedFrames - 3, 0)
    }

    // Quick blink: barely nudges lid; sustained close: lid fully shuts
    const sustainedFactor = this.closedFrames / SUSTAINED_FRAMES
    const minOpenFactor = lerp(0.82, 0, sustainedFactor)
    const effectiveOpenFactor = Math.max(openFactor, minOpenFactor)

    const targetOffset = this.closeOffset + effectiveOpenFactor * (this.openOffset - this.closeOffset)
    const closing = targetOffset < this.currentOffset
    // Quick blinks respond sluggishly; sustained close responds faster
    const closingSpeed = lerp(0.06, 0.4, sustainedFactor)
    this.currentOffset = lerp(this.currentOffset, targetOffset, closing ? closingSpeed : 0.18)

    this.sprite61.position.y = -this.currentOffset + this.baseY61
    this.sprite62.position.y = this.currentOffset + this.baseY62
  }
}

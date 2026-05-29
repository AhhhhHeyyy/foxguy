export default class CameraManager {
  constructor(videoElement) {
    this.videoElement = videoElement
    this.isReady = false
    this.ready = this._init()
  }

  async _init() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
    })
    this.videoElement.srcObject = stream
    await new Promise((resolve) => {
      this.videoElement.onloadeddata = resolve
    })
    this.isReady = true
  }
}

import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

const WASM_URL = '/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

export default class FaceLandmarkerManager {
  constructor() {
    this.landmarker = null
    this.isReady = false
    this.lastTimestamp = -1
    this.ready = this._init()
  }

  async _init() {
    const filesetResolver = await FilesetResolver.forVisionTasks(WASM_URL)
    this.landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      outputFaceLandmarks: true,
      numFaces: 1,
      runningMode: 'VIDEO',
    })
    this.isReady = true
  }

  detect(videoElement) {
    if (!this.isReady) return null
    const timestamp = Math.max(performance.now(), this.lastTimestamp + 1)
    this.lastTimestamp = timestamp
    return this.landmarker.detectForVideo(videoElement, timestamp)
  }
}

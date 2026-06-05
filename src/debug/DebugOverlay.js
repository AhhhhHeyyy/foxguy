import { FaceLandmarker } from '@mediapipe/tasks-vision'

const MESH_COLOR = 'rgba(0, 200, 255, 0.35)'
const POINT_COLOR = '#00e5ff'
const IRIS_COLOR = '#ff4081'
const DATA_COLOR = '#00ff88'

export default class DebugOverlay {
  constructor() {
    this.canvas = document.getElementById('debug-canvas')
    this.ctx = this.canvas.getContext('2d')
    this.landmarks = null
    this.visible = false
    this.canvas.style.display = 'none'

    // Toggle with backtick key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'p' || e.key === 'P') {
        this.visible = !this.visible
        this.canvas.style.display = this.visible ? 'block' : 'none'
      }
    })
  }

  update(landmarks) {
    this.landmarks = landmarks
  }

  draw(appState) {
    if (!this.visible) return
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
    ctx.fillRect(0, 0, W, H)

    const lm = this.landmarks
    if (lm && lm.length > 0) {
      this._drawMesh(ctx, lm, W, H)
      this._drawIris(ctx, lm, W, H)
      this._drawPoints(ctx, lm, W, H)
    } else {
      ctx.fillStyle = 'rgba(255,80,80,0.9)'
      ctx.font = 'bold 13px monospace'
      ctx.fillText('No face detected', 10, H / 2)
    }

    this._drawData(ctx, appState)
  }

  _drawMesh(ctx, lm, W, H) {
    const tessellation = FaceLandmarker.FACE_LANDMARKS_TESSELATION
    ctx.beginPath()
    ctx.strokeStyle = MESH_COLOR
    ctx.lineWidth = 0.6
    for (const { start, end } of tessellation) {
      ctx.moveTo(lm[start].x * W, lm[start].y * H)
      ctx.lineTo(lm[end].x * W, lm[end].y * H)
    }
    ctx.stroke()

    // Eye and lips contours with brighter lines
    const contours = [
      FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
      FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
      FaceLandmarker.FACE_LANDMARKS_LIPS,
      FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
      FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
      FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
    ]
    ctx.strokeStyle = 'rgba(0, 220, 255, 0.8)'
    ctx.lineWidth = 1.2
    for (const contour of contours) {
      ctx.beginPath()
      for (const { start, end } of contour) {
        ctx.moveTo(lm[start].x * W, lm[start].y * H)
        ctx.lineTo(lm[end].x * W, lm[end].y * H)
      }
      ctx.stroke()
    }
  }

  _drawIris(ctx, lm, W, H) {
    // Left iris: 468-472, Right iris: 473-477
    for (const center of [468, 473]) {
      ctx.beginPath()
      ctx.arc(lm[center].x * W, lm[center].y * H, 4, 0, Math.PI * 2)
      ctx.fillStyle = IRIS_COLOR
      ctx.fill()
    }
  }

  _drawPoints(ctx, lm, W, H) {
    ctx.fillStyle = POINT_COLOR
    for (let i = 0; i < lm.length; i++) {
      ctx.fillRect(lm[i].x * W - 0.8, lm[i].y * H - 0.8, 1.6, 1.6)
    }
  }

  _drawData(ctx, s) {
    ctx.font = 'bold 12px monospace'
    const lines = [
      `EAR     ${s.ear.toFixed(4)}`,
      `rawEAR  ${s.rawEar.toFixed(4)}`,
      `gazeX   ${s.gaze.x.toFixed(4)}`,
      `gazeY   ${s.gaze.y.toFixed(4)}`,
      `headX   ${s.head.x.toFixed(4)}`,
      `headY   ${s.head.y.toFixed(4)}`,
      `headZ   ${s.head.z.toFixed(4)}`,
      `blink   ${s.blink ? 'YES' : 'no'}`,
      `blinkAge ${s.blinkAge}`,
      `eyeOpen ${s.eyeOpen ? 'YES' : 'no'}`,
      `time    ${s.time.toFixed(2)}s`,
      `frames  ${s.frameCount}`,
    ]

    const panelX = 6
    const panelY = 6
    const lineH = 18
    const panelW = 175
    const panelH = lines.length * lineH + 12

    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(panelX - 4, panelY - 4, panelW, panelH)

    ctx.fillStyle = DATA_COLOR
    lines.forEach((text, i) => {
      ctx.fillText(text, panelX, panelY + lineH * i + 13)
    })

    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '10px monospace'
    ctx.fillText('P to toggle', 6, this.canvas.height - 6)
  }
}

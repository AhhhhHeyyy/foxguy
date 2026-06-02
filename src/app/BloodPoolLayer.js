import { Sprite, Texture, CanvasSource } from 'pixi.js'
import { CANVAS_W, CANVAS_H } from './PixiApp.js'

const SCALE = 0.5
const CW = Math.round(CANVAS_W * SCALE)
const CH = Math.round(CANVAS_H * SCALE)
const BASE_Y_PCT  = 0.78
const SCROLL_SPEED  = 14   // px / sec

export default class BloodPoolLayer {
  constructor() {
    this.amp     = 1.0   // wave amplitude multiplier
    this.freq    = 1.0   // wave frequency multiplier
    this.spacing   = 60    // px between ridges (half-canvas)
    this.shadowStr = 1.0   // darkness of hill + ridge shadows (0–2)
    this.glowStr   = 1.0   // brightness of color blobs + hollow glow (0–2)

    this.topPct = BASE_Y_PCT  // where blood surface starts (0–1)

    // rectangular mask (yellow box) — clips final render to this region
    this.maskEnabled = false
    this.maskTop   = 0.78
    this.maskBot   = 1.0
    this.maskLeft  = 0.0
    this.maskRight = 1.0

    this._canvas = document.createElement('canvas')
    this._canvas.width  = CW
    this._canvas.height = CH
    this._ctx = this._canvas.getContext('2d')
    this._source  = new CanvasSource({ resource: this._canvas })
    this._texture = new Texture({ source: this._source })
    this.sprite = new Sprite(this._texture)
    this.sprite.scale.set(1 / SCALE)
    this.sprite.x = 0
    this.sprite.y = 0
  }

  tick(time) {
    this._draw(time)
    this._source.update()
  }

  _buildSurface(time) {
    const baseY = CH * this.topPct
    const pts = []
    for (let i = 0; i <= 100; i++) {
      const x = (i / 100) * CW
      const y = baseY
        + Math.sin(x * 0.010 * this.freq + time * 0.18) * 22 * this.amp
        + Math.sin(x * 0.025 * this.freq - time * 0.13) * 11 * this.amp
        + Math.sin(x * 0.055 * this.freq + time * 0.28) * 5  * this.amp
      pts.push([x, y])
    }
    return pts
  }

  _buildRidge(time, y) {
    const pts = []
    for (let i = 0; i <= 100; i++) {
      const x = (i / 100) * CW
      const ry = y
        + Math.sin(x * 0.009 * this.freq + time * 0.10) * 18 * this.amp
        + Math.sin(x * 0.022 * this.freq - time * 0.08) * 9 * this.amp
        + Math.sin(x * 0.050 * this.freq + time * 0.14) * 4 * this.amp
      pts.push([x, ry])
    }
    return pts
  }

  _trace(target, pts) {
    target.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = pts[i - 1]
      const [cx, cy] = pts[i]
      target.quadraticCurveTo(px, py, (px + cx) / 2, (py + cy) / 2)
    }
  }

  _poolClipPath(surfacePts) {
    const p = new Path2D()
    p.moveTo(0, CH)
    p.lineTo(surfacePts[0][0], surfacePts[0][1])
    for (let i = 1; i < surfacePts.length; i++) {
      const [px, py] = surfacePts[i - 1]
      const [cx, cy] = surfacePts[i]
      p.quadraticCurveTo(px, py, (px + cx) / 2, (py + cy) / 2)
    }
    p.lineTo(CW, CH)
    p.closePath()
    return p
  }

  _belowRidgePath(ridgePts) {
    const p = new Path2D()
    p.moveTo(ridgePts[0][0], ridgePts[0][1])
    for (let i = 1; i < ridgePts.length; i++) {
      const [px, py] = ridgePts[i - 1]
      const [cx, cy] = ridgePts[i]
      p.quadraticCurveTo(px, py, (px + cx) / 2, (py + cy) / 2)
    }
    p.lineTo(CW, CH)
    p.lineTo(0,  CH)
    p.closePath()
    return p
  }

  _avgY(pts) {
    return pts.reduce((s, [, y]) => s + y, 0) / pts.length
  }

  // Closed path that fills the band between two ridge curves
  _bandPath(upperPts, lowerPts) {
    const p = new Path2D()
    p.moveTo(upperPts[0][0], upperPts[0][1])
    for (let i = 1; i < upperPts.length; i++) {
      const [px, py] = upperPts[i - 1]
      const [cx, cy] = upperPts[i]
      p.quadraticCurveTo(px, py, (px + cx) / 2, (py + cy) / 2)
    }
    const lLast = lowerPts[lowerPts.length - 1]
    p.lineTo(lLast[0], lLast[1])
    for (let i = lowerPts.length - 1; i > 0; i--) {
      const [px, py] = lowerPts[i]
      const [cx, cy] = lowerPts[i - 1]
      p.quadraticCurveTo(px, py, (px + cx) / 2, (py + cy) / 2)
    }
    p.closePath()
    return p
  }

  _draw(time) {
    const ctx = this._ctx
    ctx.clearRect(0, 0, CW, CH)

    ctx.save()
    if (this.maskEnabled) {
      ctx.beginPath()
      ctx.rect(
        this.maskLeft  * CW,
        this.maskTop   * CH,
        (this.maskRight - this.maskLeft) * CW,
        (this.maskBot   - this.maskTop)  * CH,
      )
      ctx.clip()
    }

    const surfacePts = this._buildSurface(time)
    const poolPath   = this._poolClipPath(surfacePts)
    const surfaceY   = this._avgY(surfacePts)
    const poolH      = CH - surfaceY

    ctx.save()
    ctx.clip(poolPath)

    // Near-black base
    ctx.fillStyle = '#060000'
    ctx.fillRect(0, 0, CW, CH)

    // Animated blob centres — independent sine oscillations per axis/blob
    const s  = time * 0.001
    const gs = this.glowStr
    const blobs = [
      {
        x:  CW * (0.13 + 0.11 * Math.sin(s * 0.27)),
        y:  surfaceY + poolH * (0.48 + 0.20 * Math.sin(s * 0.21)),
        r:  CW * 0.60,
        c0: `rgba(210, 12, 12, ${0.95 * gs})`,
        c1: 'rgba(0, 0, 0, 0)',
      },
      {
        x:  CW * (0.87 + 0.10 * Math.sin(s * 0.19 + 1.1)),
        y:  surfaceY + poolH * (0.58 + 0.22 * Math.sin(s * 0.16 + 0.7)),
        r:  CW * 0.56,
        c0: `rgba(150, 6, 35, ${0.92 * gs})`,
        c1: 'rgba(0, 0, 0, 0)',
      },
      {
        x:  CW * (0.48 + 0.18 * Math.sin(s * 0.31 + 2.2)),
        y:  surfaceY + poolH * (0.16 + 0.10 * Math.sin(s * 0.24 + 1.8)),
        r:  CW * 0.40,
        c0: `rgba(240, 35, 8, ${0.72 * gs})`,
        c1: 'rgba(0, 0, 0, 0)',
      },
      {
        x:  CW * (0.40 + 0.16 * Math.sin(s * 0.23 + 3.5)),
        y:  surfaceY + poolH * (0.75 + 0.14 * Math.sin(s * 0.18 + 0.3)),
        r:  CW * 0.44,
        c0: `rgba(100, 4, 20, ${0.82 * gs})`,
        c1: 'rgba(0, 0, 0, 0)',
      },
    ]

    // Screen blend — where blobs overlap they brighten additively on the dark base
    ctx.globalCompositeOperation = 'screen'
    for (const { x, y, r, c0, c1 } of blobs) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, c0)
      g.addColorStop(1, c1)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, CW, CH)
    }
    ctx.globalCompositeOperation = 'source-over'

    // ── Hill shadows: dark bezier arches overlaid on blobs ───────────────────
    // Each hill is a filled arch path whose crest cuts across the bright blobs,
    // producing the hard-ish silhouette edge that gives volumetric wave depth.
    // The gradient is near-opaque at the crest and fades transparent downward,
    // so blob colour shows through underneath while being masked at the top.
    const hills = [
      {
        cx:    CW  * (0.60 + 0.12 * Math.sin(s * 0.20 + 0.5)),
        cy:    surfaceY + poolH * (0.20 + 0.08 * Math.sin(s * 0.17 + 0.3)),
        hw:    CW  * 0.52,
        depth: poolH * 0.74,
      },
      {
        cx:    CW  * (0.27 + 0.10 * Math.sin(s * 0.26 + 2.0)),
        cy:    surfaceY + poolH * (0.33 + 0.10 * Math.sin(s * 0.20 + 1.2)),
        hw:    CW  * 0.30,
        depth: poolH * 0.50,
      },
    ]

    for (const { cx, cy, hw, depth } of hills) {
      // Arch path: base sits at canvas bottom, curves up to crest
      const arch = new Path2D()
      arch.moveTo(cx - hw, CH + 2)
      arch.bezierCurveTo(
        cx - hw * 0.55, cy + depth * 0.28,
        cx - hw * 0.22, cy,
        cx,             cy
      )
      arch.bezierCurveTo(
        cx + hw * 0.22, cy,
        cx + hw * 0.55, cy + depth * 0.28,
        cx + hw,        CH + 2
      )
      arch.closePath()

      const ss = this.shadowStr
      const hillGrad = ctx.createLinearGradient(0, cy, 0, cy + depth * 0.88)
      hillGrad.addColorStop(0,    `rgba(3, 0, 0, ${0.93 * ss})`)
      hillGrad.addColorStop(0.28, `rgba(4, 0, 0, ${0.68 * ss})`)
      hillGrad.addColorStop(0.62, `rgba(3, 0, 0, ${0.26 * ss})`)
      hillGrad.addColorStop(1,    'rgba(0, 0, 0, 0)')
      ctx.save()
      ctx.filter = 'blur(14px)'
      ctx.fillStyle = hillGrad
      ctx.fill(arch)
      ctx.restore()

      // Crest highlight: faint bright stroke just below the arch peak,
      // simulates light catching the very top of a wave crest
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(cx - hw * 0.72, cy + depth * 0.16)
      ctx.bezierCurveTo(
        cx - hw * 0.22, cy + depth * 0.04,
        cx + hw * 0.22, cy + depth * 0.04,
        cx + hw * 0.72, cy + depth * 0.16
      )
      ctx.strokeStyle = `rgba(190, 35, 35, ${0.40 * this.glowStr})`
      ctx.lineWidth   = 1.8
      ctx.stroke()
      ctx.restore()

    }

    // ── Scrolling ridges: infinite downward loop ─────────────────────────────
    const sp        = this.spacing
    const maxRidges = Math.ceil(poolH / sp) + 3
    const loopLen   = maxRidges * sp
    const scrollPos = (time * SCROLL_SPEED) % loopLen

    const ridges = []
    for (let id = 0; id < maxRidges; id++) {
      const ry = surfaceY + ((id * sp + scrollPos) % loopLen)
      if (ry > CH + sp) continue
      ridges.push({ y: ry, pts: this._buildRidge(time, ry) })
    }

    const sorted  = [...ridges].sort((a, b) => a.y - b.y)
    const botPts  = Array.from({ length: 101 }, (_, i) => [(i / 100) * CW, CH + 2])
    const bounds  = [
      { y: surfaceY, pts: surfacePts },
      ...sorted,
      { y: CH,       pts: botPts },
    ]

    // Band fills: shadow under each crest bleeds into the hollow below
    for (let bi = 0; bi < bounds.length - 1; bi++) {
      const upper    = bounds[bi]
      const lower    = bounds[bi + 1]
      const depth    = Math.max(0, Math.min(1, (upper.y - surfaceY) / poolH))
      const avgBandH = Math.max(6, this._avgY(lower.pts) - this._avgY(upper.pts))

      ctx.save()
      ctx.clip(this._bandPath(upper.pts, lower.pts))

      // Dark shadow just below the crest
      ctx.filter = 'blur(5px)'
      ctx.beginPath()
      this._trace(ctx, upper.pts)
      ctx.strokeStyle = `rgba(0, 0, 0, ${(0.55 - depth * 0.15) * 0.70 * this.shadowStr})`
      ctx.lineWidth   = avgBandH * 0.52
      ctx.stroke()
      ctx.filter = 'none'

      // Warm hollow glow mid-band
      const glowPts = upper.pts.map(([x, y], i) => [x, y + (lower.pts[i][1] - y) * 0.42])
      ctx.beginPath()
      this._trace(ctx, glowPts)
      ctx.strokeStyle = `rgba(160, 10, 8, ${(0.44 - depth * 0.12) * 0.72 * this.glowStr})`
      ctx.lineWidth   = avgBandH * 0.48
      ctx.stroke()

      ctx.restore()
    }

    // Crest lines: drawn back-to-front (sorted by y ascending)
    for (let ri = 0; ri < sorted.length; ri++) {
      const ridge      = sorted[ri]
      const depth      = Math.max(0, Math.min(1, (ridge.y - surfaceY) / poolH))
      const alpha      = (1 - depth * 0.50) * 0.62
      const upperBound = bounds[ri]   // surface or previous ridge — the band above

      // Dark crest edge
      ctx.save()
      ctx.beginPath()
      this._trace(ctx, ridge.pts)
      ctx.strokeStyle = `rgba(5, 0, 0, ${alpha * this.shadowStr})`
      ctx.lineWidth   = 2.0
      ctx.stroke()
      ctx.restore()

      // Reddish sub-crest
      ctx.save()
      ctx.beginPath()
      this._trace(ctx, ridge.pts.map(([x, y]) => [x, y + 1.5]))
      ctx.strokeStyle = `rgba(185, 45, 45, ${alpha * 0.30 * this.glowStr})`
      ctx.lineWidth   = 1.0
      ctx.stroke()
      ctx.restore()

      // Upward glow: thick stroke clipped to the band ABOVE this ridge, then blurred.
      // Half of the lineWidth (21px) extends above the ridge centreline; the clip
      // removes the lower half, leaving a soft white glow that fades upward.
      ctx.save()
      ctx.clip(this._bandPath(upperBound.pts, ridge.pts))
      ctx.filter = 'blur(9px)'
      ctx.beginPath()
      this._trace(ctx, ridge.pts)
      ctx.strokeStyle = `rgba(255, 242, 240, ${(0.60 - depth * 0.18) * this.glowStr})`
      ctx.lineWidth   = 42
      ctx.stroke()
      ctx.filter = 'none'
      ctx.restore()

      // White specular: sharp bright crest line on top
      ctx.save()
      ctx.beginPath()
      this._trace(ctx, ridge.pts)
      ctx.strokeStyle = `rgba(255, 242, 240, ${(0.80 - depth * 0.25) * this.glowStr})`
      ctx.lineWidth   = 1.5
      ctx.stroke()
      ctx.restore()
    }

    ctx.restore()  // end pool clip

    // ── surface edge ─────────────────────────────────────────────────────────
    ctx.save()
    ctx.beginPath()
    this._trace(ctx, surfacePts)
    ctx.shadowBlur  = 8
    ctx.shadowColor = 'rgba(150, 8, 8, 0.45)'
    ctx.strokeStyle = 'rgba(195, 50, 50, 0.65)'
    ctx.lineWidth   = 2
    ctx.stroke()
    ctx.restore()

    ctx.restore()  // end mask clip
  }
}

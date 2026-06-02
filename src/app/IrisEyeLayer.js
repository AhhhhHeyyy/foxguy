import { Sprite, Texture, CanvasSource } from 'pixi.js'
import { canvas, tick as rendererTick, L, baseFx, limbalFx, petalFx, ringFx, fiberFx, vignetteFx, genFibers, genFlowBlobs } from './IrisRenderer.js'
import { CANVAS_W, CANVAS_H } from './PixiApp.js'

const W = 500, H = 500, R = 215

export default class IrisEyeLayer {
  constructor() {
    const source = new CanvasSource({ resource: canvas })
    this._source = source
    const texture = new Texture({ source })
    this.sprite = new Sprite(texture)

    // Position as % of art canvas (0–1)
    this.cxPct = 0.515
    this.cyPct = 0.27
    this.rPct  = 0.217

    this._parallaxDX = 0
    this._parallaxDY = 0
    this._zoomSz = 1
    this._applyTransform()

    // Expose state for LayerPanel
    this.L          = L
    this.baseFx     = baseFx
    this.limbalFx   = limbalFx
    this.petalFx    = petalFx
    this.ringFx     = ringFx
    this.fiberFx    = fiberFx
    this.vignetteFx = vignetteFx
    this.genFibers    = genFibers
    this.genFlowBlobs = genFlowBlobs
  }

  _applyTransform() {
    const artCX = CANVAS_W * this.cxPct
    const artCY = CANVAS_H * this.cyPct
    const artR  = CANVAS_H * this.rPct
    const scale = artR / R * this._zoomSz
    this.sprite.scale.set(scale)
    this._baseX = Math.round(artCX - (W / 2) * scale)
    this._baseY = Math.round(artCY - (H / 2) * scale)
    this.sprite.x = this._baseX + this._parallaxDX
    this.sprite.y = this._baseY + this._parallaxDY
  }

  applyParallax(dx, dy) {
    this._parallaxDX = dx
    this._parallaxDY = dy
    this.sprite.x = this._baseX + dx
    this.sprite.y = this._baseY + dy
  }

  applyZoom(sz) {
    this._zoomSz = sz
    this._applyTransform()
  }

  setTransform(cxPct, cyPct, rPct) {
    this.cxPct = cxPct
    this.cyPct = cyPct
    this.rPct  = rPct
    this._applyTransform()
  }

  tick() {
    rendererTick()
    this._source.update()
  }
}

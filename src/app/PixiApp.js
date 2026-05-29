import { Application } from 'pixi.js'

export const CANVAS_W = 1072
export const CANVAS_H = 1726

export default class PixiApp {
  constructor() {
    this.app = new Application()
    this.ready = this._init()
  }

  async _init() {
    await this.app.init({
      width: CANVAS_W,
      height: CANVAS_H,
      backgroundColor: 0x000000,
      antialias: false,
      resolution: Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
    })

    document.getElementById('app').appendChild(this.app.canvas)
    window.addEventListener('resize', () => this._resize())
    this._resize()
  }

  _resize() {
    const scale = Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H)
    this.app.canvas.style.width = `${CANVAS_W * scale}px`
    this.app.canvas.style.height = `${CANVAS_H * scale}px`
  }
}

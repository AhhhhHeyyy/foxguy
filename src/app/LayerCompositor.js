import { Sprite, Container, Assets } from 'pixi.js'
import IrisEyeLayer from './IrisEyeLayer.js'

const LAYERS_BEFORE = ['0', '1', '2', '3']
const LAYERS_AFTER  = ['4', '5']
const EYE_LAYERS    = ['6-1', '6-2']

export default class LayerCompositor {
  constructor(stage) {
    this.stage = stage
    this.sprites = {}
    this.irisEyeLayer = null
    this.eyelidContainer = null
    this.sprite61 = null
    this.sprite62 = null
  }

  async load() {
    const all = [...LAYERS_BEFORE, ...LAYERS_AFTER, ...EYE_LAYERS]
    const textures = await Assets.load(all.map((n) => `/assets/${n}.png`))

    for (const name of LAYERS_BEFORE) {
      const sprite = new Sprite(textures[`/assets/${name}.png`])
      sprite.x = 0
      sprite.y = 0
      this.sprites[name] = sprite
      this.stage.addChild(sprite)
    }

    // iris eye layer — sits between layer 3 and layer 4
    this.irisEyeLayer = new IrisEyeLayer()
    this.stage.addChild(this.irisEyeLayer.sprite)

    for (const name of LAYERS_AFTER) {
      const sprite = new Sprite(textures[`/assets/${name}.png`])
      sprite.x = 0
      sprite.y = 0
      this.sprites[name] = sprite
      this.stage.addChild(sprite)
    }

    this.eyelidContainer = new Container()
    this.sprite62 = new Sprite(textures['/assets/6-2.png'])
    this.sprite61 = new Sprite(textures['/assets/6-1.png'])
    this.eyelidContainer.addChild(this.sprite62)
    this.eyelidContainer.addChild(this.sprite61)
    this.stage.addChild(this.eyelidContainer)
  }
}

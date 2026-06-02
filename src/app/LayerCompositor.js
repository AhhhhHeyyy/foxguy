import { Sprite, Container, Assets } from 'pixi.js'
import IrisEyeLayer from './IrisEyeLayer.js'
import BloodPoolLayer from './BloodPoolLayer.js'

const LAYERS_A    = ['0', '1']          // below blood pool
const LAYERS_B    = ['2', '3']          // above blood pool
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
    this.bloodPool = null
  }

  async load() {
    const all = [...LAYERS_A, ...LAYERS_B, ...LAYERS_AFTER, ...EYE_LAYERS]
    const textures = await Assets.load(all.map((n) => `/assets/${n}.png`))

    for (const name of LAYERS_A) {
      const sprite = new Sprite(textures[`/assets/${name}.png`])
      sprite.x = 0
      sprite.y = 0
      this.sprites[name] = sprite
      this.stage.addChild(sprite)
    }

    // blood pool — sits between layer 1 and layer 2
    this.bloodPool = new BloodPoolLayer()
    this.sprites['blood'] = this.bloodPool.sprite
    this.stage.addChild(this.bloodPool.sprite)

    for (const name of LAYERS_B) {
      const sprite = new Sprite(textures[`/assets/${name}.png`])
      sprite.x = 0
      sprite.y = 0
      this.sprites[name] = sprite
      this.stage.addChild(sprite)
    }

    // iris eye layer — sits between layer 3 and layer 4
    this.irisEyeLayer = new IrisEyeLayer()
    this.stage.addChild(this.irisEyeLayer.sprite)

    this.layer45Container = new Container()
    for (const name of LAYERS_AFTER) {
      const sprite = new Sprite(textures[`/assets/${name}.png`])
      sprite.x = 0
      sprite.y = 0
      this.sprites[name] = sprite
      this.layer45Container.addChild(sprite)
    }
    this.stage.addChild(this.layer45Container)

    this.eyelidContainer = new Container()
    this.sprite62 = new Sprite(textures['/assets/6-2.png'])
    this.sprite61 = new Sprite(textures['/assets/6-1.png'])
    this.eyelidContainer.addChild(this.sprite62)
    this.eyelidContainer.addChild(this.sprite61)
    this.stage.addChild(this.eyelidContainer)
  }
}

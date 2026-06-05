import { Sprite, Container, Assets } from 'pixi.js'
import IrisEyeLayer from './IrisEyeLayer.js'
import BloodPoolLayer from './BloodPoolLayer.js'

const LAYERS_A    = ['0', '1']          // below smoke (bottom canvas)
const LAYERS_B    = ['2', '3']          // above blood pool (top canvas)
const LAYERS_AFTER  = ['4', '5']
const EYE_LAYERS    = ['6-1', '6-2']

export default class LayerCompositor {
  constructor(bottomStage, topStage) {
    this.bottomStage = bottomStage
    this.topStage = topStage
    this.sprites = {}
    this.irisEyeLayer = null
    this.eyelidContainer = null
    this.sprite61 = null
    this.sprite62 = null
    this.bloodPool = null
  }

  async load(onProgress) {
    const all = [...LAYERS_A, ...LAYERS_B, ...LAYERS_AFTER, ...EYE_LAYERS]
    const textures = await Assets.load(all.map((n) => `/assets/${n}.png`), onProgress)

    // Layers 0, 1 — bottom canvas (below smoke iframe)
    for (const name of LAYERS_A) {
      const sprite = new Sprite(textures[`/assets/${name}.png`])
      sprite.x = 0
      sprite.y = 0
      this.sprites[name] = sprite
      this.bottomStage.addChild(sprite)
    }

    // blood pool — top canvas, first child (directly above smoke)
    this.bloodPool = new BloodPoolLayer()
    this.sprites['blood'] = this.bloodPool.sprite
    this.topStage.addChild(this.bloodPool.sprite)

    for (const name of LAYERS_B) {
      const sprite = new Sprite(textures[`/assets/${name}.png`])
      sprite.x = 0
      sprite.y = 0
      this.sprites[name] = sprite
      this.topStage.addChild(sprite)
    }

    // iris eye layer — sits between layer 3 and layer 4
    this.irisEyeLayer = new IrisEyeLayer()
    this.topStage.addChild(this.irisEyeLayer.sprite)

    this.layer45Container = new Container()
    const sprite4 = new Sprite(textures['/assets/4.png'])
    sprite4.x = 16
    sprite4.y = 80
    sprite4.scale.set(0.98)
    this.sprites['4'] = sprite4
    this.layer45Container.addChild(sprite4)

    const sprite5 = new Sprite(textures['/assets/5.png'])
    sprite5.x = 0
    sprite5.y = 0
    this.sprites['5'] = sprite5
    sprite4.addChild(sprite5)

    this.topStage.addChild(this.layer45Container)

    // eyelidContainer is intentionally not added to topStage here;
    // main.js moves it to a dedicated canvas above app-top (app-eyelid, z-index 4)
    this.eyelidContainer = new Container()
    this.sprite62 = new Sprite(textures['/assets/6-2.png'])
    this.sprite61 = new Sprite(textures['/assets/6-1.png'])
    this.eyelidContainer.addChild(this.sprite62)
    this.eyelidContainer.addChild(this.sprite61)
  }
}

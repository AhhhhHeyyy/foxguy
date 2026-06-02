import AppState from './state/AppState.js'
import PixiApp, { CANVAS_W, CANVAS_H } from './app/PixiApp.js'
import LayerCompositor from './app/LayerCompositor.js'
import CameraManager from './vision/CameraManager.js'
import FaceLandmarkerManager from './vision/FaceLandmarker.js'
import { computeEAR, computeHeadPos } from './vision/EyeMetrics.js'
import EyelidAnimator from './animation/EyelidAnimator.js'
import { lerp } from './animation/Lerp.js'
import ParticleFilter from './shaders/ParticleFilter.js'
import DistortionFilter from './shaders/DistortionFilter.js'
import BloomFilter from './shaders/BloomFilter.js'
import DissolveFilter from './shaders/DissolveFilter.js'
import DebugOverlay from './debug/DebugOverlay.js'
import LayerPanel from './ui/LayerPanel.js'
import { parallaxConfig } from './app/ParallaxConfig.js'

const EAR_CLOSED = 0.18

async function main() {
  const videoEl = document.getElementById('webcam')

  const pixiApp = new PixiApp()
  await pixiApp.ready

  const compositor = new LayerCompositor(pixiApp.app.stage)
  await compositor.load()

  const animator = new EyelidAnimator(compositor.sprite61, compositor.sprite62)

  // Separate filter instances per layer for independent control
  const distortionFilter2 = new DistortionFilter()
  const distortionFilter4 = new DistortionFilter()
  const distortionFilter5 = new DistortionFilter()
  const dissolveFilter = new DissolveFilter()
  const bloomFilter = new BloomFilter()
  const particleFilter = new ParticleFilter()

  distortionFilter2.enabled = false
  distortionFilter4.enabled = false
  distortionFilter5.enabled = false
  dissolveFilter.enabled = false
  bloomFilter.enabled = false
  particleFilter.enabled = false

  compositor.sprites['2'].filters = [distortionFilter2]
  compositor.sprites['3'].filters = [dissolveFilter]
  compositor.sprites['4'].filters = [distortionFilter4]
  compositor.sprites['5'].filters = [distortionFilter5]
  pixiApp.app.stage.filters = [bloomFilter, particleFilter]

  // Start camera and face tracking (non-blocking — detect when ready)
  const camera = new CameraManager(videoEl)
  const faceLandmarker = new FaceLandmarkerManager()
  const debugOverlay = new DebugOverlay()

  new LayerPanel(compositor, {
    eyelidAnimator: animator,
    parallaxConfig,
    layerFilters: {
      '2': [{ filter: distortionFilter2, label: 'Distortion' }],
      '3': [{ filter: dissolveFilter, label: 'Dissolve' }],
      '4': [{ filter: distortionFilter4, label: 'Distortion' }],
      '5': [{ filter: distortionFilter5, label: 'Distortion' }],
    },
    stageFilters: [
      { filter: bloomFilter, label: 'Bloom' },
      { filter: particleFilter, label: 'Particle' },
    ],
  })

  // Render loop
  pixiApp.app.ticker.add((ticker) => {
    AppState.time += ticker.deltaMS / 1000
    AppState.frameCount++

    // MediaPipe detect (only when both are ready)
    if (camera.isReady && faceLandmarker.isReady) {
      const result = faceLandmarker.detect(videoEl)
      if (result && result.faceLandmarks.length > 0) {
        const lm = result.faceLandmarks[0]
        const { earAvg, gazeX, gazeY } = computeEAR(lm)
        AppState.rawEar = earAvg
        AppState.gaze.x = lerp(AppState.gaze.x, gazeX, 0.2)
        AppState.gaze.y = lerp(AppState.gaze.y, gazeY, 0.2)
        const { x: hx, y: hy, z: hz } = computeHeadPos(lm)
        AppState.head.x = lerp(AppState.head.x, hx, 0.08)
        AppState.head.y = lerp(AppState.head.y, hy, 0.08)
        AppState.head.z = lerp(AppState.head.z, hz, 0.08)
        debugOverlay.update(lm)
      } else {
        AppState.head.x = lerp(AppState.head.x, 0, 0.05)
        AppState.head.y = lerp(AppState.head.y, 0, 0.05)
        AppState.head.z = lerp(AppState.head.z, 0, 0.05)
        debugOverlay.update(null)
      }
    }
    debugOverlay.draw(AppState)

    // Smooth EAR
    AppState.ear = lerp(AppState.ear, AppState.rawEar, 0.15)

    // Blink detection (falling edge)
    const wasOpen = AppState.eyeOpen
    AppState.eyeOpen = AppState.ear > EAR_CLOSED
    if (wasOpen && !AppState.eyeOpen) {
      AppState.blink = true
      AppState.blinkAge = 0
    } else {
      AppState.blink = false
    }
    if (!AppState.eyeOpen) AppState.blinkAge++

    // Eyelid animation
    animator.update(AppState.ear)

    // Iris eye animation
    compositor.irisEyeLayer.tick()

    // Cel-layer parallax (head-tracked, simulates stacked transparency sheets)
    const px = -AppState.head.x * parallaxConfig.strengthX
    const py = -AppState.head.y * parallaxConfig.strengthY
    const pz =  AppState.head.z * parallaxConfig.strengthZ / 100
    for (const [key, depth] of Object.entries(parallaxConfig.layers)) {
      const sprite = compositor.sprites[key]
      if (sprite) {
        const sz = 1 + pz * depth
        sprite.scale.set(sz)
        sprite.x = px * depth + (1 - sz) * CANVAS_W / 2
        sprite.y = py * depth + (1 - sz) * CANVAS_H / 2
      }
    }
    const sz45 = 1 + pz * parallaxConfig.layer45
    compositor.layer45Container.scale.set(sz45)
    compositor.layer45Container.x = px * parallaxConfig.layer45 + (1 - sz45) * CANVAS_W / 2
    compositor.layer45Container.y = py * parallaxConfig.layer45 + (1 - sz45) * CANVAS_H / 2
    compositor.irisEyeLayer.applyZoom(1 + pz * parallaxConfig.iris)
    compositor.irisEyeLayer.applyParallax(px * parallaxConfig.iris, py * parallaxConfig.iris)
    const szLid = 1 + pz * parallaxConfig.eyelid
    compositor.eyelidContainer.scale.set(szLid)
    compositor.eyelidContainer.x = px * parallaxConfig.eyelid + (1 - szLid) * CANVAS_W / 2
    compositor.eyelidContainer.y = py * parallaxConfig.eyelid + (1 - szLid) * CANVAS_H / 2

    // Shader updates
    distortionFilter2.update(AppState)
    distortionFilter4.update(AppState)
    distortionFilter5.update(AppState)
    dissolveFilter.update(AppState)
    bloomFilter.update(AppState)
    particleFilter.update(AppState)
  })
}

main().catch(console.error)

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
import PaperGrainFilter from './shaders/PaperGrainFilter.js'
import DebugOverlay from './debug/DebugOverlay.js'
import LayerPanel from './ui/LayerPanel.js'
import { parallaxConfig } from './app/ParallaxConfig.js'

const EAR_CLOSED = 0.18
const EAR_OPEN   = 0.35

const loadingEl = document.getElementById('loading-info')
const setLoading = (msg) => { if (loadingEl) loadingEl.textContent = msg }
const clearLoading = () => {
  if (!loadingEl) return
  loadingEl.textContent = 'Done!'
  setTimeout(() => {
    loadingEl.style.opacity = '0'
    setTimeout(() => loadingEl.remove(), 800)
  }, 1000)
}

async function main() {
  const videoEl = document.getElementById('webcam')

  setLoading('Renderer… 0%')
  const pixiAppBottom = new PixiApp('app-bottom')
  const pixiAppTop    = new PixiApp('app-top')
  const pixiAppEyelid = new PixiApp('app-eyelid')
  await Promise.all([pixiAppBottom.ready, pixiAppTop.ready, pixiAppEyelid.ready])

  // Bottom and eyelid canvases are rendered manually each frame
  pixiAppBottom.app.ticker.stop()
  pixiAppEyelid.app.ticker.stop()

  setLoading('Loading layers… 10%')
  const compositor = new LayerCompositor(pixiAppBottom.app.stage, pixiAppTop.app.stage)
  await compositor.load((p) => setLoading(`Loading layers… ${Math.round(10 + p * 50)}%`))

  // Eyelid lives on its own canvas (z-index 4) above app-top so bloom doesn't affect it
  pixiAppEyelid.app.stage.addChild(compositor.eyelidContainer)

  const animator = new EyelidAnimator(compositor.sprite61, compositor.sprite62)

  // Separate filter instances per layer for independent control
  const distortionFilter2 = new DistortionFilter()
  const distortionFilter4 = new DistortionFilter()
  const distortionFilter5 = new DistortionFilter()
  const dissolveFilter = new DissolveFilter()
  const bloomFilter = new BloomFilter()
  const particleFilter = new ParticleFilter()
  const paperGrainFilter     = new PaperGrainFilter()
  const irisGrainFilter      = new PaperGrainFilter(500, 500)

  distortionFilter2.enabled = false
  distortionFilter4.enabled = false
  distortionFilter5.enabled = false
  dissolveFilter.enabled = false
  bloomFilter.enabled = true
  particleFilter.enabled = false

  compositor.bloodPool.sprite.filters    = [paperGrainFilter]
  compositor.irisEyeLayer.sprite.filters = [irisGrainFilter]

  compositor.sprites['2'].filters = [distortionFilter2]
  compositor.sprites['3'].filters = [dissolveFilter]
  compositor.sprites['4'].filters = [distortionFilter4]
  compositor.sprites['5'].filters = [distortionFilter5]
  pixiAppTop.app.stage.filters = [bloomFilter, particleFilter]

  // Start camera and face tracking (non-blocking — detect when ready)
  setLoading('Camera + AI… 60%')
  const camera = new CameraManager(videoEl)
  const faceLandmarker = new FaceLandmarkerManager()
  const debugOverlay = new DebugOverlay()

  let _cameraOk = false, _modelOk = false
  const _checkAllLoaded = () => { if (_cameraOk && _modelOk) clearLoading() }
  camera.ready.then(() => {
    _cameraOk = true
    if (!_modelOk) setLoading('AI model… 80%')
    else _checkAllLoaded()
  }).catch(() => { _cameraOk = true; _checkAllLoaded() })
  faceLandmarker.ready.then(() => {
    _modelOk = true
    if (!_cameraOk) setLoading('Camera… 80%')
    else _checkAllLoaded()
  }).catch(() => { _modelOk = true; _checkAllLoaded() })

  const layerPanel = new LayerPanel(compositor, {
    eyelidAnimator: animator,
    parallaxConfig,
    bloodPool: compositor.bloodPool,
    layerFilters: {
      '2': [{ filter: distortionFilter2, label: 'Distortion' }],
      '3': [{ filter: dissolveFilter, label: 'Dissolve' }],
      '4': [{ filter: distortionFilter4, label: 'Distortion' }],
      '5': [{ filter: distortionFilter5, label: 'Distortion' }],
      blood: [{ filter: paperGrainFilter, label: 'Paper Grain' }],
      iris:  [{ filter: irisGrainFilter,  label: 'Paper Grain' }],
    },
    stageFilters: [
      { filter: bloomFilter, label: 'Bloom' },
      { filter: particleFilter, label: 'Particle' },
    ],
  })

  // Mouse tracking for layer5 (normalized 0–1 across the viewport)
  const mouseRaw    = { x: 0.5, y: 0.5 }
  const mouseSmooth = { x: 0.5, y: 0.5 }
  window.addEventListener('mousemove', (e) => {
    mouseRaw.x = e.clientX / window.innerWidth
    mouseRaw.y = 1 - e.clientY / window.innerHeight
  })

  const DETECT_INTERVAL = 1000 / 30  // 30fps for face tracking
  let lastDetectTime = 0

  // Render loop — driven by top canvas ticker; bottom canvas rendered manually
  pixiAppTop.app.ticker.add((ticker) => {
    AppState.time += ticker.deltaMS / 1000
    AppState.frameCount++

    // MediaPipe detect at 15fps — decoupled from render to avoid GPU contention
    const now = performance.now()
    if (camera.isReady && faceLandmarker.isReady && now - lastDetectTime >= DETECT_INTERVAL) {
      lastDetectTime = now
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

    // Smooth EAR — fast when closing, slow when opening (natural blink feel)
    const earClosing = AppState.rawEar < AppState.ear
    AppState.ear = lerp(AppState.ear, AppState.rawEar, earClosing ? 0.5 : 0.15)

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

    // Eyelid animation — pass raw ear to skip double-smoothing
    animator.update(AppState.rawEar)

    // Iris eye animation — opacity + rotation speed driven by eye openness
    const openFactor = Math.max(0, Math.min(1, (AppState.ear - EAR_CLOSED) / (EAR_OPEN - EAR_CLOSED)))
    const irisSprite = compositor.irisEyeLayer.sprite
    irisSprite.alpha += (openFactor - irisSprite.alpha) * 0.08
    compositor.irisEyeLayer.tick(openFactor)

    // Blood pool animation
    compositor.bloodPool.tick(AppState.time)

    // Cel-layer parallax (head-tracked, simulates stacked transparency sheets)
    const px = -AppState.head.x * parallaxConfig.strengthX
    const py = -AppState.head.y * parallaxConfig.strengthY
    const pz =  AppState.head.z * parallaxConfig.strengthZ / 100
    layerPanel.updateParallaxValues(px, py, pz)
    for (const [key, depth] of Object.entries(parallaxConfig.layers)) {
      const sprite = compositor.sprites[key]
      if (sprite) {
        const sz = 1 + pz * depth
        sprite.scale.set(sz)
        sprite.x = px * depth + (1 - sz) * CANVAS_W / 2
        sprite.y = py * depth + (1 - sz) * CANVAS_H / 2
      }
    }

    // Blood pool parallax — preserve 2x base scale (half-res canvas)
    {
      const depth = 0.20
      const sz = 1 + pz * depth
      compositor.bloodPool.sprite.scale.set(2 * sz)
      compositor.bloodPool.sprite.x = px * depth + (1 - sz) * CANVAS_W / 2
      compositor.bloodPool.sprite.y = py * depth + (1 - sz) * CANVAS_H / 2
    }
    const sz45 = 1 + pz * parallaxConfig.layer45
    compositor.layer45Container.scale.set(sz45)
    compositor.layer45Container.x = px * parallaxConfig.layer45 + (1 - sz45) * CANVAS_W / 2
    compositor.layer45Container.y = py * parallaxConfig.layer45 + (1 - sz45) * CANVAS_H / 2

    // Layer 5 mouse tracking — maps mouse pos to sprite5 local offset within sprite4
    {
      const l5 = parallaxConfig.layer5Mouse
      if (l5.enabled) {
        if (l5.preview === 'A') {
          mouseSmooth.x = lerp(mouseSmooth.x, 0, 0.15)
        } else if (l5.preview === 'B') {
          mouseSmooth.x = lerp(mouseSmooth.x, 1, 0.15)
        } else if (!layerPanel.panelHovered) {
          mouseSmooth.x = lerp(mouseSmooth.x, mouseRaw.x, l5.lerpFactor)
        }
        const sprite5 = compositor.sprites['5']
        if (sprite5) {
          sprite5.x = lerp(l5.pointA.x, l5.pointB.x, mouseSmooth.x)
          sprite5.y = lerp(l5.pointA.y, l5.pointB.y, mouseSmooth.x)
        }
      }
    }
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
    paperGrainFilter.update(AppState)
    irisGrainFilter.update(AppState)

    // Render layers 0/1 (bottom canvas, ticker stopped)
    pixiAppBottom.render()
    // Render eyelid canvas separately (above bloom, ticker stopped)
    pixiAppEyelid.render()
  })
}

main().catch(console.error)

// Extracted verbatim from purple_iris_eye.html — minimal changes:
// - canvas created programmatically (not from DOM id)
// - requestAnimationFrame removed; call tick() each frame instead
// - mouse events removed (not needed in PixiJS context)
// - UI wiring removed (LayerPanel handles controls)

const W = 500, H = 500, cx = 250, cy = 250, R = 215, TAU = Math.PI * 2

export const canvas = document.createElement('canvas')
canvas.width  = W
canvas.height = H
const ctx = canvas.getContext('2d')

export const L = {
  base: true, limbal: false, fibres: false, wavy: true,
  petal1: true, petal2: true, rings: false, collarette: true, pupil: true, highlight: true,
}

export const baseFx = {
  stops: [
    { pos: 0.00, color: '#e8e8e8' },
    { pos: 0.25, color: '#c0c0c0' },
    { pos: 0.55, color: '#808080' },
    { pos: 0.78, color: '#404040' },
    { pos: 1.00, color: '#101010' },
  ]
}

export const petalFx = {
  petal1: { color: '#ffffff', blob: 4,  blur: 3,   stick: 6.5, speed: 0.5, opacity: 0.50, curl: 0.30, scale: 1.13 },
  petal2: { color: '#606060', blob: 5,  blur: 4,   stick: 9.5, speed: 1.3, opacity: 0.82, curl: 0.10, scale: 1.0 },
}

export const ringFx = { color: '#e0e0e0', blur: 28, stick: 28, opacity: 0.62, scale: 1.0 }

export const limbalFx = { color: '#000000', opacity: 0.82, range: 0.72 }

export const vignetteFx = { enabled: true, opacity: 0.85, range: 0.72 }

export const pupilFx = { size: 0.62, edge: 0.11 }

export const pupilRingFx = { enabled: true, color: '#5e3131', opacity: 1.0, width: 0.29, sharp: 1.0 }

function mkCanvas() {
  const el = document.createElement('canvas')
  el.width = W; el.height = H
  return [el, el.getContext('2d')]
}
const [raw1,    rctx1]    = mkCanvas()
const [raw2,    rctx2]    = mkCanvas()
const [baked1,  bctx1]    = mkCanvas()
const [baked2,  bctx2]    = mkCanvas()
const [gooRaw,  gooRctx]  = mkCanvas()
const [gooBake, gooBctx]  = mkCanvas()
const [ringRaw, ringRctx] = mkCanvas()
const [ringBake,ringBctx] = mkCanvas()

export const fiberFx = {
  count:    350,
  curl:     0.40,
  deepBlur: 1.0,
  scale:    1.0,
  goo: {
    color:   '#c8c8c8',
    blob:    6,
    blur:    4.5,
    stick:   4,
    swaySpd: 0.0040,
    swayAmp: 0.018,
    opacity: 0.54,
    curl:    0.22,
    scale:   1.0,
  },
}

let flowBlobs = []
export function genFlowBlobs() {
  const rand = makeRand(2718)
  flowBlobs = []
  for (let i = 0; i < 24; i++) {
    flowBlobs.push({
      baseR:  R * (0.38 + rand() * 0.32),
      a:      rand() * TAU,
      aSpd:   (rand() * 2 - 1) * 0.0010,
      aFreq:  rand() * 0.0020 + 0.0006,
      aAmp:   rand() * 0.35 + 0.10,
      aPhase: rand() * TAU,
      rFreq:  rand() * 0.0030 + 0.0008,
      rAmp:   rand() * 28 + 18,
      rPhase: rand() * TAU,
      sz:     rand() * 20 + 28,
    })
  }
}

function makeRand(seed) {
  let s = seed >>> 0
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296 }
}

const FIBER_BASE_R = R * 0.30
let fibers = []
export function genFibers() {
  const rand = makeRand(2025)
  const arr  = []
  for (let i = 0; i < fiberFx.count; i++) {
    const depth = i < fiberFx.count * 0.25 ? 0 : i < fiberFx.count * 0.60 ? 1 : 2
    arr.push({
      angle:  rand() * TAU,
      startR: FIBER_BASE_R + rand() * (depth === 0 ? 8 : 14),
      endR:   R - 6 - rand() * (depth === 0 ? 22 : 10),
      cpOff:  (rand() - 0.5) * fiberFx.curl * 0.55,
      cpT:    0.2 + rand() * 0.6,
      hShift: (rand() - 0.5) * 30,
      lShift: (rand() - 0.5) * 18,
      phase:  rand() * TAU,
      depth,
    })
  }
  fibers = arr.sort((a, b) => a.depth - b.depth)
}
genFibers()
genFlowBlobs()

const FIBER_LAYERS = [
  { alpha: 0.18, lw: 0.70, h: 272, s: 45, l: 20 },
  { alpha: 0.42, lw: 0.46, h: 262, s: 52, l: 36 },
  { alpha: 0.80, lw: 0.26, h: 280, s: 68, l: 72 },
]

function fiberPath(xctx, f, sway, curlMag, endROvr) {
  const angle = f.angle + sway
  const endR  = endROvr !== undefined ? endROvr : f.endR
  const sx = cx + Math.cos(angle) * f.startR, sy = cy + Math.sin(angle) * f.startR
  const ex = cx + Math.cos(angle) * endR,     ey = cy + Math.sin(angle) * endR
  const cpOff = curlMag !== undefined ? (f.cpOff >= 0 ? curlMag : -curlMag) : f.cpOff
  const cpRr  = f.startR + (endR - f.startR) * f.cpT
  xctx.beginPath()
  xctx.moveTo(sx, sy)
  xctx.quadraticCurveTo(cx + Math.cos(angle + cpOff) * cpRr, cy + Math.sin(angle + cpOff) * cpRr, ex, ey)
}

function drawDepthFibresDeepMid() {
  ctx.save()
  ctx.translate(cx, cy); ctx.scale(fiberFx.scale, fiberFx.scale); ctx.translate(-cx, -cy)
  for (let li = 0; li < 2; li++) {
    const lyr = FIBER_LAYERS[li]
    const lf  = fibers.filter(f => f.depth === li)
    ctx.save()
    if (li === 0 && fiberFx.deepBlur > 0) ctx.filter = `blur(${fiberFx.deepBlur}px)`
    ctx.lineCap = 'round'; ctx.lineWidth = lyr.lw
    for (const f of lf) {
      fiberPath(ctx, f, 0)
      const h = lyr.h + f.hShift, l = Math.max(5, lyr.l + f.lShift)
      ctx.strokeStyle = `hsla(${h},${lyr.s}%,${l}%,${lyr.alpha})`
      ctx.stroke()
    }
    ctx.filter = 'none'; ctx.restore()
  }
  ctx.restore()
}

function drawDepthFibresSurface() {
  const goo = fiberFx.goo
  const surfFibers = fibers.filter(f => f.depth === 2)
  const dynSpd = goo.swaySpd * (1 + 0.7 * Math.sin(t * 0.00040) + 0.3 * Math.sin(t * 0.00017))
  const travelPhase = t * 0.0014

  function surfSway(f) {
    const baseAng = f.angle + surfRotAngle
    return surfRotAngle
         + Math.sin(surfSwayPhase + f.phase) * goo.swayAmp
         + Math.sin(surfSwayPhase * 0.41 + f.phase * 1.8) * goo.swayAmp * 0.30
         + Math.sin(travelPhase - baseAng * 2.3) * goo.swayAmp * 0.45
  }
  function surfEndR(f) {
    const pulse = Math.sin(surfSwayPhase * 0.58 + f.phase * 2.1) * 9
                + Math.sin(travelPhase * 0.65 - f.angle * 3.1) * 5
    return Math.min(Math.max(f.endR + pulse, f.startR + 10), R - 3)
  }

  gooRctx.clearRect(0, 0, W, H)
  gooRctx.fillStyle = 'black'; gooRctx.fillRect(0, 0, W, H)
  gooRctx.strokeStyle = 'white'; gooRctx.fillStyle = 'white'
  gooRctx.lineWidth = goo.blob; gooRctx.lineCap = 'round'; gooRctx.lineJoin = 'round'
  for (const f of surfFibers) {
    const sway = surfSway(f), dynER = surfEndR(f)
    fiberPath(gooRctx, f, sway, goo.curl, dynER)
    gooRctx.stroke()
    const ang = f.angle + sway
    gooRctx.beginPath()
    gooRctx.arc(cx + Math.cos(ang) * dynER, cy + Math.sin(ang) * dynER, goo.blob * 0.65, 0, TAU)
    gooRctx.fill()
  }
  gooBctx.clearRect(0, 0, W, H)
  gooBctx.filter = `blur(${goo.blur}px) contrast(${goo.stick})`
  gooBctx.drawImage(gooRaw, 0, 0)
  gooBctx.filter = 'none'
  gooBctx.globalCompositeOperation = 'multiply'
  gooBctx.fillStyle = goo.color; gooBctx.fillRect(0, 0, W, H)
  gooBctx.globalCompositeOperation = 'screen'
  const gloss = gooBctx.createLinearGradient(60, 60, 420, 420)
  gloss.addColorStop(0,   'rgba(255,255,255,0.38)')
  gloss.addColorStop(0.4, 'rgba(255,255,255,0.0)')
  gooBctx.fillStyle = gloss; gooBctx.fillRect(0, 0, W, H)
  gooBctx.globalCompositeOperation = 'source-over'
  ctx.save()
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = goo.opacity
  ctx.translate(cx, cy); ctx.scale(goo.scale, goo.scale); ctx.translate(-cx, -cy)
  ctx.drawImage(gooBake, 0, 0)
  ctx.restore()

  const lyr = FIBER_LAYERS[2]
  const hueShift = Math.sin(t * 0.00055) * 14
  ctx.save()
  ctx.translate(cx, cy); ctx.scale(goo.scale, goo.scale); ctx.translate(-cx, -cy)
  ctx.lineCap = 'round'; ctx.lineWidth = lyr.lw
  for (const f of surfFibers) {
    const sway = surfSway(f), dynER = surfEndR(f)
    fiberPath(ctx, f, sway, goo.curl, dynER)
    const h = lyr.h + f.hShift + hueShift, l = Math.max(5, lyr.l + f.lShift)
    ctx.strokeStyle = `hsla(${h},${lyr.s}%,${l}%,${lyr.alpha})`
    ctx.stroke()
  }
  ctx.restore()
}

function drawFlowBlobs() {
  ringRctx.clearRect(0, 0, W, H)
  ringRctx.fillStyle = 'black'; ringRctx.fillRect(0, 0, W, H)
  ringRctx.fillStyle = 'white'
  for (const b of flowBlobs) {
    b.a += b.aSpd
    const angle = b.a + Math.sin(t * b.aFreq + b.aPhase) * b.aAmp
    const r     = b.baseR + Math.sin(t * b.rFreq + b.rPhase) * b.rAmp
    ringRctx.beginPath()
    ringRctx.arc(cx + Math.cos(angle) * Math.min(r, R * 0.88), cy + Math.sin(angle) * Math.min(r, R * 0.88), b.sz, 0, TAU)
    ringRctx.fill()
  }
  ringBctx.clearRect(0, 0, W, H)
  ringBctx.filter = `blur(${ringFx.blur}px) contrast(${ringFx.stick})`
  ringBctx.drawImage(ringRaw, 0, 0)
  ringBctx.filter = 'none'
  ringBctx.globalCompositeOperation = 'multiply'
  ringBctx.fillStyle = ringFx.color; ringBctx.fillRect(0, 0, W, H)
  ringBctx.globalCompositeOperation = 'source-over'
  ctx.save()
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = ringFx.opacity
  ctx.translate(cx, cy); ctx.scale(ringFx.scale, ringFx.scale); ctx.translate(-cx, -cy)
  ctx.drawImage(ringBake, 0, 0)
  ctx.restore()
}

function renderMetaball(rctx, rawCanvas, bctx, bakedCanvas, fx, drawStrokes) {
  rctx.clearRect(0, 0, W, H)
  rctx.fillStyle = 'black'; rctx.fillRect(0, 0, W, H)
  rctx.fillStyle = 'white'; rctx.strokeStyle = 'white'
  rctx.lineWidth = fx.blob; rctx.lineCap = 'round'; rctx.lineJoin = 'round'
  drawStrokes(rctx, fx)

  bctx.clearRect(0, 0, W, H)
  bctx.filter = `blur(${fx.blur}px) contrast(${fx.stick})`
  bctx.drawImage(rawCanvas, 0, 0)
  bctx.filter = 'none'
  bctx.globalCompositeOperation = 'multiply'
  bctx.fillStyle = fx.color; bctx.fillRect(0, 0, W, H)
  bctx.globalCompositeOperation = 'screen'
  const gloss = bctx.createLinearGradient(60, 60, 420, 420)
  gloss.addColorStop(0,   'rgba(255,255,255,0.38)')
  gloss.addColorStop(0.4, 'rgba(255,255,255,0.0)')
  bctx.fillStyle = gloss; bctx.fillRect(0, 0, W, H)
  bctx.globalCompositeOperation = 'source-over'

  ctx.save()
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = fx.opacity
  ctx.translate(cx, cy); ctx.scale(fx.scale, fx.scale); ctx.translate(-cx, -cy)
  ctx.drawImage(bakedCanvas, 0, 0)
  ctx.restore()
}

function drawP1(rctx, fx) {
  const colR = R * 0.46
  for (let i = 0; i < 38; i++) {
    const angle   = (i / 38) * TAU + t * 0.004 * fx.speed
    const breathe = Math.sin(t * 0.028 * fx.speed + i * TAU / 38) * 14
    const tipR    = colR + R * 0.22 + breathe, baseR = colR - R * 0.06
    const tipX = cx + Math.cos(angle) * tipR, tipY = cy + Math.sin(angle) * tipR
    const baseX = cx + Math.cos(angle) * baseR, baseY = cy + Math.sin(angle) * baseR
    const spread = fx.curl + 0.03 * Math.sin(t * 0.02 + i)
    rctx.beginPath()
    rctx.moveTo(baseX, baseY)
    rctx.quadraticCurveTo(cx + Math.cos(angle - spread) * (baseR + R * 0.04), cy + Math.sin(angle - spread) * (baseR + R * 0.04), tipX, tipY)
    rctx.moveTo(baseX, baseY)
    rctx.quadraticCurveTo(cx + Math.cos(angle + spread) * (baseR + R * 0.04), cy + Math.sin(angle + spread) * (baseR + R * 0.04), tipX, tipY)
    rctx.stroke()
    rctx.beginPath(); rctx.arc(tipX, tipY, fx.blob * 0.7, 0, TAU); rctx.fill()
  }
}

function drawP2(rctx, fx) {
  const col2R = R * 0.38
  for (let i = 0; i < 52; i++) {
    const angle   = (i / 52) * TAU - t * 0.003 * fx.speed + 0.06
    const breathe = Math.sin(t * 0.032 * fx.speed + i * TAU / 52) * 8
    const tipR    = col2R + R * 0.14 + breathe, baseR = col2R - R * 0.04
    const tipX = cx + Math.cos(angle) * tipR, tipY = cy + Math.sin(angle) * tipR
    const baseX = cx + Math.cos(angle) * baseR, baseY = cy + Math.sin(angle) * baseR
    const sp = fx.curl + 0.02 * Math.sin(t * 0.016 + i)
    rctx.beginPath()
    rctx.moveTo(baseX, baseY)
    rctx.quadraticCurveTo(cx + Math.cos(angle - sp) * (baseR + R * 0.03), cy + Math.sin(angle - sp) * (baseR + R * 0.03), tipX, tipY)
    rctx.moveTo(baseX, baseY)
    rctx.quadraticCurveTo(cx + Math.cos(angle + sp) * (baseR + R * 0.03), cy + Math.sin(angle + sp) * (baseR + R * 0.03), tipX, tipY)
    rctx.stroke()
    rctx.beginPath(); rctx.arc(tipX, tipY, fx.blob * 0.7, 0, TAU); rctx.fill()
  }
}

let t = 0, pupilScale = 1, targetPupil = 1, surfRotAngle = 0, surfSwayPhase = 0, irisOpenFactor = 1

function draw() {
  ctx.clearRect(0, 0, W, H)
  const pupilR = R * pupilFx.size * pupilScale

  ctx.save()
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip()

  if (L.base) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R)
    for (const s of baseFx.stops) g.addColorStop(s.pos, s.color)
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill()
  }

  if (L.limbal) {
    const hex = limbalFx.color
    const lr = parseInt(hex.slice(1,3),16), lg = parseInt(hex.slice(3,5),16), lb = parseInt(hex.slice(5,7),16)
    const g = ctx.createRadialGradient(cx, cy, R * limbalFx.range, cx, cy, R)
    g.addColorStop(0, `rgba(${lr},${lg},${lb},0)`)
    g.addColorStop(1, `rgba(${lr},${lg},${lb},${limbalFx.opacity})`)
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill()
  }

  if (L.fibres) drawDepthFibresDeepMid()
  if (L.wavy)   drawDepthFibresSurface()

  if (L.petal1) renderMetaball(rctx1, raw1, bctx1, baked1, petalFx.petal1, drawP1)
  if (L.petal2) renderMetaball(rctx2, raw2, bctx2, baked2, petalFx.petal2, drawP2)
  if (L.rings)  drawFlowBlobs()

  if (L.collarette) {
    ctx.strokeStyle = 'rgba(200,160,230,0.4)'
    ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.42, 0, TAU); ctx.stroke()
  }

  if (vignetteFx.enabled && vignetteFx.opacity > 0) {
    ctx.save()
    ctx.globalCompositeOperation = 'destination-in'
    const vg = ctx.createRadialGradient(cx, cy, R * vignetteFx.range, cx, cy, R)
    vg.addColorStop(0, 'rgba(0,0,0,1)')
    vg.addColorStop(1, `rgba(0,0,0,${1 - vignetteFx.opacity})`)
    ctx.fillStyle = vg
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill()
    ctx.restore()
  }

  if (L.pupil) {
    const soft = Math.max(0.01, Math.min(0.5, pupilFx.edge))
    const pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, pupilR)
    pg.addColorStop(0,        'rgba(0,0,0,1)')
    pg.addColorStop(1 - soft, 'rgba(0,0,0,1)')
    pg.addColorStop(1,        'rgba(0,0,0,0)')
    ctx.beginPath(); ctx.arc(cx, cy, pupilR, 0, TAU)
    ctx.fillStyle = pg; ctx.fill()
  }

  if (L.pupil && pupilRingFx.enabled && pupilRingFx.opacity > 0) {
    const hex = pupilRingFx.color
    const cr = parseInt(hex.slice(1,3),16), cg = parseInt(hex.slice(3,5),16), cb = parseInt(hex.slice(5,7),16)
    const innerR = pupilR * 0.84
    const outerR = pupilR * (1 + pupilRingFx.width)
    const peak   = (pupilR - innerR) / (outerR - innerR)
    const feather = Math.max(0.015, (1 - pupilRingFx.sharp) * 0.45)
    const lo = Math.max(0.005, peak - feather)
    const hi = Math.min(0.995, peak + feather)
    const opc = pupilRingFx.opacity
    const rg = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR)
    rg.addColorStop(0,   `rgba(${cr},${cg},${cb},0)`)
    rg.addColorStop(lo,  `rgba(${cr},${cg},${cb},${opc})`)
    rg.addColorStop(hi,  `rgba(${cr},${cg},${cb},${opc})`)
    rg.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`)
    ctx.save()
    ctx.beginPath(); ctx.arc(cx, cy, outerR, 0, TAU)
    ctx.fillStyle = rg; ctx.fill()
    ctx.restore()
  }

  ctx.restore() // end iris clip

  if (L.highlight) {
    const hx = cx - pupilR * 0.55, hy = cy - pupilR * 0.7
    const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, pupilR * 0.32)
    hg.addColorStop(0,   'rgba(255,255,255,0.9)')
    hg.addColorStop(0.5, 'rgba(255,255,255,0.45)')
    hg.addColorStop(1,   'rgba(255,255,255,0)')
    ctx.save()
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip()
    ctx.beginPath(); ctx.ellipse(hx, hy, pupilR * 0.32, pupilR * 0.2, -0.4, 0, TAU)
    ctx.fillStyle = hg; ctx.fill()
    ctx.restore()
  }
}

export function tick(openFactor = 1) {
  t++
  pupilScale += (targetPupil - pupilScale) * 0.055

  const phase   = (t * 0.01) % 1
  const autoSpd = phase < 0.5 ? phase * 200 : (1 - phase) * 200
  fiberFx.goo.swaySpd = autoSpd / 10000
  fiberFx.goo.swayAmp = (0.5 - 0.5 * Math.cos(t * 0.030)) * (100 / 2200)

  const dynSpd = fiberFx.goo.swaySpd * (1 + 0.7 * Math.sin(t * 0.00040) + 0.3 * Math.sin(t * 0.00017))
  irisOpenFactor += (openFactor - irisOpenFactor) * 0.06
  surfSwayPhase += dynSpd
  surfRotAngle += 0.0002 + irisOpenFactor * 0.0026
  draw()
}

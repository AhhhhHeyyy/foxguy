const LAYER_DEFS = [
  { key: '0', label: 'Layer 0' },
  { key: '1', label: 'Layer 1' },
  { key: 'blood', label: 'Blood Pool (1.5)' },
  { key: '2', label: 'Layer 2' },
  { key: 'iris', label: 'Iris Eye (2.5)' },
  { key: '3', label: 'Layer 3' },
  { key: '4', label: 'Layer 4' },
  { key: '5', label: 'Layer 5' },
  { key: 'eyelid', label: 'Eyelid (6)' },
]

export default class LayerPanel {
  constructor(compositor, { layerFilters = {}, stageFilters = [], eyelidAnimator = null, parallaxConfig = null, bloodPool = null } = {}) {
    this.compositor     = compositor
    this.layerFilters   = layerFilters
    this.stageFilters   = stageFilters
    this.eyelidAnimator = eyelidAnimator
    this.parallaxConfig = parallaxConfig
    this.bloodPool      = bloodPool
    this.visible = false
    this.panelHovered = false
    this._build()
    this._bindKey()
  }

  _build() {
    this.panel = document.createElement('div')
    this.panel.id = 'layer-panel'

    const title = document.createElement('div')
    title.className = 'lp-title'
    title.textContent = 'Layers'
    this.panel.appendChild(title)

    for (const def of LAYER_DEFS) {
      // collect sub-elements first so we know if a toggle arrow is needed
      const subEls = []
      for (const { filter, label } of (this.layerFilters[def.key] || [])) {
        subEls.push(this._buildFilterRow(filter, label, true))
      }
      if (def.key === 'blood' && this.bloodPool) {
        this._buildBloodPoolControls().forEach(el => subEls.push(el))
      }
      if (def.key === 'iris') {
        this._buildIrisControls().forEach(el => subEls.push(el))
      }
      if (def.key === '4') {
        const fi = (v) => String(Math.round(v))
        const f2 = (v) => v.toFixed(2)
        const sprite4 = this.compositor.sprites['4']
        subEls.push(this._sl('X',     -536, 536, 1,    sprite4 ? sprite4.x       : 0, (v) => { if (sprite4) sprite4.x = v },          fi))
        subEls.push(this._sl('Y',     -863, 863, 1,    sprite4 ? sprite4.y       : 0, (v) => { if (sprite4) sprite4.y = v },          fi))
        subEls.push(this._sl('Scale',  0.1,   3, 0.01, sprite4 ? sprite4.scale.x : 1, (v) => { if (sprite4) sprite4.scale.set(v) },   f2))
      }
      if (def.key === '5' && this.parallaxConfig?.layer5Mouse) {
        const l5 = this.parallaxConfig.layer5Mouse
        const fi = (v) => String(Math.round(v))
        const enableRow = document.createElement('label')
        enableRow.className = 'lp-filter-row lp-filter-indented'
        enableRow.style.cursor = 'pointer'
        const enableCb = document.createElement('input')
        enableCb.type = 'checkbox'; enableCb.checked = l5.enabled
        enableCb.addEventListener('change', () => { l5.enabled = enableCb.checked })
        const enableSp = document.createElement('span')
        enableSp.className = 'lp-filter-label'; enableSp.textContent = 'Mouse Track'
        enableRow.appendChild(enableCb); enableRow.appendChild(enableSp)
        subEls.push(enableRow)
        const sep = (text) => {
          const el = document.createElement('div')
          el.style.cssText = 'color:#5a3a7a;font-size:8px;letter-spacing:1px;padding:5px 4px 1px 22px;text-transform:uppercase'
          el.textContent = text
          return el
        }
        const previewBtns = {}
        const mkPreviewBtn = (point) => {
          const btn = document.createElement('button')
          btn.textContent = `Preview ${point}`
          btn.style.cssText = 'margin-left:6px;padding:0 6px;height:14px;font-size:8px;font-family:monospace;background:#1a0a2a;border:1px solid #5a3a7a;color:#9a6ab0;border-radius:2px;cursor:pointer;vertical-align:middle'
          previewBtns[point] = btn
          btn.addEventListener('click', () => {
            if (l5.preview === point) {
              l5.preview = null
              btn.style.background = '#1a0a2a'
              btn.style.color = '#9a6ab0'
            } else {
              l5.preview = point
              btn.style.background = '#5a3a7a'
              btn.style.color = '#fff'
              const other = point === 'A' ? 'B' : 'A'
              if (previewBtns[other]) {
                previewBtns[other].style.background = '#1a0a2a'
                previewBtns[other].style.color = '#9a6ab0'
              }
            }
          })
          return btn
        }
        const sepRowA = sep('Point A (滑鼠左側)'); sepRowA.appendChild(mkPreviewBtn('A')); subEls.push(sepRowA)
        subEls.push(this._slNum('A.X', -536, 536, 1, l5.pointA.x, (v) => { l5.pointA.x = v }))
        subEls.push(this._slNum('A.Y', -863, 863, 1, l5.pointA.y, (v) => { l5.pointA.y = v }))
        const sepRowB = sep('Point B (滑鼠右側)'); sepRowB.appendChild(mkPreviewBtn('B')); subEls.push(sepRowB)
        subEls.push(this._slNum('B.X', -536, 536, 1, l5.pointB.x, (v) => { l5.pointB.x = v }))
        subEls.push(this._slNum('B.Y', -863, 863, 1, l5.pointB.y, (v) => { l5.pointB.y = v }))
        subEls.push(this._slNum('LERP', 0.01, 1, 0.01, l5.lerpFactor, (v) => { l5.lerpFactor = v }))
      }
      if (def.key === 'eyelid' && this.eyelidAnimator) {
        const fi = (v) => String(Math.round(v))
        subEls.push(this._buildRangeRow(
          'Close', -500, 500, 1, this.eyelidAnimator.closeOffset,
          (v) => { this.eyelidAnimator.closeOffset = v }, true
        ))
        subEls.push(this._buildRangeRow(
          'Open', 0, 700, 1, this.eyelidAnimator.openOffset,
          (v) => { this.eyelidAnimator.openOffset = v }
        ))
        subEls.push(this._sl('6-1 Y', -500, 500, 1, this.eyelidAnimator.baseY61,
          (v) => { this.eyelidAnimator.baseY61 = v }, fi))
        subEls.push(this._sl('6-2 Y', -500, 500, 1, this.eyelidAnimator.baseY62,
          (v) => { this.eyelidAnimator.baseY62 = v }, fi))
      }

      const row = document.createElement('label')
      row.className = 'lp-row'
      const cb = document.createElement('input')
      cb.type = 'checkbox'; cb.checked = true
      cb.addEventListener('change', () => this._setVisible(def.key, cb.checked))
      const span = document.createElement('span')
      span.textContent = def.label

      if (subEls.length > 0) {
        const arrow = document.createElement('span')
        arrow.textContent = '▶'
        arrow.style.cssText = 'display:inline-block;width:10px;font-size:7px;color:#9a6ab0;margin-right:3px;cursor:pointer;user-select:none;flex-shrink:0;transition:transform 0.15s'

        const group = document.createElement('div')
        group.className = 'lp-sublayer-group'
        group.style.cssText = 'display:none;overflow:hidden'
        subEls.forEach(el => group.appendChild(el))

        if (def.key === '5') {
          group.addEventListener('mouseenter', () => { this.panelHovered = true })
          group.addEventListener('mouseleave', () => { this.panelHovered = false })
        }

        arrow.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          const isOpen = group.style.display !== 'none'
          group.style.display = isOpen ? 'none' : 'block'
          arrow.style.transform = isOpen ? '' : 'rotate(90deg)'
        })

        row.appendChild(arrow); row.appendChild(cb); row.appendChild(span)
        this.panel.appendChild(row)
        this.panel.appendChild(group)
      } else {
        row.appendChild(cb); row.appendChild(span)
        this.panel.appendChild(row)
      }
    }

    if (this.stageFilters.length > 0) {
      const divider = document.createElement('div')
      divider.className = 'lp-divider'
      this.panel.appendChild(divider)
      const stageLabel = document.createElement('div')
      stageLabel.className = 'lp-stage-label'
      stageLabel.textContent = 'Stage (全部)'
      this.panel.appendChild(stageLabel)
      for (const { filter, label } of this.stageFilters) {
        this.panel.appendChild(this._buildFilterRow(filter, label, false))
        if (typeof filter.color === 'string') {
          this.panel.appendChild(this._buildColorRow(filter))
        }
        if (filter.dark !== undefined) {
          this.panel.appendChild(this._sl('DARK', 0, 1, 0.01, filter.dark,
            (v) => { filter.dark = v }, (v) => v.toFixed(2)))
        }
      }
    }

    if (this.parallaxConfig) {
      const divider = document.createElement('div')
      divider.className = 'lp-divider'
      this.panel.appendChild(divider)
      this._buildParallaxControls(this.parallaxConfig).forEach(el => this.panel.appendChild(el))
    }

    const hint = document.createElement('div')
    hint.className = 'lp-hint'
    hint.textContent = 'P to toggle'
    this.panel.appendChild(hint)

    document.body.appendChild(this.panel)
    this.panel.style.display = 'none'
    this._buildSmokePanel()
  }

  // ── blood pool controls ───────────────────────────────────────────────────────

  _buildBloodPoolControls() {
    const bp = this.bloodPool
    const f2 = (v) => v.toFixed(2)
    const sep = (text) => {
      const el = document.createElement('div')
      el.style.cssText = 'color:#5a3a7a;font-size:8px;letter-spacing:1px;padding:5px 4px 1px 22px;text-transform:uppercase'
      el.textContent = text
      return el
    }
    const fi   = (v) => String(Math.round(v))
    const fpct = (v) => (v * 100).toFixed(0) + '%'

    const maskToggle = document.createElement('label')
    maskToggle.className = 'lp-filter-row lp-filter-indented'
    maskToggle.style.cursor = 'pointer'
    const maskCb = document.createElement('input')
    maskCb.type = 'checkbox'; maskCb.checked = bp.maskEnabled
    maskCb.addEventListener('change', () => { bp.maskEnabled = maskCb.checked })
    const maskSp = document.createElement('span')
    maskSp.className = 'lp-filter-label'; maskSp.textContent = 'Enable'
    maskToggle.appendChild(maskCb); maskToggle.appendChild(maskSp)

    return [
      sep('Lighting'),
      this._sl('SHAD', 0, 2, 0.05, bp.shadowStr, (v) => { bp.shadowStr = v }, f2),
      this._sl('GLOW', 0, 2, 0.05, bp.glowStr,   (v) => { bp.glowStr   = v }, f2),
      sep('Waves'),
      this._sl('AMP',  0.1, 6,   0.05, bp.amp,     (v) => { bp.amp     = v }, f2),
      this._sl('FREQ', 0.1, 6,   0.05, bp.freq,    (v) => { bp.freq    = v }, f2),
      this._sl('GAP',  10,  120, 1,    bp.spacing, (v) => { bp.spacing = v }, fi),
      sep('Range'),
      this._sl('TOP',  0,   1,   0.01, bp.topPct,  (v) => { bp.topPct  = v }, fpct),
      sep('Mask'),
      maskToggle,
      this._sl('T',    0,   1,   0.01, bp.maskTop,   (v) => { bp.maskTop   = v }, fpct),
      this._sl('B',    0,   1,   0.01, bp.maskBot,   (v) => { bp.maskBot   = v }, fpct),
      this._sl('L',    0,   1,   0.01, bp.maskLeft,  (v) => { bp.maskLeft  = v }, fpct),
      this._sl('R',    0,   1,   0.01, bp.maskRight, (v) => { bp.maskRight = v }, fpct),
    ]
  }

  // ── iris FX mixer (mirrors purple_iris_eye.html) ─────────────────────────────

  _buildIrisControls() {
    const iris = this.compositor.irisEyeLayer
    if (!iris) return []
    const { L, fiberFx, petalFx, ringFx, limbalFx } = iris
    const els = []

    // helper: section separator label
    const sep = (text) => {
      const el = document.createElement('div')
      el.style.cssText = 'color:#5a3a7a;font-size:8px;letter-spacing:1px;padding:5px 4px 1px 22px;text-transform:uppercase'
      el.textContent = text
      return el
    }

    // helper: sub-layer toggle row (indented checkbox)
    const chRow = (label, key, obj) => {
      const row = document.createElement('label')
      row.className = 'lp-filter-row lp-filter-indented'
      row.style.cursor = 'pointer'
      const cb = document.createElement('input')
      cb.type = 'checkbox'; cb.checked = obj[key]
      cb.addEventListener('change', () => { obj[key] = cb.checked })
      const sp = document.createElement('span')
      sp.className = 'lp-filter-label'; sp.textContent = label
      row.appendChild(cb); row.appendChild(sp)
      return row
    }

    // helper: slider with value label (+ optional color swatch before it)
    const sl = (lbl, min, max, step, val, cb, fmt) => {
      const row = document.createElement('div')
      row.className = 'lp-filter-row lp-filter-indented'
      const labelEl = document.createElement('span')
      labelEl.className = 'lp-filter-label'; labelEl.textContent = lbl
      const slider = document.createElement('input')
      slider.type = 'range'; slider.min = String(min); slider.max = String(max)
      slider.step = String(step); slider.value = String(val)
      slider.className = 'lp-filter-slider'
      const valEl = document.createElement('span')
      valEl.style.cssText = 'min-width:28px;color:#5a3a7a;font-size:8px;text-align:right;flex-shrink:0'
      valEl.textContent = fmt ? fmt(val) : String(val)
      slider.addEventListener('input', () => {
        const v = parseFloat(slider.value)
        valEl.textContent = fmt ? fmt(v) : String(v)
        cb(v)
      })
      row.appendChild(labelEl); row.appendChild(slider); row.appendChild(valEl)
      return row
    }

    // helper: slider with value label + editable max input
    const slMax = (lbl, min, max, step, val, cb, fmt) => {
      const row = document.createElement('div')
      row.className = 'lp-filter-row lp-filter-indented'
      const labelEl = document.createElement('span')
      labelEl.className = 'lp-filter-label'; labelEl.textContent = lbl
      const slider = document.createElement('input')
      slider.type = 'range'; slider.min = String(min); slider.max = String(max)
      slider.step = String(step); slider.value = String(val)
      slider.className = 'lp-filter-slider'
      const valEl = document.createElement('span')
      valEl.style.cssText = 'min-width:28px;color:#5a3a7a;font-size:8px;text-align:right;flex-shrink:0'
      valEl.textContent = fmt ? fmt(val) : String(val)
      slider.addEventListener('input', () => {
        const v = parseFloat(slider.value)
        valEl.textContent = fmt ? fmt(v) : String(v)
        cb(v)
      })
      const maxInput = document.createElement('input')
      maxInput.type = 'number'; maxInput.value = String(max)
      maxInput.className = 'lp-max-input'; maxInput.title = 'max'
      maxInput.addEventListener('change', () => {
        const newMax = parseFloat(maxInput.value)
        if (!isNaN(newMax)) {
          slider.max = String(newMax)
          if (parseFloat(slider.value) > newMax) {
            slider.value = String(newMax)
            valEl.textContent = fmt ? fmt(newMax) : String(newMax)
            cb(newMax)
          }
        }
      })
      row.appendChild(labelEl); row.appendChild(slider); row.appendChild(valEl); row.appendChild(maxInput)
      return row
    }

    // helper: color swatch row
    const colorRow = (initColor, onChange, label = 'CLR') => {
      const row = document.createElement('div')
      row.className = 'lp-filter-row lp-filter-indented'
      const lbl = document.createElement('span')
      lbl.className = 'lp-filter-label'; lbl.textContent = label
      const swatch = document.createElement('div')
      swatch.style.cssText = `flex:1;height:12px;border-radius:2px;border:1px solid #3a2a4a;background:${initColor};position:relative;overflow:hidden;cursor:pointer`
      const cp = document.createElement('input')
      cp.type = 'color'; cp.value = initColor
      cp.style.cssText = 'position:absolute;left:-4px;top:-4px;width:calc(100% + 8px);height:calc(100% + 8px);opacity:0;cursor:pointer;border:none'
      cp.addEventListener('input', () => { onChange(cp.value); swatch.style.background = cp.value })
      swatch.appendChild(cp)
      row.appendChild(lbl); row.appendChild(swatch)
      return row
    }

    const f1 = (v) => v % 1 === 0 ? String(v) : v.toFixed(1)
    const f2 = (v) => v.toFixed(2)
    const fpct = (v) => (v * 100).toFixed(1) + '%'

    // ── Position ──
    els.push(sep('Position'))
    els.push(sl('CX', 0, 1, 0.001, iris.cxPct, (v) => iris.setTransform(v,        iris.cyPct, iris.rPct), fpct))
    els.push(sl('CY', 0, 1, 0.001, iris.cyPct, (v) => iris.setTransform(iris.cxPct, v,        iris.rPct), fpct))
    els.push(sl('R',  0, 1, 0.001, iris.rPct,  (v) => iris.setTransform(iris.cxPct, iris.cyPct, v),       fpct))

    // ── Iris Base ──
    els.push(chRow('Iris Base', 'base', L))
    const { baseFx } = iris
    const posLabels = ['0%', '25%', '55%', '78%', '100%']
    baseFx.stops.forEach((s, i) => {
      els.push(colorRow(s.color, (v) => { s.color = v }, posLabels[i]))
    })

    // ── Limbal Ring ──
    els.push(chRow('Limbal Ring', 'limbal', L))
    els.push(colorRow(limbalFx.color, (v) => { limbalFx.color = v }))
    els.push(sl('OPC', 0, 1, 0.01, limbalFx.opacity, (v) => { limbalFx.opacity = v }, f2))
    els.push(sl('RNG', 0, 1, 0.01, limbalFx.range,   (v) => { limbalFx.range   = v }, f2))

    // ── Stromal Fibres ──
    els.push(sep('─────'))
    els.push(chRow('Stromal Fibres', 'fibres', L))
    els.push(sl('CNT', 20, 700, 10, fiberFx.count,      (v) => { fiberFx.count    = v;       iris.genFibers() }, f1))
    els.push(sl('CRL', 0,  100,  1, fiberFx.curl * 100, (v) => { fiberFx.curl     = v / 100; iris.genFibers() }, f1))
    els.push(sl('DBL', 0,   30,  0.5, fiberFx.deepBlur * 10, (v) => { fiberFx.deepBlur = v / 10 }, f1))
    els.push(sl('SCL', 0.1, 3, 0.01, fiberFx.scale,         (v) => { fiberFx.scale = v },          f2))

    // ── Surface + Gooey ──
    els.push(sep('─────'))
    els.push(chRow('Surface + Gooey', 'wavy', L))
    els.push(colorRow(fiberFx.goo.color, (v) => { fiberFx.goo.color = v }))
    els.push(sl('CRL', 0,  0.5,  0.005, fiberFx.goo.curl,          (v) => { fiberFx.goo.curl    = v },        f2))
    els.push(sl('BLB', 1,   40,  0.5,  fiberFx.goo.blob,           (v) => { fiberFx.goo.blob    = v },        f1))
    els.push(sl('BLR', 1,   30,  0.5,  fiberFx.goo.blur,           (v) => { fiberFx.goo.blur    = v },        f1))
    els.push(sl('STK', 4,   40,  0.5,  fiberFx.goo.stick,          (v) => { fiberFx.goo.stick   = v },        f1))
    {
      const goo = fiberFx.goo
      const row = document.createElement('div')
      row.className = 'lp-filter-row lp-filter-indented'
      const labelEl = document.createElement('span')
      labelEl.className = 'lp-filter-label'; labelEl.textContent = 'AMP'
      const slider = document.createElement('input')
      slider.type = 'range'; slider.min = '0'; slider.max = '100'
      slider.step = '1'; slider.value = String(Math.round(goo.swayAmp * 2200))
      slider.className = 'lp-filter-slider'
      const valEl = document.createElement('span')
      valEl.style.cssText = 'min-width:28px;color:#5a3a7a;font-size:8px;text-align:right;flex-shrink:0'
      valEl.textContent = String(Math.round(goo.swayAmp * 2200))
      slider.addEventListener('input', () => {
        const v = parseFloat(slider.value)
        valEl.textContent = String(Math.round(v))
        goo.swayAmp = v / 2200
      })
      row.appendChild(labelEl); row.appendChild(slider); row.appendChild(valEl)
      const sync = () => { const v = Math.round(goo.swayAmp * 2200); slider.value = String(v); valEl.textContent = String(v); requestAnimationFrame(sync) }
      requestAnimationFrame(sync)
      els.push(row)
    }
    els.push(sl('OPC', 5,  100,  1,    fiberFx.goo.opacity * 100,  (v) => { fiberFx.goo.opacity = v / 100 },  f1))
    els.push(sl('SCL', 0.1, 3, 0.01, fiberFx.goo.scale,           (v) => { fiberFx.goo.scale = v },           f2))

    // ── Petal Layer 1 ──
    els.push(sep('─────'))
    els.push(chRow('Petal Layer 1', 'petal1', L))
    els.push(colorRow(petalFx.petal1.color, (v) => { petalFx.petal1.color = v }))
    els.push(sl('CRL', 0,   0.5,  0.005, petalFx.petal1.curl,    (v) => { petalFx.petal1.curl    = v },   f2))
    els.push(sl('BLB', 2,   20,   0.5,  petalFx.petal1.blob,    (v) => { petalFx.petal1.blob    = v },   f1))
    els.push(sl('BLR', 1,   18,   0.5,  petalFx.petal1.blur,    (v) => { petalFx.petal1.blur    = v },   f1))
    els.push(sl('STK', 4,   35,   0.5,  petalFx.petal1.stick,   (v) => { petalFx.petal1.stick   = v },   f1))
    els.push(sl('SPD', 0.2,  3,   0.1,  petalFx.petal1.speed,   (v) => { petalFx.petal1.speed   = v },   (v) => v.toFixed(1)))
    els.push(sl('OPC', 0.1,  1,   0.01, petalFx.petal1.opacity, (v) => { petalFx.petal1.opacity = v },   f2))
    els.push(sl('SCL', 0.1,  3,   0.01, petalFx.petal1.scale,   (v) => { petalFx.petal1.scale   = v },   f2))

    // ── Petal Layer 2 ──
    els.push(sep('─────'))
    els.push(chRow('Petal Layer 2', 'petal2', L))
    els.push(colorRow(petalFx.petal2.color, (v) => { petalFx.petal2.color = v }))
    els.push(sl('CRL', 0,   0.5,  0.005, petalFx.petal2.curl,    (v) => { petalFx.petal2.curl    = v },   f2))
    els.push(sl('BLB', 2,   20,   0.5,  petalFx.petal2.blob,    (v) => { petalFx.petal2.blob    = v },   f1))
    els.push(sl('BLR', 1,   18,   0.5,  petalFx.petal2.blur,    (v) => { petalFx.petal2.blur    = v },   f1))
    els.push(sl('STK', 4,   35,   0.5,  petalFx.petal2.stick,   (v) => { petalFx.petal2.stick   = v },   f1))
    els.push(sl('SPD', 0.2,  3,   0.1,  petalFx.petal2.speed,   (v) => { petalFx.petal2.speed   = v },   (v) => v.toFixed(1)))
    els.push(sl('OPC', 0.1,  1,   0.01, petalFx.petal2.opacity, (v) => { petalFx.petal2.opacity = v },   f2))
    els.push(sl('SCL', 0.1,  3,   0.01, petalFx.petal2.scale,   (v) => { petalFx.petal2.scale   = v },   f2))

    // ── Liquid Flow ──
    els.push(sep('─────'))
    els.push(chRow('Liquid Flow', 'rings', L))
    els.push(colorRow(ringFx.color, (v) => { ringFx.color = v }))
    els.push(sl('BLR', 0, 35, 0.5, ringFx.blur,          (v) => { ringFx.blur    = v },       f1))
    els.push(sl('STK', 4, 30, 0.5, ringFx.stick,         (v) => { ringFx.stick   = v },       f1))
    els.push(sl('OPC', 5, 100, 1,  ringFx.opacity * 100, (v) => { ringFx.opacity = v / 100 }, f1))
    els.push(sl('SCL', 0.1, 3, 0.01, ringFx.scale,       (v) => { ringFx.scale   = v },       f2))

    // ── Vignette ──
    els.push(sep('─────'))
    const { vignetteFx } = iris
    els.push(chRow('Vignette', 'enabled', vignetteFx))
    els.push(sl('OPC', 0, 1, 0.01, vignetteFx.opacity, (v) => { vignetteFx.opacity = v }, f2))
    els.push(sl('RNG', 0, 1, 0.01, vignetteFx.range,   (v) => { vignetteFx.range   = v }, f2))

    // ── Collarette / Pupil / Specular ──
    els.push(sep('─────'))
    els.push(chRow('Collarette Ring', 'collarette', L))
    els.push(chRow('Pupil', 'pupil', L))
    const { pupilFx, pupilRingFx } = iris
    els.push(slMax('SZ',  0.05, 0.6,  0.01, pupilFx.size, (v) => { pupilFx.size = v }, f2))
    els.push(slMax('EDG', 0.01, 0.5,  0.01, pupilFx.edge, (v) => { pupilFx.edge = v }, f2))
    els.push(chRow('Pupil Ring', 'enabled', pupilRingFx))
    els.push(colorRow(pupilRingFx.color, (v) => { pupilRingFx.color = v }))
    els.push(sl('OPC', 0,    1,   0.01, pupilRingFx.opacity, (v) => { pupilRingFx.opacity = v }, f2))
    els.push(sl('WID', 0.02, 0.6, 0.01, pupilRingFx.width,   (v) => { pupilRingFx.width   = v }, f2))
    els.push(sl('SHP', 0,    1,   0.01, pupilRingFx.sharp,   (v) => { pupilRingFx.sharp   = v }, f2))
    els.push(chRow('Specular', 'highlight', L))

    return els
  }

  // ── smoke panel (standalone, right side) ────────────────────────────────────

  _buildSmokePanel() {
    this.smokePanel = document.createElement('div')
    this.smokePanel.id = 'smoke-panel'
    this.smokePanel.style.cssText = [
      'position:fixed', 'top:270px', 'right:10px', 'z-index:9999',
      'background:rgba(0,0,0,0.85)', 'border:1px solid rgba(0,200,255,0.8)',
      'border-radius:4px', 'padding:10px 14px', 'font-family:monospace',
      'color:#00e5ff', 'min-width:220px', 'user-select:none',
    ].join(';')

    const title = document.createElement('div')
    title.className = 'lp-title'
    title.textContent = 'Smoke'
    this.smokePanel.appendChild(title)

    for (const el of this._buildSmokeControls()) {
      el.classList.remove('lp-filter-indented')
      this.smokePanel.appendChild(el)
    }

    document.body.appendChild(this.smokePanel)
    this.smokePanel.style.display = 'none'
  }

  // ── smoke controls (postMessage → iframe) ───────────────────────────────────

  _buildSmokeControls() {
    const iframe = document.getElementById('smoke-bg')
    const post = (type, key, value) => iframe?.contentWindow?.postMessage({ type, key, value }, '*')
    const f2 = (v) => v.toFixed(2)
    const f3 = (v) => v.toFixed(3)
    const f1 = (v) => v.toFixed(1)
    const els = []

    els.push(this._sl('OPC',    0,     1,    0.01,  1.0,   (v) => post('smoke-disp', 'opacity', v), f2))
    els.push(this._sl('MASK',   0.05,  0.9,  0.01,  0.56,  (v) => post('smoke-disp', 'maskTop', v), f2))
    els.push(this._sl('RIMOFF', 0.001, 0.02, 0.001, 0.002, (v) => post('smoke-disp', 'rimOff',  v), f3))
    els.push(this._sl('RIMAMP', 1,     12,   0.1,   12.0,  (v) => post('smoke-disp', 'rimAmp',  v), f1))
    els.push(this._sl('RIMSTR', 0,     1.5,  0.01,  1.5,   (v) => post('smoke-disp', 'rimStr',  v), f2))

    const visLayers = [
      { key: 'bg',    label: '背景層', checked: true  },
      { key: 'bot',   label: '下層',   checked: true  },
      { key: 'top',   label: '上層',   checked: false },
      { key: 'cloud', label: '祥雲層', checked: true  },
    ]
    for (const { key, label, checked } of visLayers) {
      const row = document.createElement('label')
      row.className = 'lp-filter-row lp-filter-indented'
      row.style.cursor = 'pointer'
      const cb = document.createElement('input')
      cb.type = 'checkbox'; cb.checked = checked
      cb.addEventListener('change', () => post('smoke-vis', key, cb.checked))
      const sp = document.createElement('span')
      sp.className = 'lp-filter-label'; sp.textContent = label
      row.appendChild(cb); row.appendChild(sp)
      els.push(row)
    }

    return els
  }

  // ── parallax controls ────────────────────────────────────────────────────────

  updateParallaxValues(px, py, pz) {
    if (!this._pxEl) return
    this._pxEl.textContent = px.toFixed(1)
    this._pyEl.textContent = py.toFixed(1)
    this._pzEl.textContent = pz.toFixed(3)
  }

  _buildParallaxControls(cfg) {
    const f2 = (v) => v.toFixed(2)
    const els = []

    const label = document.createElement('div')
    label.className = 'lp-stage-label'
    label.textContent = 'Parallax'
    els.push(label)

    // live readout row
    const readout = document.createElement('div')
    readout.className = 'lp-filter-row lp-filter-indented'
    readout.style.cssText = 'gap:6px;font-size:8px;color:#9a6ab0;font-variant-numeric:tabular-nums'
    const mkSpan = (prefix) => {
      const wrap = document.createElement('span')
      wrap.style.cssText = 'display:flex;gap:2px;align-items:center'
      const lbl = document.createElement('span')
      lbl.style.cssText = 'color:#5a3a7a'
      lbl.textContent = prefix
      const val = document.createElement('span')
      val.style.cssText = 'min-width:34px'
      val.textContent = '0.0'
      wrap.appendChild(lbl); wrap.appendChild(val)
      return { wrap, val }
    }
    const rx = mkSpan('X:'); const ry = mkSpan('Y:'); const rz = mkSpan('Z:')
    this._pxEl = rx.val; this._pyEl = ry.val; this._pzEl = rz.val
    readout.appendChild(rx.wrap); readout.appendChild(ry.wrap); readout.appendChild(rz.wrap)
    els.push(readout)

    let cropX = 1, cropY = 1
    let insetT = 2.5, insetR = 4.5, insetB = 6.5, insetL = 4.5
    const updateCrop = () => {
      const canvases = [...document.querySelectorAll('#app-bottom canvas, #app-top canvas')]
      if (canvases.length === 0) return
      const s = Math.max(cropX, cropY)
      const anyInset = insetT > 0 || insetR > 0 || insetB > 0 || insetL > 0
      const clipVal = anyInset ? `inset(${insetT}% ${insetR}% ${insetB}% ${insetL}%)` : ''
      for (const c of canvases) {
        c.style.transform = s > 1 ? `scale(${s})` : ''
        c.style.clipPath = clipVal
      }
      const smoke = document.getElementById('smoke-bg')
      if (smoke) {
        smoke.style.transform = s > 1
          ? `translate(-50%, -50%) scale(${s})`
          : 'translate(-50%, -50%)'
        smoke.style.clipPath = clipVal
      }
    }
    const mkInset = (lbl, init, onChange) => {
      const row = document.createElement('div')
      row.className = 'lp-filter-row lp-filter-indented'
      const labelEl = document.createElement('span')
      labelEl.className = 'lp-filter-label'; labelEl.textContent = lbl
      const slider = document.createElement('input')
      slider.type = 'range'; slider.min = '0'; slider.max = '50'; slider.step = '0.5'
      slider.value = String(init); slider.className = 'lp-filter-slider'
      const numInput = document.createElement('input')
      numInput.type = 'number'; numInput.value = String(init); numInput.min = '0'; numInput.step = '0.5'
      numInput.className = 'lp-max-input'; numInput.style.width = '42px'
      slider.addEventListener('input', () => {
        const v = parseFloat(slider.value)
        numInput.value = String(v); onChange(v)
      })
      numInput.addEventListener('change', () => {
        const v = parseFloat(numInput.value)
        if (!isNaN(v) && v >= 0) { slider.value = String(Math.min(v, 50)); onChange(v) }
      })
      row.appendChild(labelEl); row.appendChild(slider); row.appendChild(numInput)
      return row
    }
    els.push(this._buildRangeRow('Crop X', 1, 3, 0.01, 1, (v) => { cropX = v; updateCrop() }))
    els.push(this._buildRangeRow('Crop Y', 1, 3, 0.01, 1, (v) => { cropY = v; updateCrop() }))
    els.push(mkInset('Top',    insetT, (v) => { insetT = v; updateCrop() }))
    els.push(mkInset('Right',  insetR, (v) => { insetR = v; updateCrop() }))
    els.push(mkInset('Bottom', insetB, (v) => { insetB = v; updateCrop() }))
    els.push(mkInset('Left',   insetL, (v) => { insetL = v; updateCrop() }))
    const fi = (v) => String(Math.round(v))
    els.push(this._sl('STR X', 0, 200, 1, cfg.strengthX, (v) => { cfg.strengthX = v }, fi))
    els.push(this._sl('STR Y', 0, 200, 1, cfg.strengthY, (v) => { cfg.strengthY = v }, fi))
    els.push(this._sl('STR Z', 0, 200, 1, cfg.strengthZ, (v) => { cfg.strengthZ = v }, fi))

    const depthLabel = document.createElement('div')
    depthLabel.style.cssText = 'color:#5a3a7a;font-size:8px;letter-spacing:1px;padding:5px 4px 1px 22px;text-transform:uppercase'
    depthLabel.textContent = 'Layer Depth'
    els.push(depthLabel)

    for (const key of ['0', '1', '2', '3']) {
      els.push(this._sl(`L${key}`, 0, 1, 0.01, cfg.layers[key], (v) => { cfg.layers[key] = v }, f2))
    }
    els.push(this._sl('L4+5', 0, 1, 0.01, cfg.layer45, (v) => { cfg.layer45 = v }, f2))
    els.push(this._sl('Iris', 0, 1, 0.01, cfg.iris,   (v) => { cfg.iris   = v }, f2))
    els.push(this._sl('Lid',  0, 1, 0.01, cfg.eyelid, (v) => { cfg.eyelid = v }, f2))

    setTimeout(updateCrop, 0)

    return els
  }

  // Like _sl but replaces the read-only value display with an editable number input
  _slNum(label, min, max, step, val, onChange) {
    const row = document.createElement('div')
    row.className = 'lp-filter-row lp-filter-indented'
    const labelEl = document.createElement('span')
    labelEl.className = 'lp-filter-label'; labelEl.textContent = label
    const slider = document.createElement('input')
    slider.type = 'range'; slider.min = String(min); slider.max = String(max)
    slider.step = String(step); slider.value = String(val)
    slider.className = 'lp-filter-slider'
    const numInput = document.createElement('input')
    numInput.type = 'number'; numInput.value = String(val); numInput.step = String(step)
    numInput.className = 'lp-max-input'; numInput.style.width = '48px'
    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value)
      numInput.value = String(v)
      onChange(v)
    })
    numInput.addEventListener('change', () => {
      const v = parseFloat(numInput.value)
      if (!isNaN(v)) {
        slider.min = String(Math.min(parseFloat(slider.min), v))
        slider.max = String(Math.max(parseFloat(slider.max), v))
        slider.value = String(v)
        onChange(v)
      }
    })
    row.appendChild(labelEl); row.appendChild(slider); row.appendChild(numInput)
    return row
  }

  _sl(label, min, max, step, val, onChange, fmt) {
    const row = document.createElement('div')
    row.className = 'lp-filter-row lp-filter-indented'
    const labelEl = document.createElement('span')
    labelEl.className = 'lp-filter-label'; labelEl.textContent = label
    const slider = document.createElement('input')
    slider.type = 'range'; slider.min = String(min); slider.max = String(max)
    slider.step = String(step); slider.value = String(val)
    slider.className = 'lp-filter-slider'
    const valEl = document.createElement('span')
    valEl.style.cssText = 'min-width:28px;color:#5a3a7a;font-size:8px;text-align:right;flex-shrink:0'
    valEl.textContent = fmt ? fmt(val) : String(val)
    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value)
      valEl.textContent = fmt ? fmt(v) : String(v)
      onChange(v)
    })
    row.appendChild(labelEl); row.appendChild(slider); row.appendChild(valEl)
    return row
  }

  // ── shared helpers ────────────────────────────────────────────────────────────

  _buildRangeRow(label, min, max, step, value, onChange, showMinInput = false) {
    const row = document.createElement('div')
    row.className = 'lp-filter-row lp-filter-indented'
    const labelEl = document.createElement('span')
    labelEl.className = 'lp-filter-label'; labelEl.textContent = label
    const slider = document.createElement('input')
    slider.type = 'range'; slider.min = String(min); slider.max = String(max)
    slider.step = String(step); slider.value = String(value)
    slider.className = 'lp-filter-slider'
    slider.addEventListener('input', () => onChange(parseFloat(slider.value)))
    const maxInput = document.createElement('input')
    maxInput.type = 'number'; maxInput.value = String(max)
    maxInput.className = 'lp-max-input'; maxInput.title = 'max'
    maxInput.addEventListener('change', () => {
      const newMax = parseFloat(maxInput.value)
      if (!isNaN(newMax)) {
        slider.max = String(newMax)
        if (parseFloat(slider.value) > newMax) { slider.value = String(newMax); onChange(newMax) }
      }
    })
    if (showMinInput) {
      const minInput = document.createElement('input')
      minInput.type = 'number'; minInput.value = String(min)
      minInput.className = 'lp-max-input'; minInput.title = 'min'
      minInput.addEventListener('change', () => {
        const newMin = parseFloat(minInput.value)
        if (!isNaN(newMin)) {
          slider.min = String(newMin)
          if (parseFloat(slider.value) < newMin) { slider.value = String(newMin); onChange(newMin) }
        }
      })
      row.appendChild(labelEl); row.appendChild(minInput); row.appendChild(slider); row.appendChild(maxInput)
    } else {
      row.appendChild(labelEl); row.appendChild(slider); row.appendChild(maxInput)
    }
    return row
  }

  _buildColorRow(filter) {
    const row = document.createElement('div')
    row.className = 'lp-filter-row lp-filter-indented'
    const lbl = document.createElement('span')
    lbl.className = 'lp-filter-label'; lbl.textContent = 'CLR'
    const swatch = document.createElement('div')
    swatch.style.cssText = `flex:1;height:12px;border-radius:2px;border:1px solid #3a2a4a;background:${filter.color};position:relative;overflow:hidden;cursor:pointer`
    const cp = document.createElement('input')
    cp.type = 'color'; cp.value = filter.color
    cp.style.cssText = 'position:absolute;left:-4px;top:-4px;width:calc(100% + 8px);height:calc(100% + 8px);opacity:0;cursor:pointer;border:none'
    cp.addEventListener('input', () => { filter.color = cp.value; swatch.style.background = cp.value })
    swatch.appendChild(cp)
    row.appendChild(lbl); row.appendChild(swatch)
    return row
  }

  _buildFilterRow(filter, label, indented) {
    const row = document.createElement('div')
    row.className = indented ? 'lp-filter-row lp-filter-indented' : 'lp-filter-row'
    const cb = document.createElement('input')
    cb.type = 'checkbox'; cb.checked = filter.enabled
    cb.addEventListener('change', () => { filter.enabled = cb.checked; slider.disabled = !cb.checked })
    const labelEl = document.createElement('span')
    labelEl.className = 'lp-filter-label'; labelEl.textContent = label
    const slider = document.createElement('input')
    slider.type = 'range'; slider.min = '0'; slider.max = '1'; slider.step = '0.01'; slider.value = '1'
    slider.className = 'lp-filter-slider'
    slider.disabled = !filter.enabled
    slider.addEventListener('input', () => { filter.intensity = parseFloat(slider.value) })
    row.appendChild(cb); row.appendChild(labelEl); row.appendChild(slider)
    return row
  }

  _setVisible(key, value) {
    if (key === 'eyelid') {
      this.compositor.eyelidContainer.visible = value
    } else if (key === 'iris') {
      this.compositor.irisEyeLayer.sprite.visible = value
    } else {
      this.compositor.sprites[key].visible = value
    }
  }

  _bindKey() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'p' || e.key === 'P') {
        this.visible = !this.visible
        this.panel.style.display = this.visible ? 'block' : 'none'
        if (this.smokePanel) this.smokePanel.style.display = this.visible ? 'block' : 'none'
      }
    })
  }
}

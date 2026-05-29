const LAYER_DEFS = [
  { key: '0', label: 'Layer 0' },
  { key: '1', label: 'Layer 1' },
  { key: '2', label: 'Layer 2' },
  { key: 'iris', label: 'Iris Eye (2.5)' },
  { key: '3', label: 'Layer 3' },
  { key: '4', label: 'Layer 4' },
  { key: '5', label: 'Layer 5' },
  { key: 'eyelid', label: 'Eyelid (6)' },
]

export default class LayerPanel {
  constructor(compositor, { layerFilters = {}, stageFilters = [], eyelidAnimator = null } = {}) {
    this.compositor   = compositor
    this.layerFilters = layerFilters
    this.stageFilters = stageFilters
    this.eyelidAnimator = eyelidAnimator
    this.visible = true
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
      const row = document.createElement('label')
      row.className = 'lp-row'
      const cb = document.createElement('input')
      cb.type = 'checkbox'; cb.checked = true
      cb.addEventListener('change', () => this._setVisible(def.key, cb.checked))
      const span = document.createElement('span')
      span.textContent = def.label
      row.appendChild(cb); row.appendChild(span)
      this.panel.appendChild(row)

      for (const { filter, label } of (this.layerFilters[def.key] || [])) {
        this.panel.appendChild(this._buildFilterRow(filter, label, true))
      }

      if (def.key === 'iris') {
        this._buildIrisControls().forEach(el => this.panel.appendChild(el))
      }

      if (def.key === 'eyelid' && this.eyelidAnimator) {
        this.panel.appendChild(this._buildRangeRow(
          'Open', 0, 200, 1, this.eyelidAnimator.maxOffset,
          (v) => { this.eyelidAnimator.maxOffset = v }
        ))
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
      }
    }

    const hint = document.createElement('div')
    hint.className = 'lp-hint'
    hint.textContent = 'L to toggle'
    this.panel.appendChild(hint)

    document.body.appendChild(this.panel)
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
    els.push(sl('AMP', 0,  100,  1,    fiberFx.goo.swayAmp * 2200, (v) => { fiberFx.goo.swayAmp = v / 2200 }, f1))
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
    els.push(chRow('Specular', 'highlight', L))

    return els
  }

  // ── shared helpers ────────────────────────────────────────────────────────────

  _buildRangeRow(label, min, max, step, value, onChange) {
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
    maxInput.type = 'number'; maxInput.min = '0'; maxInput.value = String(max)
    maxInput.className = 'lp-max-input'; maxInput.title = 'max'
    maxInput.addEventListener('change', () => {
      const newMax = parseFloat(maxInput.value)
      if (!isNaN(newMax) && newMax > 0) {
        slider.max = String(newMax)
        if (parseFloat(slider.value) > newMax) { slider.value = String(newMax); onChange(newMax) }
      }
    })
    row.appendChild(labelEl); row.appendChild(slider); row.appendChild(maxInput)
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
      if (e.key === 'l' || e.key === 'L') {
        this.visible = !this.visible
        this.panel.style.display = this.visible ? 'block' : 'none'
      }
    })
  }
}

# Foxguy

A real-time browser-based face-reactive character animation app. Your webcam feeds into an AI facial landmark detector, which drives a layered fox character's eyes, eyelids, and shader effects in sync with your face.

## Features

- **Real-time face tracking** — MediaPipe detects 468 facial landmarks at up to 60 fps using GPU acceleration
- **Eye Aspect Ratio (EAR)** — blink detection and eyelid animation that mirrors your eyes
- **Gaze tracking** — gaze direction shifts particle and distortion effects
- **Head-tracked parallax** — simulates the perspective of stacked cel animation (賽璐璐片) transparency sheets; moving your head left/right/up/down shifts each layer by a different amount based on its assigned depth, and leaning closer to the camera triggers a per-layer zoom effect
- **Layered shader pipeline** — bloom, particle, distortion, and dissolve effects composited over 8 sprite layers
- **FX Mixer** — each layer's effects can be toggled and adjusted independently; works like a DAW mixer channel with per-insert bypass and wet/dry control
- **Debug overlay** — optional landmark visualization canvas
- **Fully browser-based** — no server required after build; runs on WebGL 2

## Tech Stack

| Layer | Technology |
|---|---|
| Rendering | [Pixi.js](https://pixijs.com/) v8 (WebGL 2) |
| Face detection | [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) v0.10 |
| Build tooling | [Vite](https://vitejs.dev/) |
| Shaders | GLSL (vertex + fragment) |

## Getting Started

### Prerequisites

- Node.js 18+
- A browser with WebGL 2 support (Chrome / Edge recommended for SharedArrayBuffer + GPU acceleration)
- A webcam

### Install

```bash
npm install
```

### Run (development)

```bash
npm run dev
```

Open the URL printed by Vite. Grant camera permission when prompted — the app starts detecting immediately.

### Build

```bash
npm run build
```

Static output lands in `dist/`. Serve it behind a server that sets the required cross-origin isolation headers:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

These headers are needed for SharedArrayBuffer, which MediaPipe uses for GPU-accelerated inference.

### Preview build locally

```bash
npm run preview
```

Vite's preview server sets the headers automatically.

## UI Controls

### FX Mixer (`L` to toggle)

The left-side panel works like a DAW mixer — each layer is a channel, and each shader is an insert effect you can bypass or dial in. All layers and their effects are visible in one place:

| Element | Control |
|---|---|
| Layer checkbox | Show / hide that sprite layer |
| Effect checkbox | Enable / disable that shader on the layer |
| Effect slider | Adjust the effect intensity (0 – 1) |

Shader-to-layer mapping:

| Layer | Effect |
|---|---|
| Layer 2 | Distortion |
| Layer 3 | Dissolve |
| Layer 4 | Distortion |
| Layer 5 | Distortion |
| Stage (all layers) | Bloom, Particle |

Each layer with distortion has its own independent filter instance, so they can be tuned separately.

### Parallax (`L` to open panel → Parallax section)

Simulates the depth illusion of stacked cel animation sheets. As you move your head, foreground layers shift more than background layers. Moving closer to the camera scales layers up proportionally to their depth.

| Control | What it adjusts |
|---|---|
| **STR X** | Horizontal parallax strength (how much layers shift left/right) |
| **STR Y** | Vertical parallax strength |
| **STR Z** | Zoom strength (how much layers scale when you move closer/further) |
| **L0 – L3** | Individual depth coefficient for layers 0–3 (0 = no shift, 1 = full shift) |
| **L4+5** | Shared depth for layers 4 and 5 (grouped — they always move together) |
| **Iris** | Depth coefficient for the iris eye layer |
| **Lid** | Depth coefficient for the eyelid layer |

All sliders have a max input field on the right so you can extend the range beyond the default.

Z-axis distance is estimated from inter-ocular width in the normalized frame. The reference value is calibrated to a typical seated distance; leaning in raises `headZ` toward +1, leaning back lowers it toward −1.

### Debug Overlay (`` ` `` to toggle)

Displays the raw MediaPipe landmark mesh, iris positions, and live values for EAR, gaze, head position (`headX`, `headY`, `headZ`), blink state, and frame count.

## Shader Effects

| Effect | Driven by | What it does |
|---|---|---|
| **Distortion** | EAR, gaze | Warps UVs with a sine/cosine wave; magnitude scales with gaze distance |
| **Dissolve** | EAR, gaze | Radial alpha mask centred on the gaze point; edge glow brightens with eye openness |
| **Bloom** | EAR | Blurs and tints surrounding pixels; colour shifts from cool to warm as eyes open |
| **Particle** | EAR, gaze, blink | Scattered coloured dots that flare on blink and drift with gaze |

All shaders expose a `uIntensity` uniform (controlled by the UI slider) that scales the effect without altering how the face-tracking inputs drive it.

## Project Structure

```
src/
├── main.js                  # Entry point; 60 fps render loop
├── state/
│   └── AppState.js          # Shared runtime state (EAR, gaze, head, blink)
├── app/
│   ├── PixiApp.js           # Pixi application & canvas setup
│   ├── LayerCompositor.js   # Loads and manages 8 sprite layers
│   └── ParallaxConfig.js    # Shared parallax parameters (strength, per-layer depth)
├── vision/
│   ├── CameraManager.js     # Webcam stream (640×480)
│   ├── FaceLandmarker.js    # MediaPipe wrapper
│   └── EyeMetrics.js        # EAR, gaze, and head position computation
├── animation/
│   ├── EyelidAnimator.js    # Smooth eyelid open/close
│   └── Lerp.js              # Interpolation utilities
├── shaders/
│   ├── BloomFilter.js       # Stage-wide glow
│   ├── ParticleFilter.js    # Eye-state-reactive particles
│   ├── DistortionFilter.js  # Per-layer UV warp
│   ├── DissolveFilter.js    # Radial alpha dissolve
│   └── glsl/                # GLSL source files
├── ui/
│   └── LayerPanel.js        # FX Mixer — combined layer visibility + per-layer shader controls
└── debug/
    └── DebugOverlay.js      # Landmark visualizer
```

## How It Works

```
Webcam (640×480)
  └─► MediaPipe FaceLandmarker  (468 landmarks, GPU)
        └─► EyeMetrics          (EAR, gaze vector, head X/Y/Z)
              └─► AppState      (smoothed values)
                    ├─► EyelidAnimator     → sprite Y-offsets
                    ├─► Head position X/Y  → per-layer parallax translation
                    ├─► Head distance Z    → per-layer parallax scale (zoom)
                    └─► Shader uniforms    → bloom / particles / distortion / dissolve
                                              └─► Pixi.js WebGL render
```

## License

[MIT](LICENSE)

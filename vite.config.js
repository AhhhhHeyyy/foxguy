import { defineConfig } from 'vite'
import { copyFileSync, mkdirSync } from 'fs'

const suppressMediapipeSourcemapWarning = {
  name: 'suppress-mediapipe-sourcemap',
  configResolved(config) {
    const original = config.logger.warn.bind(config.logger)
    config.logger.warn = (msg, options) => {
      if (typeof msg === 'string' && msg.includes('@mediapipe') && msg.includes('source map')) return
      original(msg, options)
    }
  },
}

const copyFluidSim = {
  name: 'copy-fluid-sim',
  closeBundle() {
    mkdirSync('dist/fluid-sim-test', { recursive: true })
    copyFileSync('fluid-sim-test/smoke.html', 'dist/fluid-sim-test/smoke.html')
  },
}

export default defineConfig({
  plugins: [suppressMediapipeSourcemapWarning, copyFluidSim],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'SOURCEMAP_ERROR' && warning.message?.includes('@mediapipe')) return
        warn(warning)
      },
    },
  },
})

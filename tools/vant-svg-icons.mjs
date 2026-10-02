import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Vant components import icon CSS indirectly as well as through main.js.
// Replace that one stylesheet so no icon font or CDN fallback enters the app.
export function vantSvgIcons() {
  const fontStyles = createRequire(import.meta.url).resolve('vant/es/icon/index.css')
  const svgStyles = fileURLToPath(new URL('../src/styles/icons.css', import.meta.url))
  return {
    name: 'personal-vant-svg-icons',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!source.endsWith('.css')) return null
      const requested = source.startsWith('.') && importer
        ? resolve(dirname(importer), source) : source
      return requested === fontStyles || source === 'vant/es/icon/index.css' ? svgStyles : null
    },
  }
}

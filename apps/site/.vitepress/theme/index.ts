import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './style.css'

const paletteStorageKey = 'ngm-docs-palette'
const defaultPalette = 'default'

function applyPaletteClass() {
  if (typeof document === 'undefined') {
    return
  }

  const saved = window.localStorage.getItem(paletteStorageKey) || defaultPalette
  document.documentElement.setAttribute('data-ngm-palette', saved)
}

if (typeof document !== 'undefined') {
  applyPaletteClass()

  ;(window as typeof window & {
    __ngmSetPalette?: (palette: string) => void
  }).__ngmSetPalette = (palette: string) => {
    window.localStorage.setItem(paletteStorageKey, palette)
    document.documentElement.setAttribute('data-ngm-palette', palette)
  }
}

const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp() {
    applyPaletteClass()
  }
}

export default theme

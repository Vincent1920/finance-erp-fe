export type InterfaceDensity = 'comfortable' | 'standard' | 'compact'
export interface InterfacePreferences { density: InterfaceDensity; scale: 90 | 100 | 110; highContrast: boolean }
export const defaultInterfacePreferences: InterfacePreferences = { density: 'standard', scale: 100, highContrast: false }
const key = 'finora:interface-preferences'
export function loadInterfacePreferences(): InterfacePreferences {
  try { return { ...defaultInterfacePreferences, ...JSON.parse(localStorage.getItem(key) ?? '{}') } }
  catch { return { ...defaultInterfacePreferences } }
}
export function applyInterfacePreferences(value: InterfacePreferences) {
  document.documentElement.dataset.density = value.density
  document.documentElement.dataset.contrast = value.highContrast ? 'high' : 'normal'
  document.documentElement.style.fontSize = `${value.scale}%`
  localStorage.setItem(key, JSON.stringify(value))
}

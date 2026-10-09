import type { Shadows } from '@mui/material/styles'

/** 25-step elevation scale: soft, cool and layered; never coloured or neon. */
export function createShadows(rgb: string, strength: number): Shadows {
  const steps: string[] = ['none']
  for (let i = 1; i <= 24; i += 1) {
    const y = Math.round(i * 0.9 + 1)
    const blur = Math.round(i * 1.6 + 2)
    const spread = -Math.round(i * 0.25)
    const a = Math.min(0.05 + i * 0.005, 0.18) * strength
    steps.push(
      `0 ${y}px ${blur}px ${spread}px rgba(${rgb}, ${a.toFixed(3)}), 0 1px 2px rgba(${rgb}, ${(0.04 * strength).toFixed(3)})`,
    )
  }
  return steps as Shadows
}

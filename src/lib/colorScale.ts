/** Un point d'arrêt de dégradé : position 0-1 et couleur RGB à cette position. */
export type ColorStop = [number, [number, number, number]]

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Interpole une couleur RGB le long d'un dégradé à N points d'arrêt (t hors bornes → clampé). */
export function interpolateColor(stops: ColorStop[], t: number): string {
  const clamped = Math.min(1, Math.max(0, t))
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i]
    const [t1, c1] = stops[i + 1]
    if (clamped <= t1) {
      const localT = t1 === t0 ? 0 : (clamped - t0) / (t1 - t0)
      const rgb: [number, number, number] = [
        Math.round(lerp(c0[0], c1[0], localT)),
        Math.round(lerp(c0[1], c1[1], localT)),
        Math.round(lerp(c0[2], c1[2], localT)),
      ]
      return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
    }
  }
  const [, last] = stops[stops.length - 1]
  return `rgb(${last[0]}, ${last[1]}, ${last[2]})`
}

/** Gris neutre → rose → rouge accent : activation d'un muscle par un exercice précis. */
export const ACTIVATION_STOPS: ColorStop[] = [
  [0, [100, 116, 139]],
  [0.5, [236, 72, 153]],
  [1, [239, 68, 68]],
]

/** Vert → jaune → orange → rouge : intensité d'entraînement d'un muscle sur une période (heat map). */
export const HEAT_STOPS: ColorStop[] = [
  [0, [74, 222, 128]],
  [0.33, [250, 204, 21]],
  [0.66, [251, 146, 60]],
  [1, [239, 68, 68]],
]

export const NEUTRAL_MUSCLE_COLOR = 'var(--neutral-fill)'

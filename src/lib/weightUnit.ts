import { round1 } from './stats'
import type { WeightUnit } from './types'

const LB_PER_KG = 2.2046226218

/**
 * Les poids sont toujours stockés en kg (unité canonique) ; cette conversion
 * n'a lieu qu'à l'affichage et à la saisie, selon la préférence de l'utilisateur.
 */
export function toDisplayWeight(kg: number, unit: WeightUnit): number {
  return unit === 'lb' ? kg * LB_PER_KG : kg
}

/** Valeur saisie dans l'unité affichée → kg, pour le stockage. */
export function fromDisplayWeight(value: number, unit: WeightUnit): number {
  return unit === 'lb' ? value / LB_PER_KG : value
}

/** Poids arrondi (1 décimale) dans l'unité choisie, sans le libellé d'unité. */
export function displayWeightValue(kg: number, unit: WeightUnit): number {
  return round1(toDisplayWeight(kg, unit))
}

/** Poids formaté avec son unité, ex. "80 kg" / "176.4 lb". */
export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${displayWeightValue(kg, unit)} ${unit}`
}

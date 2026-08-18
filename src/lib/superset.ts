/** Découpe une liste ordonnée en groupes, en chaînant les éléments consécutifs marqués `linkedToNext`. */
export function groupBySuperset<T extends { linkedToNext?: boolean }>(items: T[]): T[][] {
  const groups: T[][] = []
  let current: T[] = []
  for (const item of items) {
    current.push(item)
    if (!item.linkedToNext) {
      groups.push(current)
      current = []
    }
  }
  if (current.length) groups.push(current)
  return groups
}

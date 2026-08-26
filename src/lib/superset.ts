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

/**
 * Déplace tout le groupe (superset ou exercice seul) contenant `itemId` d'un
 * cran vers le haut ou le bas, en gardant les groupes intacts. Sans effet si
 * le groupe est déjà à l'extrémité correspondante.
 */
export function moveGroup<T extends { id: string; linkedToNext?: boolean }>(
  items: T[],
  itemId: string,
  direction: 'up' | 'down',
): T[] {
  const groups = groupBySuperset(items)
  const groupIndex = groups.findIndex((group) => group.some((item) => item.id === itemId))
  if (groupIndex === -1) return items
  const targetIndex = direction === 'up' ? groupIndex - 1 : groupIndex + 1
  if (targetIndex < 0 || targetIndex >= groups.length) return items
  const reordered = [...groups]
  ;[reordered[groupIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[groupIndex]]
  return reordered.flat()
}

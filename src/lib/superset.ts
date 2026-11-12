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

/** Déplace le groupe (superset ou exercice seul) de la position `from` à la position `to`, groupes intacts. */
export function reorderGroups<T extends { linkedToNext?: boolean }>(items: T[], from: number, to: number): T[] {
  const groups = groupBySuperset(items)
  if (from === to || from < 0 || to < 0 || from >= groups.length || to >= groups.length) return items
  const [moved] = groups.splice(from, 1)
  groups.splice(to, 0, moved)
  return groups.flat()
}

type IconProps = { size?: number }

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export function IconCalendar({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
}

export function IconCalendarCheck({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="m8.5 14.5 2 2 4.5-4.5" />
    </svg>
  )
}

export function IconClipboard({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9 11h6M9 15h6" />
    </svg>
  )
}

export function IconDumbbell({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M4 9v6M2 10.5v3M6 7v10" />
      <path d="M20 9v6M22 10.5v3M18 7v10" />
      <path d="M8 12h8" />
    </svg>
  )
}

export function IconTrendingUp({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M15 6h6v6" />
    </svg>
  )
}

export function IconChevronLeft({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

export function IconChevronRight({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

export function IconChevronDown({ size = 18, open = false }: IconProps & { open?: boolean }) {
  return (
    <svg
      {...base(size)}
      aria-hidden="true"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function IconArrowUp({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  )
}

export function IconArrowDown({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  )
}

export function IconStar({ size = 18, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(size)} fill={filled ? 'currentColor' : 'none'} aria-hidden="true">
      <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
    </svg>
  )
}

export function IconClose({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

export function IconTrash({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3" />
    </svg>
  )
}

export function IconPlus({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function IconMinus({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M5 12h14" />
    </svg>
  )
}

export function IconCheck({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export function IconEdit({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

export function IconFlame({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M12 22c4.4 0 7-2.7 7-6.5 0-3-2-5-3.3-7C15 10 14 11.3 14 11.3 14.4 8 13 4 9.8 2c.6 3 -.3 5-2 7-1.6 2-2.8 3.7-2.8 6.5C5 19.3 7.6 22 12 22Z" />
    </svg>
  )
}

export function IconPlay({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true" fill="currentColor" stroke="none">
      <path d="M7 4.5v15l13-7.5Z" />
    </svg>
  )
}

export function IconStop({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true" fill="currentColor" stroke="none">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}

export function IconPause({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true" fill="currentColor" stroke="none">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

export function IconSkipBack({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true" fill="currentColor" stroke="none">
      <rect x="5" y="4" width="2.4" height="16" rx="1" />
      <path d="M19 4.5v15L8 12Z" />
    </svg>
  )
}

export function IconSkipForward({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true" fill="currentColor" stroke="none">
      <rect x="16.6" y="4" width="2.4" height="16" rx="1" />
      <path d="M5 4.5v15l11-7.5Z" />
    </svg>
  )
}

export function IconHeart({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M12 20s-7-4.35-9.5-8.5C1 8 2.5 4.5 6 4c2-.3 4 .7 6 3 2-2.3 4-3.3 6-3 3.5.5 5 4 3.5 7.5C19 15.65 12 20 12 20Z" />
    </svg>
  )
}

export function IconSettings({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  )
}

export function IconTimer({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2M9 2h6" />
    </svg>
  )
}

export function IconInfo({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.5v.01" />
    </svg>
  )
}

/** Petit post-it jaune, pour signaler un commentaire sur un jour du calendrier. */
export function IconStickyNote({ size = 12 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 3h13l7 7v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="#facc15" />
      <path d="M17 3v5a2 2 0 0 0 2 2h5" fill="#eab308" />
    </svg>
  )
}

/** Pictogramme Spotify (trois ondes sonores dans un disque) sur leur vert de marque. */
export function IconSpotifyLogo({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#1ED760" />
      <path d="M6.3 9.2c3.5-1 7.9-.8 11 1.1" stroke="#000" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M6 12.7c3-.9 7.1-.7 10 .9" stroke="#000" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M6.4 16c2.4-.6 5.6-.5 7.8.8" stroke="#000" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export function Logo({ size = 84 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true">
      <circle cx="48" cy="48" r="46" fill="#1e293b" stroke="#ef4444" strokeWidth="3" />
      <path
        d="M20 48h6M26 40v16M32 36v24M64 36v24M70 40v16M76 48h6M32 48h32"
        fill="none"
        stroke="#ef4444"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

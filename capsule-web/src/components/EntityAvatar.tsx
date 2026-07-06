/**
 * A client/firm avatar: shows the uploaded logo when present, otherwise a
 * generated initials monogram with a deterministic colour derived from the
 * name (so each entity reads as distinct at a glance).
 */

// Carbon-ish accessible background hues; text is white on all of them.
const COLORS = [
  '#0f62fe', '#8a3ffc', '#007d79', '#d02670', '#1192e8',
  '#9f1853', '#198038', '#6929c4', '#b28600', '#ee538b',
]

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function EntityAvatar({
  name,
  logo,
  size = 48,
}: {
  name: string
  logo?: string
  size?: number
}) {
  if (logo) {
    return (
      <img
        src={logo}
        alt=""
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          objectFit: 'cover',
          display: 'block',
          background: '#fff',
        }}
      />
    )
  }
  const bg = COLORS[hash(name) % COLORS.length]
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        background: bg,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.4),
        fontWeight: 600,
        lineHeight: 1,
        userSelect: 'none',
      }}
    >
      {initials(name)}
    </div>
  )
}

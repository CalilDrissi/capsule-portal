import { useRef, useState } from 'react'
import { Button, InlineNotification } from '@carbon/react'
import { Image as ImageIcon, TrashCan } from '@carbon/icons-react'
import EntityAvatar from './EntityAvatar'
import { fileToLogoDataUrl } from '../lib/image'

/**
 * Logo picker for a client/firm edit form. Shows the current avatar (uploaded
 * logo or generated monogram) with buttons to upload a new image (resized to a
 * compact data URI) or remove it. Value is the data URI ('' = no logo).
 */
export default function LogoUpload({
  name,
  value,
  onChange,
}: {
  name: string
  value: string
  onChange: (dataUrl: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    try {
      onChange(await fileToLogoDataUrl(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'utiliser cette image.")
    }
  }

  return (
    <div>
      <p className="cds--label">Logo</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <EntityAvatar name={name || '?'} logo={value} size={56} />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Button
          kind="tertiary"
          size="sm"
          renderIcon={ImageIcon}
          onClick={() => inputRef.current?.click()}
        >
          {value ? 'Remplacer le logo' : 'Importer un logo'}
        </Button>
        {value && (
          <Button
            kind="ghost"
            size="sm"
            renderIcon={TrashCan}
            onClick={() => onChange('')}
          >
            Retirer
          </Button>
        )}
      </div>
      {error && (
        <InlineNotification
          kind="error"
          title="Impossible d'utiliser cette image"
          subtitle={error}
          lowContrast
          hideCloseButton
          style={{ marginTop: '0.5rem' }}
        />
      )}
    </div>
  )
}

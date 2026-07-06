import { useEffect, useState } from 'react'
import {
  Button,
  InlineNotification,
  Select,
  SelectItem,
  SkeletonText,
  Stack,
  Tag,
  TextInput,
  Tile,
} from '@carbon/react'
import { Add, Save } from '@carbon/icons-react'
import PageBreadcrumb from '../components/PageBreadcrumb'
import { useFirmSettings, useUpdateFirmSettings } from '../api/queries'
import { useAppStore } from '../store/useAppStore'
import { notify } from '../store/useNotifications'

const BASIS_OPTIONS = [
  { value: 'document_date', label: 'Date du document' },
  { value: 'upload_date', label: "Date d'importation" },
  { value: 'created_date', label: 'Date de création' },
]
const DEPTH_OPTIONS = [
  { value: 'Y', label: 'Année' },
  { value: 'YM', label: 'Année / Mois' },
  { value: 'YQM', label: 'Année / Trimestre / Mois' },
]

/**
 * Accountant "Grouping" settings: configure the firm's period basis + depth
 * (which rebuilds the period index) and the categories clients pick at upload.
 */
export default function FirmSettingsPage() {
  const firm = useAppStore((s) => s.firm)
  const firmId = firm?.id ?? null
  const settings = useFirmSettings(firmId)
  const update = useUpdateFirmSettings(firmId)

  const [basis, setBasis] = useState('created_date')
  const [depth, setDepth] = useState('YM')
  const [categories, setCategories] = useState<string[]>([])
  const [newCategory, setNewCategory] = useState('')

  // Seed local form state once settings load.
  useEffect(() => {
    if (settings.data) {
      setBasis(settings.data.period_basis)
      setDepth(settings.data.period_depth)
      setCategories(settings.data.categories ?? [])
    }
  }, [settings.data])

  function addCategory() {
    const value = newCategory.trim()
    if (!value || categories.includes(value)) return
    setCategories((c) => [...c, value])
    setNewCategory('')
  }

  function removeCategory(value: string) {
    setCategories((c) => c.filter((x) => x !== value))
  }

  function save() {
    update.mutate(
      { period_basis: basis as never, period_depth: depth as never, categories },
      {
        onSuccess: () =>
          notify.success('Paramètres enregistrés', 'Configuration du regroupement mise à jour.'),
      },
    )
  }

  if (!firmId) {
    return (
      <div className="capsule-page">
        <h2 className="capsule-page__title">Regroupement</h2>
        <Tile>
          <InlineNotification
            kind="warning"
            lowContrast
            hideCloseButton
            title="Aucun contexte de cabinet"
            subtitle="Les paramètres de regroupement sont réservés aux comptables du cabinet."
          />
        </Tile>
      </div>
    )
  }

  return (
    <div className="capsule-page" style={{ maxWidth: '44rem' }}>
      <PageBreadcrumb
        items={[{ label: 'Clients', to: '/clients' }, { label: 'Regroupement' }]}
      />
      <h2 className="capsule-page__title">Regroupement &amp; catégories</h2>

      {settings.isLoading ? (
        <Tile>
          <SkeletonText paragraph lineCount={5} />
        </Tile>
      ) : (
        <Tile>
          <Stack gap={6}>
            <Select
              id="settings-basis"
              labelText="Base de la période"
              helperText="Date selon laquelle les documents sont regroupés."
              value={basis}
              onChange={(e) => setBasis(e.target.value)}
            >
              {BASIS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} text={o.label} />
              ))}
            </Select>

            <Select
              id="settings-depth"
              labelText="Profondeur de la période"
              helperText="Enregistrer une nouvelle profondeur reconstruit l'index de périodes du cabinet."
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
            >
              {DEPTH_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} text={o.label} />
              ))}
            </Select>

            <div>
              <p className="cds--label">Catégories</p>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                }}
                data-testid="settings-categories"
              >
                {categories.length === 0 && (
                  <span style={{ color: 'var(--cds-text-secondary, #6f6f6f)' }}>
                    Aucune catégorie pour le moment.
                  </span>
                )}
                {categories.map((c) => (
                  <Tag
                    key={c}
                    type="cool-gray"
                    filter
                    onClose={() => removeCategory(c)}
                  >
                    {c}
                  </Tag>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                <TextInput
                  id="settings-new-category"
                  labelText="Ajouter une catégorie"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addCategory()
                    }
                  }}
                />
                <Button
                  kind="tertiary"
                  renderIcon={Add}
                  onClick={addCategory}
                  data-testid="settings-add-category"
                >
                  Ajouter
                </Button>
              </div>
            </div>

            <Button
              onClick={save}
              disabled={update.isPending}
              renderIcon={Save}
              data-testid="settings-save"
            >
              {update.isPending ? 'Enregistrement…' : 'Enregistrer les paramètres'}
            </Button>
          </Stack>
        </Tile>
      )}
    </div>
  )
}

import { useState } from 'react'
import { Button, TextInput } from '@carbon/react'
import { DocumentExport } from '@carbon/icons-react'
import { API_BASE, downloadFilePost } from '../api/client'
import { notify } from '../store/useNotifications'
import { requiredLabel } from '../lib/forms'

/**
 * Accountant action: download a zip of a client+period's latest document
 * files. The period is a "YYYY" or "YYYY-MM" key matching the By-period view.
 * Uses `downloadFile` so the auth token rides on the request.
 */
export default function ExportPeriodButton({ clientId }: { clientId: number }) {
  const [period, setPeriod] = useState('')
  const [busy, setBusy] = useState(false)
  const [attempted, setAttempted] = useState(false)

  const periodInvalid = attempted && !period.trim()

  async function doExport() {
    setAttempted(true)
    const key = period.trim()
    if (!key) return
    setBusy(true)
    try {
      await downloadFilePost(
        `${API_BASE}/capsule/clients/${clientId}/periods/${encodeURIComponent(
          key,
        )}/export/`,
        `capsule_${clientId}_${key}.zip`,
      )
      notify.success('Export lancé', `Période ${key} téléchargée.`)
    } catch {
      notify.error('Échec de l\'export', 'Aucun document pour cette période, ou accès refusé.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}
      data-testid="export-period"
    >
      <TextInput
        id="export-period-key"
        labelText={requiredLabel('Période à exporter (AAAA ou AAAA-MM)')}
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        invalid={periodInvalid}
        invalidText="La période à exporter est requise."
        data-testid="export-period-input"
        style={{ maxWidth: '16rem' }}
      />
      <Button
        renderIcon={DocumentExport}
        disabled={busy}
        onClick={doExport}
        data-testid="export-period-button"
      >
        {busy ? 'Export en cours…' : 'Exporter la période'}
      </Button>
    </div>
  )
}

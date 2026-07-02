import { useState } from 'react'
import { Button, TextInput } from '@carbon/react'
import { DocumentExport } from '@carbon/icons-react'
import { API_BASE, downloadFilePost } from '../api/client'
import { notify } from '../store/useNotifications'

/**
 * Accountant action: download a zip of a client+period's latest document
 * files. The period is a "YYYY" or "YYYY-MM" key matching the By-period view.
 * Uses `downloadFile` so the auth token rides on the request.
 */
export default function ExportPeriodButton({ clientId }: { clientId: number }) {
  const [period, setPeriod] = useState('')
  const [busy, setBusy] = useState(false)

  async function doExport() {
    const key = period.trim()
    if (!key) {
      notify.warning('Enter a period', 'e.g. 2026 or 2026-06')
      return
    }
    setBusy(true)
    try {
      await downloadFilePost(
        `${API_BASE}/capsule/clients/${clientId}/periods/${encodeURIComponent(
          key,
        )}/export/`,
        `capsule_${clientId}_${key}.zip`,
      )
      notify.success('Export started', `Downloaded period ${key}.`)
    } catch {
      notify.error('Export failed', 'No documents for that period, or no access.')
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
        labelText="Export period (YYYY or YYYY-MM)"
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        data-testid="export-period-input"
        style={{ maxWidth: '16rem' }}
      />
      <Button
        renderIcon={DocumentExport}
        disabled={busy}
        onClick={doExport}
        data-testid="export-period-button"
      >
        {busy ? 'Exporting…' : 'Export period'}
      </Button>
    </div>
  )
}

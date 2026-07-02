import { InlineNotification, Tile } from '@carbon/react'

export default function SettingsPage() {
  return (
    <div className="capsule-page">
      <h2 className="capsule-page__title">Settings</h2>
      <Tile>
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="Settings are not exposed over the REST API"
          subtitle="Mayan's smart-settings are configured via environment variables / config files on the server (there is no /api/v4/settings/ endpoint — it returns 404). System settings therefore can't be edited from this client. Document types, metadata types, smart links and web links are managed under their own Administration pages."
        />
      </Tile>
    </div>
  )
}

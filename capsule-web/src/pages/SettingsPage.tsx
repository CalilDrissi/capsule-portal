import { InlineNotification, Tile } from '@carbon/react'

export default function SettingsPage() {
  return (
    <div className="capsule-page">
      <h2 className="capsule-page__title">Paramètres</h2>
      <Tile>
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="Les paramètres ne sont pas exposés via l'API REST"
          subtitle="Les paramètres avancés de Mayan sont configurés au moyen de variables d'environnement / fichiers de configuration sur le serveur (il n'existe pas de point de terminaison /api/v4/settings/ — il renvoie une erreur 404). Les paramètres système ne peuvent donc pas être modifiés depuis ce client. Les types de document, types de métadonnée, liens intelligents et liens web sont gérés depuis leurs propres pages d'administration."
        />
      </Tile>
    </div>
  )
}

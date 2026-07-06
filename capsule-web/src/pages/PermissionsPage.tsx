import {
  DataTableSkeleton,
  StructuredListBody,
  StructuredListCell,
  StructuredListHead,
  StructuredListRow,
  StructuredListWrapper,
  Tile,
} from '@carbon/react'
import { usePermissions } from '../api/queries'
import type { Permission } from '../api/types'

export default function PermissionsPage() {
  const { data, isLoading, isError, error } = usePermissions()

  const perms = data?.results ?? []
  const byNamespace = perms.reduce<Record<string, Permission[]>>((acc, p) => {
    ;(acc[p.namespace] ??= []).push(p)
    return acc
  }, {})
  const namespaces = Object.keys(byNamespace).sort()

  return (
    <div className="capsule-page">
      <div className="capsule-page__header">
        <h2 className="capsule-page__title">Permissions</h2>
      </div>
      <p className="capsule-hint">
        Le catalogue complet des permissions système (lecture seule). Accordez-les
        aux rôles depuis la page de détail du rôle.
      </p>

      {isLoading ? (
        <DataTableSkeleton columnCount={2} rowCount={8} showHeader={false} />
      ) : isError ? (
        <Tile>Échec du chargement des permissions : {(error as Error)?.message}</Tile>
      ) : (
        <div data-testid="permissions-list">
          {namespaces.map((ns) => (
            <div key={ns} style={{ marginBottom: '1.5rem' }}>
              <h3 className="capsule-section-subtitle">{ns}</h3>
              <StructuredListWrapper isCondensed>
                <StructuredListHead>
                  <StructuredListRow head>
                    <StructuredListCell head>Permission</StructuredListCell>
                    <StructuredListCell head>Identifiant</StructuredListCell>
                  </StructuredListRow>
                </StructuredListHead>
                <StructuredListBody>
                  {byNamespace[ns].map((p) => (
                    <StructuredListRow key={p.pk}>
                      <StructuredListCell>{p.label}</StructuredListCell>
                      <StructuredListCell>
                        <code>{p.pk}</code>
                      </StructuredListCell>
                    </StructuredListRow>
                  ))}
                </StructuredListBody>
              </StructuredListWrapper>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { DataTableSkeleton, Tile } from '@carbon/react'
import { useDocuments } from '../api/queries'
import DocumentsTable from '../components/DocumentsTable'

/**
 * Mayan has no /documents/recently_created/ endpoint (404), so we read the
 * documents list and sort by datetime_created descending client-side.
 */
export default function RecentlyCreatedPage() {
  const { data, isLoading, isError, error } = useDocuments(1, 100)

  const sorted = [...(data?.results ?? [])].sort((a, b) =>
    (b.datetime_created ?? '').localeCompare(a.datetime_created ?? ''),
  )

  return (
    <div className="capsule-page">
      <h2 className="capsule-page__title">Créés récemment</h2>
      {isLoading ? (
        <DataTableSkeleton columnCount={3} rowCount={5} showHeader={false} />
      ) : isError ? (
        <Tile>Échec du chargement des documents : {(error as Error)?.message}</Tile>
      ) : sorted.length === 0 ? (
        <Tile className="capsule-empty">
          <h4>Aucun document pour l'instant</h4>
        </Tile>
      ) : (
        <DocumentsTable documents={sorted.slice(0, 25)} />
      )}
    </div>
  )
}

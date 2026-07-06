import { DataTableSkeleton, Tile } from '@carbon/react'
import { useFavorites } from '../api/queries'
import DocumentsTable from '../components/DocumentsTable'

export default function FavoritesPage() {
  const { data, isLoading, isError, error } = useFavorites()

  return (
    <div className="capsule-page">
      <h2 className="capsule-page__title">Favoris</h2>
      {isLoading ? (
        <DataTableSkeleton columnCount={3} rowCount={5} showHeader={false} />
      ) : isError ? (
        <Tile>Échec du chargement des favoris : {(error as Error)?.message}</Tile>
      ) : (data?.count ?? 0) === 0 ? (
        <Tile className="capsule-empty">
          <h4>Aucun favori pour l'instant</h4>
          <p>Marquez des documents comme favoris depuis leur page de détail.</p>
        </Tile>
      ) : (
        <DocumentsTable
          documents={(data?.results ?? []).map((f) => f.document)}
        />
      )}
    </div>
  )
}

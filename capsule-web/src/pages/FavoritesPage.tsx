import { DataTableSkeleton, Tile } from '@carbon/react'
import { useFavorites } from '../api/queries'
import DocumentsTable from '../components/DocumentsTable'

export default function FavoritesPage() {
  const { data, isLoading, isError, error } = useFavorites()

  return (
    <div className="capsule-page">
      <h2 className="capsule-page__title">Favorites</h2>
      {isLoading ? (
        <DataTableSkeleton columnCount={3} rowCount={5} showHeader={false} />
      ) : isError ? (
        <Tile>Failed to load favorites: {(error as Error)?.message}</Tile>
      ) : (data?.count ?? 0) === 0 ? (
        <Tile className="capsule-empty">
          <h4>No favorites yet</h4>
          <p>Mark documents as favorite from their detail page.</p>
        </Tile>
      ) : (
        <DocumentsTable
          documents={(data?.results ?? []).map((f) => f.document)}
        />
      )}
    </div>
  )
}

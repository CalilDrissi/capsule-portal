import { useNavigate } from 'react-router-dom'
import {
  ClickableTile,
  SkeletonText,
  Tile,
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
  StructuredListWrapper,
} from '@carbon/react'
import {
  Document,
  DocumentMultiple_01,
  Favorite,
  Time,
} from '@carbon/icons-react'
import {
  useDocuments,
  useDocumentTypes,
  useFavorites,
} from '../api/queries'

function StatTile({
  label,
  value,
  loading,
  icon,
  onClick,
}: {
  label: string
  value: number | undefined
  loading: boolean
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <ClickableTile className="capsule-stat" onClick={onClick}>
      <div className="capsule-stat__icon">{icon}</div>
      {loading ? (
        <SkeletonText heading width="3rem" />
      ) : (
        <div className="capsule-stat__value">{value ?? 0}</div>
      )}
      <div className="capsule-stat__label">{label}</div>
    </ClickableTile>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const docs = useDocuments(1, 100)
  const types = useDocumentTypes()
  const favorites = useFavorites()

  const recent = [...(docs.data?.results ?? [])]
    .sort((a, b) =>
      (b.datetime_created ?? '').localeCompare(a.datetime_created ?? ''),
    )
    .slice(0, 5)

  return (
    <div className="capsule-page">
      <h2 className="capsule-page__title">Dashboard</h2>

      <div className="capsule-stats">
        <StatTile
          label="Documents"
          value={docs.data?.count}
          loading={docs.isLoading}
          icon={<DocumentMultiple_01 size={24} />}
          onClick={() => navigate('/documents')}
        />
        <StatTile
          label="Document types"
          value={types.data?.count}
          loading={types.isLoading}
          icon={<Document size={24} />}
          onClick={() => navigate('/documents')}
        />
        <StatTile
          label="Recently created"
          value={docs.data?.count}
          loading={docs.isLoading}
          icon={<Time size={24} />}
          onClick={() => navigate('/recently-created')}
        />
        <StatTile
          label="Favorites"
          value={favorites.data?.count}
          loading={favorites.isLoading}
          icon={<Favorite size={24} />}
          onClick={() => navigate('/favorites')}
        />
      </div>

      <h3 style={{ margin: '2rem 0 1rem', fontWeight: 400 }}>
        Recent documents
      </h3>
      {docs.isLoading ? (
        <Tile>
          <SkeletonText paragraph lineCount={5} />
        </Tile>
      ) : recent.length === 0 ? (
        <Tile className="capsule-empty">
          <h4>No documents yet</h4>
        </Tile>
      ) : (
        <StructuredListWrapper
          isCondensed
          className="capsule-recent"
          aria-label="Recent documents"
        >
          <StructuredListBody>
            {recent.map((d) => (
              <StructuredListRow
                key={d.id}
                onClick={() => navigate(`/documents/${d.id}`)}
                style={{ cursor: 'pointer' }}
                data-testid={`recent-${d.id}`}
              >
                <StructuredListCell>{d.label}</StructuredListCell>
                <StructuredListCell>
                  {d.document_type?.label ?? '—'}
                </StructuredListCell>
                <StructuredListCell>
                  {d.datetime_created
                    ? new Date(d.datetime_created).toLocaleDateString()
                    : '—'}
                </StructuredListCell>
              </StructuredListRow>
            ))}
          </StructuredListBody>
        </StructuredListWrapper>
      )}
    </div>
  )
}

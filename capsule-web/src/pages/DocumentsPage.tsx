import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  DataTable,
  DataTableSkeleton,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  Tile,
} from '@carbon/react'
import { Add } from '@carbon/icons-react'
import { useDocuments } from '../api/queries'

const headers = [
  { key: 'label', header: 'Libellé' },
  { key: 'type', header: 'Type' },
  { key: 'created', header: 'Créé le' },
]

export default function DocumentsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [search, setSearch] = useState('')
  const { data, isLoading, isError, error } = useDocuments(page, pageSize)

  if (isLoading) {
    return (
      <div className="capsule-page">
        <h2 className="capsule-page__title">Documents</h2>
        <DataTableSkeleton columnCount={3} rowCount={8} showHeader={false} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="capsule-page">
        <h2 className="capsule-page__title">Documents</h2>
        <Tile>Échec du chargement des documents : {(error as Error)?.message}</Tile>
      </div>
    )
  }

  const all = data?.results ?? []
  const filtered = search
    ? all.filter((d) => d.label.toLowerCase().includes(search.toLowerCase()))
    : all

  const rows = filtered.map((d) => ({
    id: String(d.id),
    label: d.label,
    type: d.document_type?.label ?? '—',
    created: d.datetime_created
      ? new Date(d.datetime_created).toLocaleString('fr-FR')
      : '—',
  }))

  return (
    <div className="capsule-page">
      <div className="capsule-page__header">
        <h2 className="capsule-page__title">Documents</h2>
        <Button renderIcon={Add} onClick={() => navigate('/upload')}>
          Importer
        </Button>
      </div>

      {data && data.count === 0 ? (
        <Tile className="capsule-empty">
          <h4>Aucun document pour le moment</h4>
          <p>Importez votre premier document pour commencer.</p>
          <Button renderIcon={Add} onClick={() => navigate('/upload')}>
            Importer un document
          </Button>
        </Tile>
      ) : (
        <>
          <DataTable rows={rows} headers={headers} isSortable>
            {({
              rows,
              headers,
              getHeaderProps,
              getRowProps,
              getTableProps,
              getToolbarProps,
            }) => (
              <TableContainer>
                <TableToolbar {...getToolbarProps()}>
                  <TableToolbarContent>
                    <TableToolbarSearch
                      persistent
                      placeholder="Filtrer par libellé"
                      onChange={(e) =>
                        setSearch((e as React.ChangeEvent<HTMLInputElement>)?.target?.value ?? '')
                      }
                    />
                  </TableToolbarContent>
                </TableToolbar>
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      {headers.map((header) => {
                        const { key, ...rest } = getHeaderProps({ header })
                        return (
                          <TableHeader key={key} {...rest}>
                            {header.header}
                          </TableHeader>
                        )
                      })}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => {
                      const { key, ...rest } = getRowProps({ row })
                      return (
                        <TableRow
                          key={key}
                          {...rest}
                          onClick={() => navigate(`/documents/${row.id}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          {row.cells.map((cell) => (
                            <TableCell key={cell.id}>{cell.value}</TableCell>
                          ))}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>

          <Pagination
            page={page}
            pageSize={pageSize}
            pageSizes={[10, 25, 50, 100]}
            totalItems={data?.count ?? 0}
            onChange={({ page: p, pageSize: ps }) => {
              setPage(p)
              setPageSize(ps)
            }}
          />
        </>
      )}
    </div>
  )
}

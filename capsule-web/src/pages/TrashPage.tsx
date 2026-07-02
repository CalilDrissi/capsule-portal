import {
  Button,
  DataTable,
  DataTableSkeleton,
  Table,
  TableBatchAction,
  TableBatchActions,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableSelectAll,
  TableSelectRow,
  TableToolbar,
  TableToolbarContent,
  Tile,
} from '@carbon/react'
import { Restart, TrashCan } from '@carbon/icons-react'
import {
  useDeleteTrashed,
  useRestoreDocument,
  useTrashedDocuments,
} from '../api/queries'

const headers = [
  { key: 'label', header: 'Label' },
  { key: 'type', header: 'Type' },
  { key: 'trashed', header: 'Trashed' },
  { key: 'actions', header: 'Actions' },
]

export default function TrashPage() {
  const { data, isLoading, isError, error } = useTrashedDocuments()
  const restore = useRestoreDocument()
  const remove = useDeleteTrashed()

  const items = data?.results ?? []
  const rows = items.map((d) => ({
    id: String(d.id),
    label: d.label,
    type: d.document_type?.label ?? '—',
    trashed: d.trashed_date_time
      ? new Date(d.trashed_date_time).toLocaleString()
      : '—',
    actions: '',
  }))

  return (
    <div className="capsule-page">
      <h2 className="capsule-page__title">Trash</h2>
      {isLoading ? (
        <DataTableSkeleton columnCount={4} rowCount={5} showHeader={false} />
      ) : isError ? (
        <Tile>Failed to load trash: {(error as Error)?.message}</Tile>
      ) : items.length === 0 ? (
        <Tile className="capsule-empty">
          <h4>Trash is empty</h4>
        </Tile>
      ) : (
        <DataTable rows={rows} headers={headers}>
          {({
            rows,
            headers,
            getHeaderProps,
            getRowProps,
            getSelectionProps,
            getBatchActionProps,
            getTableProps,
            selectedRows,
          }) => {
            const batch = getBatchActionProps()
            return (
              <TableContainer>
                <TableToolbar>
                  <TableBatchActions {...batch}>
                    <TableBatchAction
                      renderIcon={Restart}
                      onClick={() => {
                        selectedRows.forEach((r) =>
                          restore.mutate(Number(r.id)),
                        )
                        batch.onCancel()
                      }}
                    >
                      Restore
                    </TableBatchAction>
                    <TableBatchAction
                      renderIcon={TrashCan}
                      onClick={() => {
                        selectedRows.forEach((r) =>
                          remove.mutate(Number(r.id)),
                        )
                        batch.onCancel()
                      }}
                    >
                      Delete forever
                    </TableBatchAction>
                  </TableBatchActions>
                  <TableToolbarContent />
                </TableToolbar>
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      <TableSelectAll {...getSelectionProps()} />
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
                        <TableRow key={key} {...rest}>
                          <TableSelectRow {...getSelectionProps({ row })} />
                          {row.cells.map((cell) =>
                            cell.info.header === 'actions' ? (
                              <TableCell key={cell.id}>
                                <Button
                                  kind="ghost"
                                  size="sm"
                                  renderIcon={Restart}
                                  data-testid={`restore-${row.id}`}
                                  onClick={() => restore.mutate(Number(row.id))}
                                >
                                  Restore
                                </Button>
                                <Button
                                  kind="danger--ghost"
                                  size="sm"
                                  renderIcon={TrashCan}
                                  data-testid={`delete-${row.id}`}
                                  onClick={() => remove.mutate(Number(row.id))}
                                >
                                  Delete
                                </Button>
                              </TableCell>
                            ) : (
                              <TableCell key={cell.id}>{cell.value}</TableCell>
                            ),
                          )}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          }}
        </DataTable>
      )}
    </div>
  )
}

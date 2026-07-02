import { useNavigate } from 'react-router-dom'
import {
  DataTableSkeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
} from '@carbon/react'
import { useCheckouts } from '../api/queries'

/** Lists every currently checked-out document. GET /checkouts/ */
export default function CheckoutsPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useCheckouts()

  const rows = data?.results ?? []

  return (
    <div className="capsule-page">
      <h2 className="capsule-page__title">Checked-out documents</h2>
      {isLoading ? (
        <DataTableSkeleton columnCount={4} rowCount={4} showHeader={false} />
      ) : isError ? (
        <Tile>Failed to load checkouts: {(error as Error)?.message}</Tile>
      ) : rows.length === 0 ? (
        <Tile className="capsule-empty" data-testid="checkouts-empty">
          <h4>No documents are checked out</h4>
          <p>Check out a document from its detail page to lock it for editing.</p>
        </Tile>
      ) : (
        <TableContainer>
          <Table data-testid="checkouts-table">
            <TableHead>
              <TableRow>
                <TableHeader>Document</TableHeader>
                <TableHeader>Checked out by</TableHeader>
                <TableHeader>When</TableHeader>
                <TableHeader>Expires</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((c) => (
                <TableRow
                  key={c.id}
                  data-testid={`checkout-row-${c.document?.id}`}
                  onClick={() => navigate(`/documents/${c.document?.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <TableCell>{c.document?.label ?? '—'}</TableCell>
                  <TableCell>{c.user?.username ?? '—'}</TableCell>
                  <TableCell>
                    {c.checkout_datetime
                      ? new Date(c.checkout_datetime).toLocaleString()
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {c.expiration_datetime
                      ? new Date(c.expiration_datetime).toLocaleString()
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  )
}

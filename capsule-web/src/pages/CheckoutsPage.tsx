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
      <h2 className="capsule-page__title">Documents empruntés</h2>
      {isLoading ? (
        <DataTableSkeleton columnCount={4} rowCount={4} showHeader={false} />
      ) : isError ? (
        <Tile>Échec du chargement des emprunts : {(error as Error)?.message}</Tile>
      ) : rows.length === 0 ? (
        <Tile className="capsule-empty" data-testid="checkouts-empty">
          <h4>Aucun document n'est emprunté</h4>
          <p>Empruntez un document depuis sa page de détail pour le verrouiller en modification.</p>
        </Tile>
      ) : (
        <TableContainer>
          <Table data-testid="checkouts-table">
            <TableHead>
              <TableRow>
                <TableHeader>Document</TableHeader>
                <TableHeader>Emprunté par</TableHeader>
                <TableHeader>Date</TableHeader>
                <TableHeader>Expire le</TableHeader>
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
                      ? new Date(c.checkout_datetime).toLocaleString('fr-FR')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {c.expiration_datetime
                      ? new Date(c.expiration_datetime).toLocaleString('fr-FR')
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

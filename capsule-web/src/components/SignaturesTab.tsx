import {
  InlineLoading,
  StructuredListBody,
  StructuredListCell,
  StructuredListHead,
  StructuredListRow,
  StructuredListWrapper,
  Tile,
} from '@carbon/react'
import { useDocumentFiles, useFileSignatures } from '../api/queries'
import type { DocumentDetail, DocumentSignature } from '../api/types'

function pick(sig: DocumentSignature, keys: string[]): string {
  for (const k of keys) {
    const v = sig[k]
    if (v != null && v !== '') return String(v)
  }
  return '—'
}

function SignatureList({
  docId,
  fileId,
  kind,
  title,
}: {
  docId: number
  fileId: number | undefined
  kind: 'embedded' | 'detached'
  title: string
}) {
  const { data, isLoading } = useFileSignatures(docId, fileId, kind)
  if (isLoading)
    return <InlineLoading description="Chargement des signatures…" />

  const sigs = data?.results ?? []
  return (
    <div data-testid={`signatures-${kind}`} style={{ marginBottom: '2rem' }}>
      <h4 className="capsule-section-title">{title}</h4>
      {sigs.length === 0 ? (
        <Tile data-testid={`signatures-${kind}-empty`}>
          Aucune signature {kind} trouvée pour ce fichier.
        </Tile>
      ) : (
        <StructuredListWrapper isCondensed>
          <StructuredListHead>
            <StructuredListRow head>
              <StructuredListCell head>Signataire / ID de clé</StructuredListCell>
              <StructuredListCell head>Date</StructuredListCell>
              <StructuredListCell head>Empreinte</StructuredListCell>
              <StructuredListCell head>Statut</StructuredListCell>
            </StructuredListRow>
          </StructuredListHead>
          <StructuredListBody>
            {sigs.map((sig, i) => (
              <StructuredListRow key={sig.id ?? i}>
                <StructuredListCell>
                  {pick(sig, ['signature_id', 'key_id', 'public_key_fingerprint'])}
                </StructuredListCell>
                <StructuredListCell>
                  {(() => {
                    const d = pick(sig, ['date_time', 'date'])
                    return d !== '—' ? new Date(d).toLocaleString('fr-FR') : '—'
                  })()}
                </StructuredListCell>
                <StructuredListCell>
                  {pick(sig, ['public_key_fingerprint', 'key_id'])}
                </StructuredListCell>
                <StructuredListCell>
                  {sig.signature_id_url || sig.key_id ? 'Clé présente' : 'Non vérifiée'}
                </StructuredListCell>
              </StructuredListRow>
            ))}
          </StructuredListBody>
        </StructuredListWrapper>
      )}
    </div>
  )
}

/**
 * Read-only signature inspection for the latest document file. Mayan exposes
 * embedded and detached signatures separately:
 *   GET /documents/{id}/files/{fid}/signatures/embedded/
 *   GET /documents/{id}/files/{fid}/signatures/detached/
 * Creating signatures requires server-side GPG keys, so this view is read-only.
 */
export default function SignaturesTab({ doc }: { doc: DocumentDetail }) {
  const { data: files, isLoading } = useDocumentFiles(doc.id)
  if (isLoading) return <InlineLoading description="Chargement du fichier…" />

  const latestFile = files?.results[0] ?? doc.file_latest ?? undefined
  if (!latestFile)
    return <Tile data-testid="signatures-tab">Aucun fichier à inspecter.</Tile>

  return (
    <div data-testid="signatures-tab">
      <p className="capsule-hint">
        Les signatures numériques sont en lecture seule ici ; la signature nécessite des clés côté serveur.
      </p>
      <SignatureList
        docId={doc.id}
        fileId={latestFile.id}
        kind="embedded"
        title="Signatures intégrées"
      />
      <SignatureList
        docId={doc.id}
        fileId={latestFile.id}
        kind="detached"
        title="Signatures détachées"
      />
    </div>
  )
}

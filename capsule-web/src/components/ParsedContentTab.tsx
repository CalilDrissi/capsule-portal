import { useState } from 'react'
import {
  Button,
  CodeSnippet,
  InlineLoading,
  Tile,
} from '@carbon/react'
import { ChevronLeft, ChevronRight } from '@carbon/icons-react'
import {
  useDocumentFiles,
  useDocumentPages,
  usePageParsedContent,
} from '../api/queries'
import type { DocumentDetail } from '../api/types'

/**
 * Per-page parsed file content for the latest document file.
 * GET /documents/{id}/files/{fid}/pages/{pid}/content/ → {content}
 */
export default function ParsedContentTab({ doc }: { doc: DocumentDetail }) {
  const { data: files, isLoading: fLoading } = useDocumentFiles(doc.id)
  const latestFile = files?.results[0] ?? doc.file_latest ?? undefined
  const fileId = latestFile?.id

  const pageListUrl = latestFile?.page_list_url
  const { data: pagesData, isLoading: pLoading } = useDocumentPages(pageListUrl)
  const pages = pagesData?.results ?? []

  const [pageIndex, setPageIndex] = useState(0)
  const page = pages[pageIndex]

  const { data, isLoading, isError, error } = usePageParsedContent(
    doc.id,
    fileId,
    page?.id,
  )

  if (fLoading || pLoading)
    return <InlineLoading description="Chargement du contenu analysé…" />

  if (pages.length === 0)
    return <Tile data-testid="parsed-empty">Aucune page disponible.</Tile>

  const content = data?.content ?? ''

  return (
    <div data-testid="parsed-tab">
      {pages.length > 1 && (
        <div className="capsule-content-nav">
          <Button
            hasIconOnly
            kind="ghost"
            size="sm"
            iconDescription="Page précédente"
            renderIcon={ChevronLeft}
            disabled={pageIndex === 0}
            onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
          />
          <span>
            Page {pageIndex + 1} sur {pages.length}
          </span>
          <Button
            hasIconOnly
            kind="ghost"
            size="sm"
            iconDescription="Page suivante"
            renderIcon={ChevronRight}
            disabled={pageIndex >= pages.length - 1}
            onClick={() =>
              setPageIndex((i) => Math.min(pages.length - 1, i + 1))
            }
          />
        </div>
      )}

      {isLoading ? (
        <InlineLoading description="Chargement du texte analysé…" />
      ) : isError ? (
        <Tile data-testid="parsed-error">
          Contenu analysé indisponible : {(error as Error)?.message}
        </Tile>
      ) : content.trim() ? (
        <CodeSnippet
          type="multi"
          feedback="Copié"
          data-testid="parsed-content"
          aria-label="Texte analysé"
        >
          {content}
        </CodeSnippet>
      ) : (
        <Tile data-testid="parsed-empty">
          Aucun texte analysé pour cette page. Le contenu est extrait du fichier
          par l'analyseur côté serveur.
        </Tile>
      )}
    </div>
  )
}

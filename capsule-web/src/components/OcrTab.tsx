import { useState } from 'react'
import {
  Button,
  CodeSnippet,
  InlineLoading,
  Tile,
} from '@carbon/react'
import { ChevronLeft, ChevronRight } from '@carbon/icons-react'
import { useDocumentVersions, usePageOcr } from '../api/queries'
import { useDocumentPages } from '../api/queries'
import type { DocumentDetail } from '../api/types'

/**
 * Per-page OCR text for the active document version.
 * GET /documents/{id}/versions/{vid}/pages/{pid}/ocr/ → {content}
 */
export default function OcrTab({ doc }: { doc: DocumentDetail }) {
  const { data: versions, isLoading: vLoading } = useDocumentVersions(doc.id)
  const activeVersion =
    versions?.results.find((v) => v.active) ?? versions?.results[0]
  const versionId = activeVersion?.id ?? doc.version_active?.id

  const pageListUrl =
    activeVersion?.page_list_url ?? doc.version_active?.page_list_url
  const { data: pagesData, isLoading: pLoading } = useDocumentPages(pageListUrl)
  const pages = pagesData?.results ?? []

  const [pageIndex, setPageIndex] = useState(0)
  const page = pages[pageIndex]

  const { data, isLoading, isError, error } = usePageOcr(
    doc.id,
    versionId,
    page?.id,
  )

  if (vLoading || pLoading)
    return <InlineLoading description="Loading OCR…" />

  if (pages.length === 0)
    return <Tile data-testid="ocr-empty">No pages available for OCR.</Tile>

  const content = data?.content ?? ''

  return (
    <div data-testid="ocr-tab">
      {pages.length > 1 && (
        <div className="capsule-content-nav">
          <Button
            hasIconOnly
            kind="ghost"
            size="sm"
            iconDescription="Previous page"
            renderIcon={ChevronLeft}
            disabled={pageIndex === 0}
            onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
          />
          <span>
            Page {pageIndex + 1} of {pages.length}
          </span>
          <Button
            hasIconOnly
            kind="ghost"
            size="sm"
            iconDescription="Next page"
            renderIcon={ChevronRight}
            disabled={pageIndex >= pages.length - 1}
            onClick={() =>
              setPageIndex((i) => Math.min(pages.length - 1, i + 1))
            }
          />
        </div>
      )}

      {isLoading ? (
        <InlineLoading description="Loading OCR text…" />
      ) : isError ? (
        <Tile data-testid="ocr-error">
          OCR content unavailable: {(error as Error)?.message}
        </Tile>
      ) : content.trim() ? (
        <CodeSnippet
          type="multi"
          feedback="Copied"
          data-testid="ocr-content"
          aria-label="OCR text"
        >
          {content}
        </CodeSnippet>
      ) : (
        <Tile data-testid="ocr-empty">
          No OCR text has been extracted for this page yet. OCR is performed
          server-side after upload.
        </Tile>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Button, Loading, Tile } from '@carbon/react'
import { CaretLeft, CaretRight, Download } from '@carbon/icons-react'
import { useDocumentPages } from '../api/queries'
import { downloadFile, fetchImageObjectUrl } from '../api/client'
import type { DocumentDetail } from '../api/types'

/**
 * Page-image viewer + download for a document, used in the workspace document
 * view. The page image and the file download both need the auth header, so the
 * image is fetched as a blob object URL and the download goes through
 * downloadFile (a plain <a download> can't carry the token).
 */
export default function DocumentViewer({ doc }: { doc: DocumentDetail }) {
  const pageListUrl = doc.version_active?.page_list_url
  const { data: pagesData } = useDocumentPages(pageListUrl)
  const pages = pagesData?.results ?? []

  const [pageIndex, setPageIndex] = useState(0)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [imgLoading, setImgLoading] = useState(false)

  useEffect(() => {
    let revoked: string | null = null
    const page = pages[pageIndex]
    if (!page) {
      setImgUrl(null)
      return
    }
    setImgLoading(true)
    fetchImageObjectUrl(page.image_url)
      .then((url) => {
        revoked = url
        setImgUrl(url)
      })
      .catch(() => setImgUrl(null))
      .finally(() => setImgLoading(false))
    return () => {
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [pages, pageIndex])

  const latestFile = doc.file_latest

  return (
    <div data-testid="workspace-doc-viewer">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
          minHeight: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {pages.length > 1 && (
            <>
              <Button
                kind="ghost"
                size="sm"
                hasIconOnly
                iconDescription="Page précédente"
                renderIcon={CaretLeft}
                disabled={pageIndex === 0}
                onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
              />
              <span className="capsule-hint">
                Page {pageIndex + 1} sur {pages.length}
              </span>
              <Button
                kind="ghost"
                size="sm"
                hasIconOnly
                iconDescription="Page suivante"
                renderIcon={CaretRight}
                disabled={pageIndex >= pages.length - 1}
                onClick={() =>
                  setPageIndex((i) => Math.min(pages.length - 1, i + 1))
                }
              />
            </>
          )}
        </div>
        {latestFile && (
          <Button
            kind="tertiary"
            size="sm"
            renderIcon={Download}
            data-testid="workspace-download"
            onClick={() =>
              downloadFile(`${latestFile.url}download/`, latestFile.filename)
            }
          >
            Télécharger
          </Button>
        )}
      </div>
      <Tile style={{ textAlign: 'center' }}>
        {imgLoading ? (
          <Loading withOverlay={false} small />
        ) : imgUrl ? (
          <img
            src={imgUrl}
            alt={doc.label}
            style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }}
          />
        ) : (
          <p className="capsule-hint">Aucun aperçu disponible pour ce document.</p>
        )}
      </Tile>
    </div>
  )
}

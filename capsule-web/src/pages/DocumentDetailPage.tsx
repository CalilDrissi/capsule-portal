import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  Loading,
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
  StructuredListWrapper,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tile,
} from '@carbon/react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Favorite,
  FavoriteFilled,
  TrashCan,
} from '@carbon/icons-react'
import {
  useDocument,
  useDocumentPages,
  useFavorites,
  useToggleFavorite,
  useTrashDocument,
} from '../api/queries'
import { downloadFile, fetchImageObjectUrl } from '../api/client'
import MetadataTab from '../components/MetadataTab'
import TagsTab from '../components/TagsTab'
import CommentsTab from '../components/CommentsTab'
import VersionsTab from '../components/VersionsTab'
import FilesTab from '../components/FilesTab'
import PageBreadcrumb from '../components/PageBreadcrumb'
import CabinetsTab from '../components/CabinetsTab'
import OcrTab from '../components/OcrTab'
import ParsedContentTab from '../components/ParsedContentTab'
import SignaturesTab from '../components/SignaturesTab'
import WorkflowsTab from '../components/WorkflowsTab'
import AccessControlTab from '../components/AccessControlTab'
import { CheckoutBanner, CheckoutButton } from '../components/CheckoutControl'

export default function DocumentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const docId = id ? Number(id) : null
  const { data: doc, isLoading, isError } = useDocument(docId)

  const { data: favorites } = useFavorites()
  const toggleFavorite = useToggleFavorite()
  const trashDoc = useTrashDocument()

  const pageListUrl = doc?.version_active?.page_list_url
  const { data: pagesData } = useDocumentPages(pageListUrl)
  const pages = pagesData?.results ?? []

  const [pageIndex, setPageIndex] = useState(0)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [imgLoading, setImgLoading] = useState(false)

  useEffect(() => {
    let revoked: string | null = null
    const page = pages[pageIndex]
    if (!page) return
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

  if (isLoading) return <Loading withOverlay={false} />
  if (isError || !doc)
    return (
      <div className="capsule-page">
        <PageBreadcrumb items={[{ label: 'Documents', to: '/documents' }, { label: 'Introuvable' }]} />
        <Tile>Document introuvable.</Tile>
      </div>
    )

  const favRecord = (favorites?.results ?? []).find(
    (f) => f.document.id === doc.id,
  )
  const isFavorite = !!favRecord

  const latestFile = doc.file_latest

  return (
    <div className="capsule-page">
      <PageBreadcrumb items={[{ label: 'Documents', to: '/documents' }, { label: doc.label }]} />

      <div className="capsule-page__header">
        <h2 className="capsule-page__title">{doc.label}</h2>
        <div className="capsule-actions">
          <Button
            kind={isFavorite ? 'primary' : 'tertiary'}
            renderIcon={isFavorite ? FavoriteFilled : Favorite}
            disabled={toggleFavorite.isPending}
            data-testid="favorite-toggle"
            onClick={() =>
              toggleFavorite.mutate({
                docId: doc.id,
                favoriteId: favRecord?.id ?? null,
              })
            }
          >
            {isFavorite ? 'En favori' : 'Favori'}
          </Button>
          <CheckoutButton docId={doc.id} />
          {latestFile && (
            <Button
              kind="tertiary"
              renderIcon={Download}
              data-testid="download-doc"
              onClick={() =>
                downloadFile(`${latestFile.url}download/`, latestFile.filename)
              }
            >
              Télécharger
            </Button>
          )}
          <Button
            kind="danger--tertiary"
            renderIcon={TrashCan}
            disabled={trashDoc.isPending}
            data-testid="trash-doc"
            onClick={() =>
              trashDoc.mutate(doc.id, {
                onSuccess: () => navigate('/documents'),
              })
            }
          >
            Mettre à la corbeille
          </Button>
        </div>
      </div>

      <CheckoutBanner docId={doc.id} />

      <div className="capsule-detail">
        <div className="capsule-viewer" data-testid="viewer">
          {imgLoading && <Loading withOverlay={false} small />}
          {imgUrl ? (
            <img className="capsule-viewer__img" src={imgUrl} alt={`Page ${pageIndex + 1}`} />
          ) : (
            !imgLoading && <Tile>Aucun aperçu disponible.</Tile>
          )}
          {pages.length > 1 && (
            <div className="capsule-viewer__nav">
              <Button
                hasIconOnly
                kind="ghost"
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
                iconDescription="Page suivante"
                renderIcon={ChevronRight}
                disabled={pageIndex >= pages.length - 1}
                onClick={() => setPageIndex((i) => Math.min(pages.length - 1, i + 1))}
              />
            </div>
          )}
        </div>

        <div className="capsule-meta">
          <StructuredListWrapper isCondensed>
            <StructuredListBody>
              {[
                ['Libellé', doc.label],
                ['Type', doc.document_type?.label],
                ['Langue', doc.language],
                ['UUID', doc.uuid],
                ['Créé le', doc.datetime_created ? new Date(doc.datetime_created).toLocaleString('fr-FR') : '—'],
                ['Fichier', doc.file_latest?.filename],
                ['Taille', doc.file_latest?.size ? `${(doc.file_latest.size / 1024).toFixed(1)} Ko` : '—'],
              ].map(([k, v]) => (
                <StructuredListRow key={k as string}>
                  <StructuredListCell head>{k}</StructuredListCell>
                  <StructuredListCell>{(v as string) || '—'}</StructuredListCell>
                </StructuredListRow>
              ))}
            </StructuredListBody>
          </StructuredListWrapper>
        </div>
      </div>

      <div className="capsule-tabs" data-testid="detail-tabs">
        <Tabs>
          <TabList aria-label="Détails du document" contained>
            <Tab>Métadonnées</Tab>
            <Tab>Étiquettes</Tab>
            <Tab>Commentaires</Tab>
            <Tab>OCR</Tab>
            <Tab>Contenu</Tab>
            <Tab>Flux de travail</Tab>
            <Tab>Signatures</Tab>
            <Tab>Versions</Tab>
            <Tab>Fichiers</Tab>
            <Tab>Classeurs</Tab>
            <Tab>Contrôle d'accès</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <MetadataTab
                docId={doc.id}
                documentTypeId={doc.document_type?.id}
              />
            </TabPanel>
            <TabPanel>
              <TagsTab docId={doc.id} />
            </TabPanel>
            <TabPanel>
              <CommentsTab docId={doc.id} />
            </TabPanel>
            <TabPanel>
              <OcrTab doc={doc} />
            </TabPanel>
            <TabPanel>
              <ParsedContentTab doc={doc} />
            </TabPanel>
            <TabPanel>
              <WorkflowsTab docId={doc.id} />
            </TabPanel>
            <TabPanel>
              <SignaturesTab doc={doc} />
            </TabPanel>
            <TabPanel>
              <VersionsTab docId={doc.id} />
            </TabPanel>
            <TabPanel>
              <FilesTab docId={doc.id} />
            </TabPanel>
            <TabPanel>
              <CabinetsTab docId={doc.id} />
            </TabPanel>
            <TabPanel>
              <AccessControlTab docId={doc.id} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  )
}

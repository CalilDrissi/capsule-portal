import { useState } from 'react'
import {
  Button,
  InlineLoading,
  Stack,
  TextArea,
  Tile,
} from '@carbon/react'
import { Send } from '@carbon/icons-react'
import { useAddComment, useDocumentComments } from '../api/queries'
import { requiredLabel } from '../lib/forms'

export default function CommentsTab({ docId }: { docId: number }) {
  const { data, isLoading } = useDocumentComments(docId)
  const addComment = useAddComment(docId)
  const [text, setText] = useState('')
  const [attempted, setAttempted] = useState(false)

  const textInvalid = attempted && !text.trim()

  function handlePost() {
    setAttempted(true)
    if (!text.trim()) return
    addComment.mutate(text.trim(), {
      onSuccess: () => {
        setText('')
        setAttempted(false)
      },
    })
  }

  if (isLoading) return <InlineLoading description="Chargement des commentaires…" />

  const comments = data?.results ?? []

  return (
    <Stack gap={5}>
      <div data-testid="comments-list">
        {comments.length === 0 ? (
          <Tile>Aucun commentaire pour le moment.</Tile>
        ) : (
          <Stack gap={3}>
            {comments.map((c) => (
              <Tile key={c.id} data-testid={`comment-${c.id}`}>
                <div className="capsule-comment__meta">
                  {c.user?.username ?? 'inconnu'} ·{' '}
                  {c.submit_date
                    ? new Date(c.submit_date).toLocaleString('fr-FR')
                    : ''}
                </div>
                <div>{c.text}</div>
              </Tile>
            ))}
          </Stack>
        )}
      </div>

      <Tile>
        <Stack gap={4}>
          <TextArea
            id="comment-text"
            labelText={requiredLabel('Ajouter un commentaire')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            invalid={textInvalid}
            invalidText="Le commentaire est obligatoire."
          />
          <Button
            renderIcon={Send}
            disabled={addComment.isPending}
            data-testid="comment-submit"
            onClick={handlePost}
          >
            Publier le commentaire
          </Button>
        </Stack>
      </Tile>
    </Stack>
  )
}

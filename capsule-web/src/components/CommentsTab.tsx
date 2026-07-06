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

  if (isLoading) return <InlineLoading description="Loading comments…" />

  const comments = data?.results ?? []

  return (
    <Stack gap={5}>
      <div data-testid="comments-list">
        {comments.length === 0 ? (
          <Tile>No comments yet.</Tile>
        ) : (
          <Stack gap={3}>
            {comments.map((c) => (
              <Tile key={c.id} data-testid={`comment-${c.id}`}>
                <div className="capsule-comment__meta">
                  {c.user?.username ?? 'unknown'} ·{' '}
                  {c.submit_date
                    ? new Date(c.submit_date).toLocaleString()
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
            labelText={requiredLabel('Add a comment')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            invalid={textInvalid}
            invalidText="Comment is required."
          />
          <Button
            renderIcon={Send}
            disabled={addComment.isPending}
            data-testid="comment-submit"
            onClick={handlePost}
          >
            Post comment
          </Button>
        </Stack>
      </Tile>
    </Stack>
  )
}

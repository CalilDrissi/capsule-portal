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

export default function CommentsTab({ docId }: { docId: number }) {
  const { data, isLoading } = useDocumentComments(docId)
  const addComment = useAddComment(docId)
  const [text, setText] = useState('')

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
            labelText="Add a comment"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
          />
          <Button
            renderIcon={Send}
            disabled={!text.trim() || addComment.isPending}
            data-testid="comment-submit"
            onClick={() =>
              addComment.mutate(text.trim(), { onSuccess: () => setText('') })
            }
          >
            Post comment
          </Button>
        </Stack>
      </Tile>
    </Stack>
  )
}

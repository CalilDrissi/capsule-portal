import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Button,
  Dropdown,
  InlineLoading,
  Stack,
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
  StructuredListWrapper,
  Tag as CarbonTag,
  Tile,
} from '@carbon/react'
import { Add, Close } from '@carbon/icons-react'
import PageBreadcrumb from '../components/PageBreadcrumb'
import {
  useAddUserToGroup,
  useGroups,
  useRemoveUserFromGroup,
  useUser,
  useUserGroups,
} from '../api/queries'
import type { Group } from '../api/types'

/**
 * Membership note: the user→groups endpoint is read-only. Adding/removing a
 * user to a group is done via the group's users/add|remove sub-actions, so we
 * pick a group and call the add hook scoped to that group id.
 */
function GroupAdder({
  userId,
  addable,
  onAdded,
}: {
  userId: number
  addable: Group[]
  onAdded: () => void
}) {
  const [picked, setPicked] = useState<Group | null>(null)
  const add = useAddUserToGroup(picked?.id ?? 0)

  return (
    <Tile>
      <Stack gap={4}>
        <strong>Add to a group</strong>
        <Dropdown
          id="user-group-pick"
          titleText="Group"
          label="Choose a group"
          items={addable}
          selectedItem={picked}
          itemToString={(i) => (i ? i.name : '')}
          onChange={({ selectedItem }) => setPicked(selectedItem ?? null)}
        />
        <Button
          renderIcon={Add}
          data-testid="user-group-add-btn"
          disabled={!picked || add.isPending}
          onClick={() =>
            picked &&
            add.mutate(userId, {
              onSuccess: () => {
                setPicked(null)
                onAdded()
              },
            })
          }
        >
          Add to group
        </Button>
      </Stack>
    </Tile>
  )
}

function GroupChip({ userId, group }: { userId: number; group: Group }) {
  const remove = useRemoveUserFromGroup(group.id)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      <CarbonTag type="blue">{group.name}</CarbonTag>
      <Button
        kind="ghost"
        size="sm"
        hasIconOnly
        iconDescription={`Remove from ${group.name}`}
        renderIcon={Close}
        data-testid={`user-group-remove-${group.id}`}
        disabled={remove.isPending}
        onClick={() => remove.mutate(userId)}
      />
    </span>
  )
}

export default function UserDetailPage() {
  const { id } = useParams()
  const userId = id ? Number(id) : null
  const { data: user, isLoading, isError } = useUser(userId)
  const { data: userGroups, refetch } = useUserGroups(userId)
  const { data: allGroups } = useGroups()

  if (isLoading) return <InlineLoading description="Loading user…" />
  if (isError || !user)
    return (
      <div className="capsule-page">
        <PageBreadcrumb items={[{ label: 'Users', to: '/admin/users' }, { label: 'Not found' }]} />
        <Tile>User not found.</Tile>
      </div>
    )

  const memberOf = userGroups?.results ?? []
  const memberIds = new Set(memberOf.map((g) => g.id))
  const addable = (allGroups?.results ?? []).filter((g) => !memberIds.has(g.id))

  return (
    <div className="capsule-page">
      <PageBreadcrumb items={[{ label: 'Users', to: '/admin/users' }, { label: user.username }]} />
      <h2 className="capsule-page__title">{user.username}</h2>

      <div className="capsule-meta">
        <StructuredListWrapper isCondensed>
          <StructuredListBody>
            {[
              ['Username', user.username],
              ['First name', user.first_name],
              ['Last name', user.last_name],
              ['Email', user.email],
              ['Active', user.is_active ? 'Yes' : 'No'],
              ['Joined', user.date_joined ? new Date(user.date_joined).toLocaleString() : '—'],
            ].map(([k, v]) => (
              <StructuredListRow key={k as string}>
                <StructuredListCell head>{k}</StructuredListCell>
                <StructuredListCell>{(v as string) || '—'}</StructuredListCell>
              </StructuredListRow>
            ))}
          </StructuredListBody>
        </StructuredListWrapper>
      </div>

      <div className="capsule-tabs">
        <h3 className="capsule-section-title">Groups</h3>
        <Stack gap={5}>
          <div data-testid="user-groups-list">
            {memberOf.length === 0 ? (
              <Tile>This user is not in any group.</Tile>
            ) : (
              memberOf.map((g) => (
                <GroupChip key={g.id} userId={user.id} group={g} />
              ))
            )}
          </div>
          {addable.length > 0 && (
            <GroupAdder userId={user.id} addable={addable} onAdded={() => refetch()} />
          )}
        </Stack>
      </div>
    </div>
  )
}

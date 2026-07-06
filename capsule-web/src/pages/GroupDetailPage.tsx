import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Button,
  Dropdown,
  InlineLoading,
  Stack,
  Tag as CarbonTag,
  Tile,
} from '@carbon/react'
import { Add, Close } from '@carbon/icons-react'
import PageBreadcrumb from '../components/PageBreadcrumb'
import {
  useAddUserToGroup,
  useGroup,
  useGroupUsers,
  useRemoveUserFromGroup,
  useUsers,
} from '../api/queries'

export default function GroupDetailPage() {
  const { id } = useParams()
  const groupId = id ? Number(id) : null
  const { data: group, isLoading, isError } = useGroup(groupId)
  const { data: members } = useGroupUsers(groupId)
  const { data: allUsers } = useUsers()
  const add = useAddUserToGroup(groupId ?? 0)
  const remove = useRemoveUserFromGroup(groupId ?? 0)
  const [pickedId, setPickedId] = useState<number | null>(null)

  if (isLoading) return <InlineLoading description="Chargement du groupe…" />
  if (isError || !group)
    return (
      <div className="capsule-page">
        <PageBreadcrumb items={[{ label: 'Groupes', to: '/admin/groups' }, { label: 'Introuvable' }]} />
        <Tile>Groupe introuvable.</Tile>
      </div>
    )

  const memberList = members?.results ?? []
  const memberIds = new Set(memberList.map((u) => u.id))
  const addable = (allUsers?.results ?? []).filter((u) => !memberIds.has(u.id))
  const picked = addable.find((u) => u.id === pickedId) ?? null

  return (
    <div className="capsule-page">
      <PageBreadcrumb items={[{ label: 'Groupes', to: '/admin/groups' }, { label: group.name }]} />
      <h2 className="capsule-page__title">{group.name}</h2>

      <h3 className="capsule-section-title">Membres</h3>
      <Stack gap={5}>
        <div data-testid="group-members-list">
          {memberList.length === 0 ? (
            <Tile>Ce groupe n'a aucun membre.</Tile>
          ) : (
            memberList.map((u) => (
              <span key={u.id} style={{ display: 'inline-flex', alignItems: 'center' }}>
                <CarbonTag type="blue">{u.username}</CarbonTag>
                <Button
                  kind="ghost"
                  size="sm"
                  hasIconOnly
                  iconDescription={`Retirer ${u.username}`}
                  renderIcon={Close}
                  data-testid={`group-member-remove-${u.id}`}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(u.id)}
                />
              </span>
            ))
          )}
        </div>

        {addable.length > 0 && (
          <Tile>
            <Stack gap={4}>
              <strong>Ajouter un membre</strong>
              <Dropdown
                id="group-user-pick"
                titleText="Utilisateur"
                label="Choisir un utilisateur"
                items={addable}
                selectedItem={picked}
                itemToString={(i) => (i ? i.username : '')}
                onChange={({ selectedItem }) =>
                  setPickedId(selectedItem?.id ?? null)
                }
              />
              <Button
                renderIcon={Add}
                data-testid="group-member-add-btn"
                disabled={!picked || add.isPending}
                onClick={() =>
                  picked &&
                  add.mutate(picked.id, { onSuccess: () => setPickedId(null) })
                }
              >
                Ajouter le membre
              </Button>
            </Stack>
          </Tile>
        )}
      </Stack>
    </div>
  )
}

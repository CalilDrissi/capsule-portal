import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeaderGlobalAction } from '@carbon/react'
import { Notification, NotificationFilled } from '@carbon/icons-react'
import {
  useCapsuleNotifications,
  useMarkNotificationsRead,
} from '../api/queries'
import { useAppStore } from '../store/useAppStore'

/**
 * Header bell showing the Capsule unread count with a lightweight dropdown of
 * recent notifications (upload / request). Clicking an item with a linked
 * document opens it in the user's workspace document view; opening the panel
 * marks everything read.
 */
export default function NotificationBell() {
  const navigate = useNavigate()
  const role = useAppStore((s) => s.role)
  const { data } = useCapsuleNotifications()
  const markRead = useMarkNotificationsRead()
  const [open, setOpen] = useState(false)

  const unread = data?.unread_count ?? 0
  const items = data?.results ?? []

  function toggle() {
    const next = !open
    setOpen(next)
    if (next && unread > 0) markRead.mutate(undefined)
  }

  return (
    <div style={{ position: 'relative' }}>
      <HeaderGlobalAction
        aria-label="Notifications"
        tooltipAlignment="end"
        onClick={toggle}
        data-testid="notification-bell"
      >
        {unread > 0 ? (
          <NotificationFilled size={20} />
        ) : (
          <Notification size={20} />
        )}
        {unread > 0 && (
          <span className="capsule-bell-badge" data-testid="notification-count">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </HeaderGlobalAction>

      {open && (
        <div className="capsule-bell-panel" data-testid="notification-panel">
          <div className="capsule-bell-panel__header">Notifications</div>
          {items.length === 0 ? (
            <div className="capsule-bell-panel__empty">No notifications.</div>
          ) : (
            <ul className="capsule-bell-panel__list">
              {items.map((n) => (
                <li
                  key={n.id}
                  className="capsule-bell-panel__item"
                  data-testid={`notification-${n.id}`}
                  onClick={() => {
                    if (n.document_id != null) {
                      setOpen(false)
                      // Accountants reach the full document detail; clients
                      // reach their workspace document view.
                      navigate(
                        role === 'client'
                          ? `/workspace/documents/${n.document_id}`
                          : `/documents/${n.document_id}`,
                      )
                    }
                  }}
                  style={{
                    cursor: n.document_id != null ? 'pointer' : 'default',
                  }}
                >
                  <span className="capsule-bell-panel__msg">{n.message}</span>
                  <span className="capsule-bell-panel__time">
                    {new Date(n.datetime_created).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

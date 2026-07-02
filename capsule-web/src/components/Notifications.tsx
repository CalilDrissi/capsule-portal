import { ToastNotification } from '@carbon/react'
import { useNotifications } from '../store/useNotifications'

/**
 * Fixed toast region (top-right) rendering Carbon ToastNotifications for
 * action feedback. Mounted inside the themed shell so toasts follow the theme.
 */
export default function Notifications() {
  const notifications = useNotifications((s) => s.notifications)
  const dismiss = useNotifications((s) => s.dismiss)

  return (
    <div className="capsule-toasts" role="status" aria-live="polite">
      {notifications.map((n) => (
        <ToastNotification
          key={n.id}
          kind={n.kind}
          title={n.title}
          subtitle={n.subtitle}
          lowContrast
          timeout={n.kind === 'error' ? 0 : 5000}
          onClose={() => {
            dismiss(n.id)
            return true
          }}
        />
      ))}
    </div>
  )
}

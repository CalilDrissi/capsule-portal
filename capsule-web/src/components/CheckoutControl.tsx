import {
  Button,
  InlineNotification,
} from '@carbon/react'
import { Locked, Unlocked } from '@carbon/icons-react'
import {
  useCheckinDocument,
  useCheckoutDocument,
  useDocumentCheckout,
} from '../api/queries'

/** ISO datetime one day from now, used as the default checkout expiration. */
function defaultExpiration(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000)
  return d.toISOString().replace(/\.\d+Z$/, 'Z')
}

/** Checkout button shown in the detail header action row. */
export function CheckoutButton({ docId }: { docId: number }) {
  const { data: checkout } = useDocumentCheckout(docId)
  const checkout_ = useCheckoutDocument(docId)
  const checkin = useCheckinDocument(docId)

  if (checkout) {
    return (
      <Button
        kind="tertiary"
        renderIcon={Unlocked}
        disabled={checkin.isPending}
        data-testid="checkin-doc"
        onClick={() => checkin.mutate()}
      >
        Restituer
      </Button>
    )
  }

  return (
    <Button
      kind="tertiary"
      renderIcon={Locked}
      disabled={checkout_.isPending}
      data-testid="checkout-doc"
      onClick={() =>
        checkout_.mutate({
          expiration_datetime: defaultExpiration(),
          block_new_file: true,
        })
      }
    >
      Emprunter
    </Button>
  )
}

/** Banner shown above the detail body when a document is checked out. */
export function CheckoutBanner({ docId }: { docId: number }) {
  const { data: checkout } = useDocumentCheckout(docId)
  if (!checkout) return null

  const who = checkout.user?.username ?? 'quelqu\'un'
  const when = checkout.checkout_datetime
    ? new Date(checkout.checkout_datetime).toLocaleString('fr-FR')
    : '—'
  const until = checkout.expiration_datetime
    ? new Date(checkout.expiration_datetime).toLocaleString('fr-FR')
    : '—'

  return (
    <InlineNotification
      kind="warning"
      lowContrast
      hideCloseButton
      data-testid="checkout-banner"
      title="Emprunté"
      subtitle={`Emprunté par ${who} le ${when}. La modification de nouveaux fichiers est bloquée jusqu'au ${until}.`}
    />
  )
}

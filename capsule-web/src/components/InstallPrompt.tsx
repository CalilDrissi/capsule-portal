import { useEffect, useState } from 'react'
import { Button, Modal } from '@carbon/react'
import { Close, Share, Add } from '@carbon/icons-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'capsule-install-dismissed'

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  const ua = navigator.userAgent
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS 13+ reports as Macintosh but has touch
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  )
}

/**
 * A bottom banner inviting the user to install Capsule on their phone.
 * - Android/Chromium: captures `beforeinstallprompt` and triggers the native
 *   install dialog.
 * - iOS Safari (no such event): shows instructions to "Add to Home Screen",
 *   plus a link to the printable Safari install guide.
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [iosOpen, setIosOpen] = useState(false)
  const ios = isIos()

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY) === '1') return

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    // iOS has no beforeinstallprompt — show the banner (with instructions) after
    // a short delay so it doesn't cover the first paint.
    let iosTimer: number | undefined
    if (ios) {
      iosTimer = window.setTimeout(() => setVisible(true), 2500)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      if (iosTimer) window.clearTimeout(iosTimer)
    }
  }, [ios])

  function dismiss() {
    setVisible(false)
    localStorage.setItem(DISMISS_KEY, '1')
  }

  async function install() {
    if (ios) {
      setIosOpen(true)
      return
    }
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice.catch(() => null)
    setDeferred(null)
    dismiss()
  }

  if (!visible) return null

  return (
    <>
      <div className="capsule-install" role="dialog" aria-label="Installer l'application">
        <img src="/icon-192.png" alt="" width={44} height={44} className="capsule-install__icon" />
        <div className="capsule-install__text">
          <strong>Installer Capsule</strong>
          <span>Ajoutez l'application à votre écran d'accueil pour un accès rapide.</span>
        </div>
        <Button size="sm" onClick={install} data-testid="install-app">
          Installer
        </Button>
        <button
          className="capsule-install__close"
          aria-label="Fermer"
          onClick={dismiss}
        >
          <Close size={20} />
        </button>
      </div>

      <Modal
        open={iosOpen}
        modalHeading="Installer sur iPhone / iPad"
        passiveModal
        onRequestClose={() => setIosOpen(false)}
        data-testid="ios-install-modal"
      >
        <p style={{ marginBottom: '1rem' }}>
          Dans <strong>Safari</strong>, ajoutez Capsule à votre écran d'accueil :
        </p>
        <ol style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: 0, listStyle: 'none' }}>
          <li style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <Share size={20} /> Appuyez sur le bouton <strong>Partager</strong> (en bas de l'écran).
          </li>
          <li style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <Add size={20} /> Choisissez <strong>« Sur l'écran d'accueil »</strong>.
          </li>
          <li style={{ paddingLeft: '1.7rem' }}>
            Appuyez sur <strong>« Ajouter »</strong> en haut à droite.
          </li>
        </ol>
        <p style={{ marginTop: '1.25rem' }}>
          <a href="/aide/installer-safari.pdf" target="_blank" rel="noopener">
            Télécharger le guide d'installation (PDF)
          </a>
        </p>
      </Modal>
    </>
  )
}

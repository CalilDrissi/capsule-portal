import type { ReactNode } from 'react'

/**
 * A form field label with a required-marker asterisk (Carbon red-60).
 * Use for every mandatory field so required fields read at a glance:
 *
 *   <TextInput labelText={requiredLabel('Firm name')} invalid={...} invalidText="..." />
 *
 * Pair it with `invalid` + `invalidText` that are set only after a save attempt,
 * and keep the submit button clickable so the user gets the inline error.
 */
export function requiredLabel(text: string): ReactNode {
  return (
    <span>
      {text}{' '}
      <span aria-hidden="true" style={{ color: '#da1e28' }}>
        *
      </span>
    </span>
  )
}

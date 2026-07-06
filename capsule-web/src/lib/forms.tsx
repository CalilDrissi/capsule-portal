import type { ReactNode } from 'react'

/**
 * Minimum password length — MUST match the backend policy
 * (capsule_org/serializers.py MINIMUM_PASSWORD_LENGTH). Keep in one place so the
 * client-side gate can never drift below the server's, which would let a user
 * submit a password the server rejects with a confusing error.
 */
export const MIN_PASSWORD_LENGTH = 10

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

import { useUiText } from '../../localization/hooks/useUiText'
export function ProfileField({ label, value }) {
  const ui = useUiText()
  return (
    <div className="profile-field">
      <span>{ui(label)}</span>
      <strong>{value ? [ui('Role'), ui('Industry')].includes(label) ? ui(value) : value : ui('Not provided')}</strong>
    </div>
  )
}

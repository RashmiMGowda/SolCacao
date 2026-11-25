import { useUiText } from '../../localization/hooks/useUiText'
export function FormField({
  error,
  label,
  name,
  onChange,
  options = [],
  required = true,
  type = 'text',
  value,
  ...inputProps
}) {
  const ui = useUiText()
  const fieldId = inputProps.id || name

  return (
    <label className="form-field" htmlFor={fieldId}>
      <span>
        {ui(label)}
        {required ? <b aria-hidden="true">*</b> : null}
      </span>
      {type === 'select' ? (
        <select
          id={fieldId}
          name={name}
          onChange={onChange}
          required={required}
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          {...inputProps}
        >
          {options.map((option) => {
            const item = typeof option === 'string' ? { label: option, value: option } : option

            return (
              <option key={item.value} value={item.value}>
                {ui(item.label)}
              </option>
            )
          })}
        </select>
      ) : (
        <input
          id={fieldId}
          name={name}
          onChange={onChange}
          required={required}
          type={type}
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          {...inputProps}
        />
      )}
      {error ? <small id={`${fieldId}-error`} role="alert">{ui(error)}</small> : null}
    </label>
  )
}

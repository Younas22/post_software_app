import { useId, type ReactElement, cloneElement } from 'react'

interface FieldProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: ReactElement<{ id?: string; invalid?: boolean; 'aria-describedby'?: string }>
}

export function Field({ label, error, hint, required, children }: FieldProps): React.JSX.Element {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-error">*</span>}
      </label>
      {cloneElement(children, { id, invalid: Boolean(error), 'aria-describedby': describedBy })}
      {error && (
        <p id={`${id}-error`} className="text-xs text-error">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  )
}

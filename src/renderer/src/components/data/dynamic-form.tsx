import { Field } from '@renderer/components/ui/field'
import { Input } from '@renderer/components/ui/input'
import { Textarea } from '@renderer/components/ui/textarea'
import { Select } from '@renderer/components/ui/select'
import { Checkbox } from '@renderer/components/ui/checkbox'
import type { FormFieldConfig } from './field-config'

export type FormValues = Record<string, string | number | boolean | undefined>

interface DynamicFormProps {
  fields: FormFieldConfig[]
  values: FormValues
  errors?: Record<string, string[]>
  onChange: (name: string, value: string | number | boolean) => void
}

export function DynamicForm({ fields, values, errors = {}, onChange }: DynamicFormProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const error = errors[field.name]?.[0]
        const wrapperClass = field.type === 'textarea' ? 'sm:col-span-2' : undefined

        if (field.type === 'checkbox') {
          return (
            <label key={field.name} className={`flex items-center gap-2 pt-6 ${wrapperClass ?? ''}`}>
              <Checkbox checked={Boolean(values[field.name])} onChange={(e) => onChange(field.name, e.target.checked)} />
              <span className="text-sm font-medium">{field.label}</span>
            </label>
          )
        }

        return (
          <div key={field.name} className={wrapperClass}>
            <Field label={field.label} error={error} hint={field.hint} required={field.required}>
              {field.type === 'textarea' ? (
                <Textarea
                  value={(values[field.name] as string) ?? ''}
                  placeholder={field.placeholder}
                  onChange={(e) => onChange(field.name, e.target.value)}
                />
              ) : field.type === 'select' ? (
                <Select value={(values[field.name] as string) ?? ''} onChange={(e) => onChange(field.name, e.target.value)}>
                  <option value="" disabled>
                    Select...
                  </option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  type={field.type}
                  step={field.step}
                  value={(values[field.name] as string | number) ?? ''}
                  placeholder={field.placeholder}
                  onChange={(e) => onChange(field.name, field.type === 'number' ? e.target.valueAsNumber : e.target.value)}
                />
              )}
            </Field>
          </div>
        )
      })}
    </div>
  )
}

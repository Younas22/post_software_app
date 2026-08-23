export interface SelectOption {
  value: string
  label: string
}

export interface FormFieldConfig {
  name: string
  label: string
  type: 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select' | 'checkbox' | 'date'
  required?: boolean
  options?: SelectOption[]
  placeholder?: string
  hint?: string
  step?: string
}

export interface ColumnConfig<T> {
  header: string
  render: (row: T) => React.ReactNode
  className?: string
}

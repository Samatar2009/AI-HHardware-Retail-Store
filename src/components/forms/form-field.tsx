import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'

export interface FormFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: Path<TFieldValues>
  render: (field: {
    value: unknown
    onChange: (value: unknown) => void
    onBlur: () => void
    error?: string
  }) => React.ReactElement
}

/** Wraps react-hook-form's Controller and surfaces fieldState.error as a plain
 * message string so it can be passed straight into ui/input's `error` prop. */
function FormField<TFieldValues extends FieldValues>({ control, name, render }: FormFieldProps<TFieldValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) =>
        render({
          value: field.value,
          onChange: field.onChange,
          onBlur: field.onBlur,
          error: fieldState.error?.message,
        })
      }
    />
  )
}

export { FormField }

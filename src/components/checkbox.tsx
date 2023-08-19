import { FormControlLabel, Checkbox as SuidCheckbox } from '@suid/material'

interface CheckboxProps {
    checked: boolean
    label?: string
    disabled?: boolean
    onChange: (checked: boolean) => void
}

export const Checkbox = (props: CheckboxProps) =>
    <FormControlLabel label={props.label} disabled={props.disabled} control={
        <SuidCheckbox checked={props.checked} disabled={props.disabled} size='small' onChange={(_, checked) => props.onChange(checked)} />
    } />
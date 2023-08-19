import { FormControl, Select as SuidSelect, InputLabel, MenuItem } from '@suid/material'
import { JSX } from 'solid-js'

interface SelectItemProps {
    value: string,
    children: JSX.Element
}

interface SelectProps<T> {
    id: string
    label: string
    value: T
    width?: string
    disabled?: boolean
    onChange: (value: T) => void
    children: JSX.Element
}

export const Select = <T,>(props: SelectProps<T>) => (<FormControl sx={{ width: props.width }}>
    <InputLabel for={props.id}>{props.label}</InputLabel>
    <SuidSelect id={props.id} size='small' label={props.label} disabled={props.disabled} value={props.value} onChange={e => props.onChange(e.target.value)}>
        {props.children}
    </SuidSelect>
</FormControl>)

Select.Item = (props: SelectItemProps) => <MenuItem value={props.value}>{props.children}</MenuItem>
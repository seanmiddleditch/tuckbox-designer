import { FormControl, Select as SuidSelect, InputLabel, MenuItem } from '@suid/material'
import { Component, JSX } from 'solid-js'

interface SelectItemProps {
    value: string | number
    children: JSX.Element
}

interface SelectProps<T> {
    id: string
    label?: string
    value: T
    width?: string
    variant?: 'standard' | 'outlined'
    disabled?: boolean
    onChange: (value: T) => void
    children: JSX.ArrayElement
}

export const Select = <T,>(props: SelectProps<T>) => (<FormControl sx={{ width: props.width }}>
    <InputLabel for={props.id}>{props.label}</InputLabel>
    <SuidSelect id={props.id} size='small' variant={props.variant ?? 'outlined'} label={props.label} disabled={props.disabled} value={props.value} onChange={e => props.onChange(e.target.value)}>
        {props.children}
    </SuidSelect>
</FormControl>)

Select.Item = (props: SelectItemProps) => <MenuItem value={props.value}>{props.children}</MenuItem>
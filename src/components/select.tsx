import { FormControl, Select as SuidSelect, InputLabel, MenuItem, Typography } from '@suid/material'
import { JSX } from 'solid-js'

interface SelectItemProps {
    value: string | number
    children: JSX.Element
    style?: string
    note?: JSX.Element
}

interface SelectProps<T> {
    id: string
    label?: string
    value: T
    width?: string
    variant?: 'standard' | 'outlined'
    disabled?: boolean
    onChange: (value: T) => void
    renderValue?: (value: T) => JSX.Element
    children: JSX.Element
}

export const Select = <T,>(props: SelectProps<T>) => <FormControl size='small' sx={{ width: props.width }}>
    <InputLabel for={props.id}>{props.label}</InputLabel>
    <SuidSelect id={props.id} size='small' variant={props.variant ?? 'outlined'} label={props.label} disabled={props.disabled} value={props.value} onChange={e => props.onChange(e.target.value)} renderValue={props.renderValue}>
        {props.children}
    </SuidSelect>
</FormControl>

Select.Item = (props: SelectItemProps) => <MenuItem value={props.value} style={props.style}>
    <Typography>{props.children}</Typography>
    <Typography variant='body2' color='text.secondary' align='right' style='width: 100%'>{props.note}</Typography>
</MenuItem>
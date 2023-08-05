import { FormControl, Select as SuidSelect, InputLabel, MenuItem } from '@suid/material'
import { Component, JSX } from 'solid-js'

interface SelectItemProps {
    value: string,
    children: JSX.Element
}

interface SelectProps {
    id: string,
    label: string,
    value: string,
    width?: string,
    onChange: (value: string) => void,
    children: JSX.ArrayElement
}

type Select = Component<SelectProps> & { Item: Component<SelectItemProps> }

export const Select: Select = props => (<FormControl sx={{ width: props.width }}>
    <InputLabel for={props.id}>{props.label}</InputLabel>
    <SuidSelect id={props.id} size='small' label={props.label} value={props.value} onChange={e => props.onChange(e.target.value)}>
        {props.children}
    </SuidSelect>
</FormControl>)

Select.Item = props => <MenuItem value={props.value}>{props.children}</MenuItem>
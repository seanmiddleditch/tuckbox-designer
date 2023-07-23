import { FormControl, Select as SuidSelect, InputLabel, MenuItem } from '@suid/material'

export const Select = props => (<FormControl sx={{ width: props.width }}>
    <InputLabel for={props.id}>{props.label}</InputLabel>
    <SuidSelect id={props.id} size='small' label={props.label} value={props.value} onChange={e => props.onChange(e.target.value)}>
        {props.children}
    </SuidSelect>
</FormControl>)

Select.Item = props => <MenuItem value={props.value}>{props.children}</MenuItem>
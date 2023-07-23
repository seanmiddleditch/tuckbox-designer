import { ToggleButton, ToggleButtonGroup } from '@suid/material'

export const Toggle = {
    Group: props => <ToggleButtonGroup size='small' exclusive={props.exclusive ?? true} value={props.value} onChange={(_, value) => props.onChange(value)}>{props.children}</ToggleButtonGroup>,
    Button: props => <ToggleButton value={props.value}>{props.children}</ToggleButton>
}
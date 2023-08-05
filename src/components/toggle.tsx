import { ToggleButton, ToggleButtonGroup } from '@suid/material'
import { Component, JSX } from 'solid-js'

interface ToggleGroupProps {
    exclusive?: boolean,
    style?: JSX.CSSProperties,
    value: string,
    onChange: (value: string) => void,
    children: JSX.Element
}

interface ToggleButtonProps {
    value: string,
    children: JSX.Element
}

interface Toggle {
    Group: Component<ToggleGroupProps>,
    Button: Component<ToggleButtonProps>
}

export const Toggle: Toggle = {
    Group: props => <ToggleButtonGroup size='small' style={props.style} exclusive={props.exclusive ?? true} value={props.value} onChange={(_, value) => props.onChange(value)}>{props.children}</ToggleButtonGroup>,
    Button: props => <ToggleButton value={props.value}>{props.children}</ToggleButton>
}
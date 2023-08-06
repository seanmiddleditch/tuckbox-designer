import { ToggleButton as SuidToggleButton, ToggleButtonGroup } from '@suid/material'
import { Component, JSX } from 'solid-js'

interface ToggleButtonProps<T> {
    exclusive?: boolean,
    style?: JSX.CSSProperties,
    value: T,
    onChange: (value: T) => void,
    children: JSX.Element
}

interface ToggleButtonItemProps {
    value: string,
    children: JSX.Element
}

export const ToggleButton = <T extends string,>(props: ToggleButtonProps<T>) => <ToggleButtonGroup size='small' style={props.style} exclusive={props.exclusive ?? true} value={props.value} onChange={(_, value) => props.onChange(value)}>{props.children}</ToggleButtonGroup>

ToggleButton.Item = (props: ToggleButtonItemProps) => <SuidToggleButton value={props.value}>{props.children}</SuidToggleButton>
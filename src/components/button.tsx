import { Component, JSX } from 'solid-js'
import { Button as SuidButton, ButtonGroup } from '@suid/material'

interface ButtonProps {
    variant?: 'contained' | 'outlined',
    color?: 'primary' | 'secondary' | 'error',
    onClick: () => void,
    children: JSX.Element
}

type ButtonGroup = Component<{ children: JSX.Element }>
type Button = Component<ButtonProps> & { Group: ButtonGroup }

export const Button: Button = props => <SuidButton variant={props.variant ?? 'contained'} color={props.color} onClick={props.onClick}>{props.children}</SuidButton>

Button.Group = props => <ButtonGroup>{props.children}</ButtonGroup>
import { Stack } from '@suid/material'
import { Component, JSX } from 'solid-js'

interface StackProps {
    spacing?: number,
    width?: number | string,
    height?: number | string,
    alignItems?: 'center' | 'flex-start' | 'flex-end' | 'baseline'
    children: JSX.Element
}

export const HStack: Component<StackProps> = props => <Stack spacing={props.spacing || 2} direction='row' width={props.width} height={props.height} alignItems={props.alignItems}>{props.children}</Stack>
export const VStack: Component<StackProps> = props => <Stack spacing={props.spacing || 2} width={props.width} height={props.height} alignItems={props.alignItems}>{props.children}</Stack>
import { Stack } from '@suid/material'

export const HStack = props => <Stack spacing={props.spacing || 2} direction='row' width={props.width} height={props.height} alignItems={props.alignItems}>{props.children}</Stack>
export const VStack = props => <Stack spacing={props.spacing || 2} width={props.width} height={props.height} alignItems={props.alignItems}>{props.children}</Stack>
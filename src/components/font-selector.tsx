import { Box, FormControl, InputLabel, OutlinedInput, Popover } from '@suid/material'
import { Font } from '../types'
import { ColorPicker } from './color-picker'
import { NumberInput } from './number-input'
import { Select } from './select'
import { HStack, VStack } from './stack'
import { createSignal } from 'solid-js'

interface FontSelectorProps {
    id: string
    label: string
    disabled?: boolean
    value: Font
    onChange: (font: Partial<Font>) => void
}

export const FontSelector = (props: FontSelectorProps) => {
    const [anchor, setAnchor] = createSignal<HTMLElement|null>(null)

    const onClick = (e: MouseEvent) => setAnchor(e.target as HTMLInputElement)

    const onClose = () => setAnchor(null)

    return <>
        <FormControl size='small' variant='outlined'>
            <InputLabel for={props.id} variant='outlined' filled>{props.label}</InputLabel>
            <OutlinedInput id={props.id} readOnly onClick={onClick} disabled={props.disabled} label={props.label} value={`${props.value.size}pt ${props.value.family} ${props.value.weight}`} />
        </FormControl>
        <Popover anchorEl={anchor()} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} open={anchor() != null} onClose={onClose}>
            <Box sx={{ border: 1, p: 3, bgcolor: 'background.paper' }}>
                <VStack>
                    <HStack>
                        <Select id={`${props.id}-font-family`} label='Font Family' disabled={props.disabled} value={props.value.family} onChange={family => props.onChange({ family })}>
                            <Select.Item value='Courier'>Courier</Select.Item>
                            <Select.Item value='Helvetica'>Helvetica</Select.Item>
                            <Select.Item value='Times-Roman'>Times Roman</Select.Item>
                        </Select>
                        <NumberInput id={`${props.id}-font-size`} label='Font Size' units='pt' integer disabled={props.disabled} value={props.value.size} onChange={size => props.onChange({ size })} />
                        <NumberInput id={`${props.id}-font-weight`} label='Font Weight' disabled={props.disabled} value={props.value.weight} onChange={weight => props.onChange({ weight })} />
                    </HStack>
                    <HStack>
                        <ColorPicker id={`${props.id}-font-color`} label='Font Color' disabled={props.disabled} color={props.value.color} onChange={color => props.onChange({ color })} />
                        <NumberInput id={`${props.id}-font-outline-width`} label='Width' disabled={props.disabled} value={props.value.outlineWidth} onChange={outlineWidth => props.onChange({ outlineWidth })} />
                        <ColorPicker id={`${props.id}-font-outline-color`} label='Outline Color' disabled={props.disabled} color={props.value.outlineColor} onChange={outlineColor => props.onChange({ outlineColor })} />
                    </HStack>
                </VStack>
            </Box>
        </Popover>
    </>
}
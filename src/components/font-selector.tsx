import { Box, Button, FormControl, InputAdornment, InputLabel, OutlinedInput, Popover } from '@suid/material'
import { Font, RGB } from '../types'
import { ColorPicker } from './color-picker'
import { NumberInput } from './number-input'
import { Select } from './select'
import { HStack, VStack } from './stack'
import { Component, createSignal } from 'solid-js'
import { colorToString } from '../color'
import { HelpButton } from './help-button'

interface FontSelectorProps {
    id: string
    label: string
    disabled?: boolean
    value: Font
    onChange: (font: Partial<Font>) => void
}

interface FontColorProps {
    disabled?: boolean
    color: RGB
    outlineColor: RGB
    outlineWidth: number
}

const FontColor: Component<FontColorProps> = props =>
    <div style={{
        'width': '2ch',
        'height': '2ch',
        'background-color': '#fff',
        'border': '2px solid #fff',
        'box-shadow': '0 0 0 1px #ccc',
        'border-radius': '8px',
        'overflow': 'hidden'
    }}>
        <div style={{
            'box-sizing': 'border-box',
            'width': '100%',
            'height': '100%',
            'background-color': colorToString(props.color),
            'background-position': '0 0, 3px 3px',
            'background-size': '8px 8px',
            'border-style': 'solid',
            'border-color': colorToString(props.outlineColor),
            'border-width': `${props.outlineWidth}px`,
            'border-radius': 'inherit',
        }}></div>
    </div>

export const FontSelector = (props: FontSelectorProps) => {
    const [anchor, setAnchor] = createSignal<HTMLElement | null>(null)
    const [isOpen, setIsOpen] = createSignal<boolean>(false)

    const button = () => <InputAdornment position='end'><FontColor color={props.value.color} outlineColor={props.value.outlineColor} outlineWidth={props.value.outlineWidth} disabled={props.disabled} /></InputAdornment>

    const onClick = () => { if (!props.disabled) setIsOpen(true) }

    const onClose = () => setIsOpen(false)
    
    return <>
        <FormControl ref={setAnchor} size='small' variant='outlined'>
            <InputLabel for={props.id} variant='outlined' filled>{props.label}</InputLabel>
            <OutlinedInput id={props.id} readOnly onClick={onClick} disabled={props.disabled} label={props.label} value={`${props.value.size}pt ${props.value.family} ${props.value.weight}`} endAdornment={button()} />
        </FormControl>
        <Popover anchorEl={anchor()} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} open={isOpen()} onClose={onClose}>
            <Box sx={{ border: 1, p: 3, bgcolor: 'background.paper' }}>
                <VStack>
                    <HStack alignItems='center'>
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
                        <NumberInput id={`${props.id}-font-outline-width`} label='Outline Width' units='px' disabled={props.disabled} value={props.value.outlineWidth} onChange={outlineWidth => props.onChange({ outlineWidth })} />
                        <ColorPicker id={`${props.id}-font-outline-color`} label='Outline Color' disabled={props.disabled} color={props.value.outlineColor} onChange={outlineColor => props.onChange({ outlineColor })} />
                    </HStack>
                </VStack>
            </Box>
        </Popover>
    </>
}
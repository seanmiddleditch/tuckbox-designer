import { Button, InputAdornment, FormControl, OutlinedInput, Popover, InputLabel } from '@suid/material'
import { Component, batch } from 'solid-js'
import { createSignal } from 'solid-js'
import { ChromePicker } from 'solid-color'
import { RGB } from '../types'
import { colorToString } from '../color'

interface ColorButtonsProps {
    color: RGB,
    disabled?: boolean
    onClick: (e: any) => void
}

const ColorButton: Component<ColorButtonsProps> = props => <Button onClick={props.onClick} disabled={props.disabled} style={{ padding: 0, 'min-width': '0' }}>
    <div style={{
        'width': '2ch',
        'height': '2ch',
        'background-image': 'repeating-linear-gradient(45deg,#aaa 25%,transparent 25%,transparent 75%,#aaa 75%,#aaa),repeating-linear-gradient(45deg,#aaa 25%,#fff 25%,#fff 75%,#aaa 75%,#aaa)',
        'background-position': '0 0, 4px 4px',
        'background-size': '8px 8px',
        'border': '4px solid #fff',
        'box-shadow': '0 0 0 1px #ccc',
        'border-radius': '8px'
    }}>
        <div style={{
            'border-radius': 'inherit',
            'width': '100%',
            'height': '100%',
            'background-color': colorToString(props.color),
            'border-color': colorToString(props.color),
            'border-width': '2px',
            'border-style': 'solid',
            'position': 'relative',
            'left': '-2px',
            'top': '-2px',
        }}></div>
    </div>
</Button>

interface ColorPickerProps {
    id: string
    color: RGB
    label: string
    disabled?: boolean
    onChange: (value: RGB) => void
}

export const ColorPicker: Component<ColorPickerProps> = props => {
    const [isColorOpen, setColorOpen] = createSignal(false)
    const [anchor, setAnchor] = createSignal<HTMLElement|null>(null)

    const button = () => <InputAdornment position='end'><ColorButton color={props.color} disabled={props.disabled} onClick={() => setColorOpen(true)} /></InputAdornment>

    const onClick = (e: MouseEvent) => {
        const input = e.target as HTMLInputElement
        setAnchor(input)
        if (input.selectionStart == input.selectionEnd)
            setColorOpen(true)
    }

    const onClose = () => batch(() => {
        setColorOpen(false)
        setAnchor(null)
    })

    return <>
        <FormControl size='small' variant='outlined' style='width: 17ch'>
            <InputLabel for={props.id} variant='outlined' filled>{props.label}</InputLabel>
            <OutlinedInput id={props.id} readOnly onClick={onClick} disabled={props.disabled} label={props.label} value={colorToString(props.color)} endAdornment={button()} />
        </FormControl>
        <Popover anchorEl={anchor()} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} open={isColorOpen()} onClose={onClose}>
            <ChromePicker color={props.color} disableAlpha onChange={color => props.onChange(color.rgb) } />
        </Popover>
    </>
}
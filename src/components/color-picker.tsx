import { Button, Modal, Box, TextField, InputAdornment, FormControl, OutlinedInput, FormControlLabel, InputLabel } from '@suid/material'
import { Component } from 'solid-js'
import { createSignal } from 'solid-js'
import { ChromePicker } from 'solid-color'
import { RGB } from '../types'

interface ColorButtonsProps {
    color: RGB,
    onClick: (e: any) => void
}

const colorToString = (rgb: RGB) => `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`

const ColorButton: Component<ColorButtonsProps> = props => <Button onClick={props.onClick} style={{ padding: 0, 'min-width': 0 }}>
    <div style={{
        'width': '1.5em',
        'height': '1.5em',
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
    onChange: (value: RGB) => void
}

export const ColorPicker: Component<ColorPickerProps> = props => {
    const [isColorOpen, setColorOpen] = createSignal(false)

    const button = () => <InputAdornment position='start'><ColorButton color={props.color} onClick={() => setColorOpen(true)} /></InputAdornment>

    return <>
        <FormControl size='small' variant='outlined'>
            <InputLabel for={props.id} variant='outlined' filled>{props.label}</InputLabel>
            <OutlinedInput id={props.id} disabled label={props.label} value={colorToString(props.color)} startAdornment={button()} />
        </FormControl>
        <Modal open={isColorOpen()} onClose={() => setColorOpen(false)}>
            <Box sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                bgcolor: 'background.paper',
                border: "2px solid #000",
                boxShadow: "24px",
                p: 4,
            }}>
                <ChromePicker color={props.color} disableAlpha onChange={color => props.onChange(color.rgb) } />
            </Box>
        </Modal>
    </>
}
import { Button, Modal, Box, TextField, InputAdornment } from '@suid/material'
import { Component } from 'solid-js'
import { createSignal } from 'solid-js'
import { ChromePicker, ColorResult } from 'solid-color'

interface ColorButtonsProps {
    color: string,
    onClick: (e: any) => void
}

const ColorButton: Component<ColorButtonsProps> = props => <Button onClick={props.onClick} sx={{ padding: 0 }}>
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
            'background-color': props.color,
            'border-color': props.color,
            'border-width': '2px',
            'border-style': 'solid',
            'position': 'relative',
            'left': '-2px',
            'top': '-2px',
        }}></div>
    </div>
</Button>

interface ColorPickerProps {
    color: string,
    label: string,
    onChange: (value: string) => void
}

export const ColorPicker: Component<ColorPickerProps> = props => {
    const [isColorOpen, setColorOpen] = createSignal(false)

    const alphify = (color: ColorResult) => color.hex + ('0' + Math.round((color.rgb.a ?? 1) * 255).toString(16)).slice(-2)

    return <>
        <TextField
            size='small' variant='outlined'
            id='color'
            label={props.label}
            value={props.color}
            InputProps={{
                endAdornment: <InputAdornment position='end'><ColorButton color={props.color} onClick={() => setColorOpen(true)} /></InputAdornment>,
            }}/>
        <Modal open={isColorOpen()} onClose={() => setColorOpen(false)}>
            <Box sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 400,
                bgcolor: 'background.paper',
                border: "2px solid #000",
                boxShadow: "24px",
                p: 4,
            }}>
                <ChromePicker color={props.color} onChangeComplete={color => props.onChange(alphify(color)) } />
            </Box>
        </Modal>
    </>
}
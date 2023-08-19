import { TextField, InputAdornment } from '@suid/material'
import { Component } from 'solid-js'

interface TextInputProps {
    id: string
    value: string
    label: string
    placeholder?: string
    disabled?: boolean
    sx: {}
    onChange: (value: string) => void
}

export const TextInput: Component<TextInputProps> = (props) => 
    <TextField id={props.id} size='small' variant='outlined' sx={props.sx ?? { width: '14ch' }}
        disabled={props.disabled}
        placeholder={props.placeholder}
        value={props.value}
        label={props.label}
        InputLabelProps={{ shrink: true }}
        onChange={e => props.onChange(e.target.value)}/>
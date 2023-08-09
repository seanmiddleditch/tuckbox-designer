import { Component } from 'solid-js'
import { TextField, InputAdornment } from '@suid/material'

interface NumberInputProps {
    id: string
    value: number
    disabled?: boolean
    integer?: boolean
    label: string
    units?: string
    onChange: (value: number) => void
}

export const NumberInput: Component<NumberInputProps> = (props) => 
    <TextField id={props.id} size='small' variant='outlined' sx={{width: '14ch'}}
        value={props.value}
        disabled={props.disabled}
        label={props.label}
        type={props.integer ? 'number' : 'text'}
        onChange={e => {
            const value = Number.parseFloat(e.target.value)
            if (!Number.isNaN(value))
                props.onChange(value)
        }}
        InputProps={{
            endAdornment: props.units ? <InputAdornment position='end'>{props.units}</InputAdornment> : undefined,
        }}/>
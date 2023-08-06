import { Component } from 'solid-js'
import { TextField, InputAdornment } from '@suid/material'

interface NumberInputProps {
    id: string
    value: number
    controlled?: boolean
    disabled?: boolean
    label: string
    units?: string
    onChange: (value: number) => void
}

export const NumberInput: Component<NumberInputProps> = (props) => 
    <TextField id={props.id} size='small' variant='outlined' sx={{width: '14ch'}}
        defaultValue={props.controlled ? undefined : props.value}
        value={props.controlled ? props.value : undefined}
        disabled={props.disabled}
        label={props.label}
        onChange={e => props.onChange(Number.parseFloat(e.target.value))}
        InputProps={{
            endAdornment: props.units ? <InputAdornment position='end'>{props.units}</InputAdornment> : undefined,
        }}/>
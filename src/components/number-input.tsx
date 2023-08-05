import { Component } from 'solid-js'
import { TextField, InputAdornment } from '@suid/material'

interface NumberInputProps {
    id: string,
    value: number,
    label: string,
    units?: string,
    onChange: (value: number) => void,
}

export const NumberInput: Component<NumberInputProps> = (props) => 
    <TextField id={props.id} size='small' variant='outlined' sx={{width: '14ch'}}
        defaultValue={props.value}
        label={props.label}
        onChange={e => props.onChange(Number.parseFloat(e.target.value))}
        InputProps={{
            endAdornment: props.units ? <InputAdornment position='end'>{props.units}</InputAdornment> : undefined,
        }}/>
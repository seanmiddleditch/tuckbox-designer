import { Component } from 'solid-js'
import { TextField, InputAdornment } from '@suid/material'

interface SizeInputProps {
    id: string,
    value: string,
    label: string,
    units?: string,
    onChange: (value: string) => void,
}

export const SizeInput: Component<SizeInputProps> = (props) => 
    <TextField id={props.id} size='small' variant='outlined' sx={{width: '14ch'}}
        value={props.value}
        label={props.label}
        onChange={e => props.onChange(e.target.value)}
        InputProps={{
            endAdornment: props.units ? <InputAdornment position='end'>{props.units}</InputAdornment> : undefined,
        }}/>
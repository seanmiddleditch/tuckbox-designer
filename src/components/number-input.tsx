import { Component, createSignal } from 'solid-js'
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

const isNumeric = (text: string) => /^[0-9]*([.][0-9]*)?$/.test(text)

export const NumberInput: Component<NumberInputProps> = (props) => {
    const [value, setValue] = createSignal(props.value.toString())


    const onChange = (e: Event) => {
        const input = e.target as HTMLInputElement
        const newValue = input.value

        if (!isNumeric(newValue))
            return

        const newNumber = Number.parseFloat(newValue)
        const isValid = newValue !== '' && !Number.isNaN(newNumber)

        setValue(newValue)
        if (isValid)
            props.onChange(newNumber)
    }

    const onBlur = () => {
        setValue(props.value.toString())
    }

    return <TextField id={props.id} size='small' variant='outlined' sx={{ width: '14ch' }}
        value={value()}
        disabled={props.disabled}
        label={props.label}
        type={props.integer ? 'number' : 'text'}
        onChange={e => onChange(e)}
        onBlur={_ => onBlur()}
        InputProps={{
            endAdornment: props.units ? <InputAdornment position='end'>{props.units}</InputAdornment> : undefined,
        }} />
}
import { Component, batch, createSignal } from 'solid-js'
import { TextField, InputAdornment } from '@suid/material'

type NumberInputProps = {
    id: string
    value: number
    disabled?: boolean
    integer?: boolean
    step?: number
    min?: number
    max?: number
    label: string
    units?: string
} & ({
    onChange: (value: number) => void
} | {
    disabled: true 
    onChange?: (value: number) => void
})

const isNumeric = (text: string) => /^-?[0-9]*([.][0-9]*)?$/.test(text)
const isInteger = (text: string) => /^-?[0-9]*$/.test(text)
const isNegative = (text: string) => /^-/.test(text)

export const NumberInput: Component<NumberInputProps> = (props) => {
    const [value, setValue] = createSignal<string | undefined>(undefined)
    const [valid, setValid] = createSignal(true)

    const update = (input: string, value: number, isValid: boolean) => {

    }

    const onChange = (e: Event) => {
        const input = e.target as HTMLInputElement
        const newValue = input.value
        
        // ignore any invalid input characters or formats
        if (!isNumeric(newValue))
            return

        if (props.integer && !isInteger(newValue))
            return

        if (props.min !== undefined && props.min >= 0 && isNegative(newValue))
            return

        // parse and validate the input
        const newNumber = Number.parseFloat(newValue)

        const isNumber = newValue !== '' && !Number.isNaN(newNumber)
        const isInRange =
            (props.min === undefined || props.min <= newNumber) &&
            (props.max === undefined || props.max >= newNumber) &&
            (!props.integer || Number.isInteger(newNumber))
        const isValid = isNumber && isInRange

        batch(() => {
            setValue(newValue)
            setValid(isValid)
        })

        if (isValid && props.onChange)
            props.onChange(newNumber)
    }

    const onBlur = () => {
        setValue(undefined)
        setValid(true)
    }

    return <TextField id={props.id} size='small' error={!valid()} variant='outlined' sx={{ width: '12ch' }}
        value={props.disabled ? props.value : `${value() ?? props.value}`}
        disabled={props.disabled}
        label={props.label}
        inputProps={{ step: props.step, min: props.min, max: props.max }}
        onChange={e => onChange(e)}
        onBlur={_ => onBlur()}
        helperText={(!valid() && !isNaN(Number.parseFloat(value() ?? ''))) ? `${props.min ?? '-∞'} to ${props.max ?? '∞'}` : undefined}
        InputLabelProps={{ shrink: true }}
        InputProps={{ endAdornment: props.units ? <InputAdornment position='end'>{props.units}</InputAdornment> : undefined }} />
}
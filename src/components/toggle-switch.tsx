import { Switch, FormControlLabel } from '@suid/material'

interface ToggleSwitchProps {
    value: boolean,
    label: string
    onChange: (value: boolean) => void
}

export const ToggleSwitch = (props: ToggleSwitchProps) => <FormControlLabel label={props.label} control={<Switch checked={props.value} onChange={e => props.onChange(!e.target.checked)} />}/>
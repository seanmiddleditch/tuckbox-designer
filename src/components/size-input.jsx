import { TextField, InputAdornment } from '@suid/material'

export const SizeInput = (props) => 
    <TextField id={props.id} size='small' variant='outlined' sx={{width: '14ch'}}
        value={props.value}
        label={props.label}
        onChange={e => props.onChange(e.target.value)}
        InputProps={{
            endAdornment: () => props.units ? <InputAdornment position='end'>{props.units}</InputAdornment> : undefined,
        }}/>
import { Popover, Typography } from '@suid/material'
import { JSX, createSignal } from 'solid-js'
import { HelpRounded as HelpIcon } from '@suid/icons-material'

interface HelpButtonProps {
    children?: JSX.Element
}

export const HelpButton = (props: HelpButtonProps) => {
    const [anchorEl, setAnchorEl] = createSignal<HTMLElement|undefined>(undefined)

    const onEnter = (e: MouseEvent) => setAnchorEl(e.currentTarget as HTMLElement)
    const onClose = () => setAnchorEl(undefined)
    
    return <>
        <HelpIcon fontSize='small' style='display: inline-flex; vertical-align: top' color='info' onMouseEnter={onEnter} onMouseLeave={onClose}/>
        <Popover sx={{ pointerEvents: 'none' }} disableRestoreFocus
            open={!!anchorEl()}
            anchorEl={anchorEl()}
            onClose={onClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left', }}
            transformOrigin={{ vertical: 'top', horizontal: 'left', }}
        >
            <Typography sx={{ p: 1 }}>{props.children}</Typography>
        </Popover>
    </>
}
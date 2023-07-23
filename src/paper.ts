import { convert, Units } from './convert'

export type PaperFormats = 'letter' | 'a4'
export type Orientation = 'landscape' | 'portrait'

type Size = [number, number, Units]
type Def = { [key in PaperFormats]: Size }

const SIZE_IN_POINTS: Def = {
    'letter': [8.5, 11, 'in'],
    'a4': [210, 297, 'mm'],
}

export function paperSize({ format = 'letter', units = 'pt', orientation = 'portrait' }: { format: PaperFormats, units: Units, orientation: Orientation }) {
    if (!(format in SIZE_IN_POINTS)) throw `Unknown paper format: ${format}`
    if (orientation != 'portrait' && orientation != 'landscape') throw `Unknown orientation: ${orientation}`

    const portrait_size = SIZE_IN_POINTS[format]
    const size: Size = orientation == 'portrait' ? portrait_size : [portrait_size[1], portrait_size[0], portrait_size[2]]
    
    return [ convert(size[0], size[2], units), convert(size[1], size[2], units) ]
}
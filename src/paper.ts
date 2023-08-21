import { convert, Units } from './convert'

export type PaperFormats = 'letter' | 'legal' | 'ledger' | 'ansi_c' | 'ansi_d' | 'a4' | 'a2' | 'a3'
export type Orientation = 'landscape' | 'portrait'

type PaperMap = { [key in PaperFormats]: PaperSize }

const PAGE_DEFS: PaperSize[] = [
    { format: 'letter', width: 8.5, height: 11, units: 'in', name: 'US Letter' },
    { format: 'a4', width: 210, height: 297, units: 'mm', name: 'A4' },
    { format: 'a3', width: 297, height: 420, units: 'mm', name: 'A3' },
    { format: 'a2', width: 420, height: 594, units: 'mm', name: 'A2' },
    { format: 'legal', width: 8.5, height: 14, units: 'in', name: 'US Legal' },
    { format: 'ledger', width: 11, height: 17, units: 'in', name: 'US Ledger' },
    { format: 'ansi_c', width: 17, height: 22, units: 'in', name: 'ANSI C' },
    { format: 'ansi_d', width: 22, height: 34, units: 'in', name: 'ANSI D' },
]

export interface PaperSize {
    format: PaperFormats
    name: string
}

export interface PaperSize {
    format: PaperFormats
    name: string
    width: number
    height: number
    units: Units
}

interface PaperSizeOptions {
    format: PaperFormats
    orientation: Orientation
    units: Units
}

export const getPaperSizes = (): readonly PaperSize[] => PAGE_DEFS

export const getPaperSize = (format: PaperFormats): PaperSize => {
    for (const size of PAGE_DEFS.values())
        if (size.format == format)
            return size
    throw `Unknown paper format: ${format}`
}

export function paperSize({ format = 'letter', units = 'pt', orientation = 'portrait' }: PaperSizeOptions): PaperSize {
    if (orientation != 'portrait' && orientation != 'landscape') throw `Unknown orientation: ${orientation}`

    const portraitSize = getPaperSize(format)
    const size: PaperSize = orientation == 'portrait' ? portraitSize : { ...portraitSize, width: portraitSize.height, height: portraitSize.width }
    
    return {
        format: format,
        units: units,
        name: format,
        width: convert(size.width, size.units, units),
        height: convert(size.height, size.units, units)
    }
}
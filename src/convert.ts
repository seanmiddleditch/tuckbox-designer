export type Units = 'in' | 'cm' | 'mm' | 'pt' | 'px'

export const in2pt = (inch: number) => inch * 72.0
export const cm2pt = (cm: number) => in2pt(cm * 0.3937008)
export const mm2pt = (mm: number) => in2pt(mm * 0.03937008)

export const pt2in = (pt: number) => pt / 72.0
export const pt2cm = (pt: number) => pt2in(pt) / 0.3937008
export const pt2mm = (pt: number) => pt2in(pt) / 0.03937008

export function convert(value: number, from: Units, to: Units): number {
    if (from == to)
        return value
    
    const to_pt = {
        'in': (value: number) => in2pt(value),
        'cm': (value: number) => cm2pt(value),
        'mm': (value: number) => mm2pt(value),
        'pt': (value: number) => value,
        'px': (value: number) => value * 72.0 / 96.0,
    }

    const from_pt = {
        'in': (value: number) => pt2in(value),
        'cm': (value: number) => pt2cm(value),
        'mm': (value: number) => pt2mm(value),
        'pt': (value: number) => value,
        'px': (value: number) => value * 92.0 / 72.0,
    }

    if (!(from in to_pt))
        throw `Unknown from units: ${from}`
    if (!(to in to_pt))
        throw `Unknown to units: ${to}`
    
    return from_pt[to](to_pt[from](value))
}
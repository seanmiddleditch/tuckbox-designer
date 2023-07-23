export type Units = 'in' | 'cm' | 'mm' | 'pt' | 'dots'

export const in2pt = inch => inch * 72.0
export const cm2pt = cm => in2pt(cm * 0.3937008)
export const mm2pt = mm => in2pt(mm * 0.03937008)

export const pt2in = pt => pt / 72.0
export const pt2cm = pt => pt2in(pt) / 0.3937008
export const pt2mm = pt => pt2in(pt) / 0.03937008

export function convert(value: number, from: Units, to: Units): number {
    if (from == to)
        return value
    
    const to_pt = {
        'in': value => in2pt(value),
        'cm': value => cm2pt(value),
        'mm': value => mm2pt(value),
        'dots': value => value / 300.0 * 72.0,
        'pt': value => value
    }

    const from_pt = {
        'in': value => pt2in(value),
        'cm': value => pt2cm(value),
        'mm': value => pt2mm(value),
        'dots': value => value / 72.0 * 300.0,
        'pt': value => value
    }

    if (!(from in to_pt))
        throw `Unknown from units: ${from}`
    if (!(to in to_pt))
        throw `Unknown to units: ${to}`
    
    return from_pt[to](to_pt[from](value))
}
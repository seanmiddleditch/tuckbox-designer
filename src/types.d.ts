export as namespace types

export type BoxStyle = 'default' | 'double-tuck'

export interface RGB {
    r: number
    g: number
    b: number
}

export type FontFamily = 'Courier' | 'Helvetica' | 'Times-Roman'

export interface Font {
    family: FontFamily
    size: number
    weight: number
    color: RGB
    outlineColor: RGB
    outlineWidth: number
}

export interface Size {
    width: number
    height: number
    depth: number
}

export type Faces = 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right'

export interface CropData {
    x: number
    y: number
    width: number
    height: number
    rotate: number
    scaleX: number
    scaleY: number
}

export interface Face {
    label: string
    useLabel: boolean
    font: Font
    useImage: boolean
    cloneOpposite: boolean
    crop: CropData
    feather: number
    opacity: number
}

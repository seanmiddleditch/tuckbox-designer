export as namespace types;

export interface RGB {
    r: number
    g: number
    b: number
}

export interface Font {
    family: string
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
    text: string
    font: Font
    crop: CropData
}

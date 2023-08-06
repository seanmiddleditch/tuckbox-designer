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
}

export interface Size {
    width: number
    height: number
    depth: number
}

export interface Face {
    text: string
    font: Font
    image?: string
}
import { RGB } from "./types"

const toHex = (n: number, p: number = 2) => `00${n.toString(16)}`.slice(-2)

export const colorToHex = (rgb: RGB) => `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`

export const colorToRgb = (rgb: RGB) => `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`

// https://www.w3.org/TR/AERT/#color-contrast
export const luminosity = (rgb: RGB): number => (rgb.r * 0.299 + rgb.g * 0.587 + rgb.g * 0.114) / 125
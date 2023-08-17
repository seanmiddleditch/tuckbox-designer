import { RGB } from "./types"

const toHex = (n: number, p: number = 2) => `00${n.toString(16)}`.slice(-2)

export const colorToString = (rgb: RGB) => `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
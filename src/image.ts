import Cropper from 'cropperjs'
import { colorToRgb } from './color'
import { CropData, RGB } from './types'

type ImageSource = HTMLImageElement | HTMLCanvasElement

export const loadBlobToCanvas = async(blob: Blob): Promise<HTMLCanvasElement> => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    const promise = new Promise<HTMLCanvasElement>((resolve, reject) => {
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            if (!ctx) throw 'Failed to create canvas context'
            ctx.drawImage(img, 0, 0)
            resolve(canvas)
        }
        img.onerror = reject
    })
    .finally(() => URL.revokeObjectURL(url))
    img.src = url
    return promise
}

export const cropImage = async (image: ImageSource, size: { width: number, height: number }, crop: CropData): Promise<HTMLCanvasElement> => {
    document.body.appendChild(image)

    return new Promise<HTMLCanvasElement>(resolve => {
        let cropper: Cropper;

        const onReady = () => {
            const canvas = cropper.getCroppedCanvas({
                width: size.width,
                height: size.height,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high',
            })
            cropper.destroy()
            document.body.removeChild(image)
            resolve(canvas)
        }

        // the if-else is necessary because TypeScript isn't letting
        // us assign Image|Canvas to an overloaded constructor taking
        // either Image or Canvas
        if (image instanceof HTMLImageElement) {
            cropper = new Cropper(image, {
                data: crop,
                background: false,
                ready: onReady,
            })
        }
        else {
            cropper = new Cropper(image, {
                data: crop,
                background: false,
                ready: onReady,
            })
        }
    })
}

export const featherImage = (image: ImageSource, feather: number) => {
    if (feather <= 0)
        return image

    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw 'Failed to create canvas context'

    // feather edges
    ctx.shadowOffsetX = canvas.width
    ctx.shadowBlur = feather
    ctx.shadowColor = '#0f0'
    ctx.fillRect(-canvas.width + feather, feather, canvas.width - feather * 2, canvas.height - feather * 2)
    
    ctx.shadowBlur = 0
    ctx.globalCompositeOperation = 'source-in'
    ctx.drawImage(image, 0, 0)

    return canvas
}

export const renderToBackground = (image: ImageSource, color: RGB, opacity: number = 1.0) => {
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw 'Failed to create canvas context'

    // we fill in the background with our box color
    // due to https://github.com/parallax/jsPDF/issues/816
    ctx.fillStyle = colorToRgb(color)
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalAlpha = opacity

    ctx.drawImage(image, 0, 0)
    return canvas
}
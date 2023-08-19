import { Size, Font, RGB, Faces, BoxStyle } from './types'
import { luminosity } from './color'

export interface FaceOptions {
    text?: string
    font?: Font
    image?: HTMLCanvasElement
}

export interface GenerateOptions {
    size: Size
    color: RGB
    bleed: number
    thickness: number
    margin: number
    style: BoxStyle
    face: {
        front: FaceOptions
        back: FaceOptions
        top: FaceOptions
        bottom: FaceOptions
        left: FaceOptions
        right: FaceOptions
    }
}

export interface GetFaceDimensionsOptions {
    size: Size
    thickness: number
    bleed: number
}

export function getFaceDimensions(face: Faces, options: GetFaceDimensionsOptions): [number, number] {
    const width = options.size.width + options.thickness * 2 - options.bleed * 2
    const height = options.size.height + options.thickness * 2 - options.bleed * 2
    const depth = options.size.depth + options.thickness * 2 - options.bleed * 2

    switch (face) {
        case 'front':
        case 'back':
            return [width, height]
        case 'left':
        case 'right':
            return [height, depth]
        case 'top':
        case 'bottom':
            return [width, depth]
        default:
            return [0, 0]
    }
}

export function generate(ctx: CanvasRenderingContext2D, options: GenerateOptions) {
    // expand size to account for paper thickness
    const size = {
        width: options.size.width + options.thickness * 2,
        height: options.size.height + options.thickness * 2,
        depth: options.size.depth + options.thickness * 2
    }

    const offset = { x: size.depth + options.margin, y: size.depth + size.width * 0.2 + options.margin }
    const front = { x: offset.x, y: offset.y, width: size.width, height: size.height }
    const back = { x: front.x + front.width + size.depth, y: front.y, width: front.width, height: front.height }

    const lineWidth = 1
    const foldDash = [0.1 * 72.0, 0.05 * 72.0] // quarter inch and tenth of inch, at 72 DPI

    const setFont = (font: Font) => {
        ctx.font = `${Math.round(font.weight)} ${Math.round(font.size)}pt ${font.family}`
        ctx.fillStyle = `rgb(${font.color.r}, ${font.color.g}, ${font.color.b})`
        if (font.outlineWidth > 0) {
            ctx.strokeStyle = `rgb(${font.outlineColor.r}, ${font.outlineColor.g}, ${font.outlineColor.b})`
            ctx.lineWidth = font.outlineWidth
        }
        else {
            ctx.strokeStyle = `rgba(1, 1, 1, 0)`
            ctx.lineWidth = 1
        }
    }

    const bgLuminosity = luminosity(options.color)
    const cutColor = bgLuminosity < .7 ? '#fff' : '#000'
    const scoreColor = bgLuminosity < .7 ? '#eee' : '#111'

    const pathOutline = () => {
        // top
        ctx.moveTo(front.x, front.y - size.depth * 0.6)
        ctx.lineTo(front.x, front.y - size.depth)
        ctx.arc(front.x + front.width * 0.2, front.y - size.depth, front.width * 0.2, Math.PI, Math.PI * 1.5)
        ctx.arc(front.x + front.width - front.width * 0.2, front.y - size.depth, front.width * 0.2, Math.PI * 1.5, Math.PI * 2)
        ctx.lineTo(front.x + front.width, front.y - size.depth * 0.6)

        // left (top)
        ctx.arc(front.x + front.width + size.depth * 0.5, front.y - size.depth * 0.1, size.depth * 0.5, Math.PI * 1.5, Math.PI * 2)
        ctx.lineTo(back.x, back.y)
    
        // back (top)
        ctx.lineTo(back.x + back.width * 0.5 - back.width * 0.15, back.y)
        ctx.arc(back.x + back.width * 0.5, back.y, back.width * 0.15, Math.PI, 0, true)
        ctx.lineTo(back.x + back.width, back.y)
    
        // inner right
        ctx.lineTo(back.x + back.width + size.depth * 0.8, back.y)
        ctx.lineTo(back.x + back.width + size.depth * 0.8, back.y + back.height)
        ctx.lineTo(back.x + back.width, back.y + back.height)

        // back (bottom)
        if (options.style == 'double-tuck') {
            ctx.lineTo(back.x, back.y + back.height)
        }
        else {
            ctx.lineTo(back.x + back.width, back.y + back.height + size.depth * 0.8)
            ctx.lineTo(back.x, back.y + back.height + size.depth * 0.8)
        }

        // left (bottom)
        ctx.lineTo(back.x, back.y + back.height + size.depth * 0.6)
        ctx.lineTo(front.x + front.width, front.y + front.height + size.depth * 0.6)

        // inner bottom
        if (options.style == 'double-tuck') {
            //ctx.lineTo(front.x + front.width, front.y + front.height + size.depth)
            ctx.arc(front.x + front.width - front.width * 0.2, front.y + front.height + size.depth, front.width * 0.2, 0, Math.PI * 0.5)
            ctx.arc(front.x + front.width * 0.2, front.y + front.height + size.depth, front.width * 0.2, Math.PI * 0.5, Math.PI)
            //ctx.arc(front.x + front.width * 0.8, front.y + front.height + size.depth, front.width * 0.2, Math.PI, Math.PI * 1.5)
            ctx.lineTo(front.x, front.y + front.height + size.depth * 0.6)
        }
        else {
            ctx.lineTo(front.x + front.width, front.y + front.height + size.depth)
            ctx.lineTo(front.x, front.y + front.height + size.depth)
            ctx.lineTo(front.x, front.y + front.height + size.depth * 0.6)
        }
        
        // right
        ctx.lineTo(front.x - size.depth, front.y + front.height + size.depth * 0.6)
        ctx.lineTo(front.x - size.depth, front.y)
        ctx.arc(front.x - size.depth * 0.5, front.y - size.depth * 0.1, size.depth * 0.5, Math.PI, Math.PI * 1.5)
        ctx.lineTo(front.x, front.y - size.depth * 0.6)
    }

    const pathCuts = () => {
        ctx.moveTo(front.x, front.y - size.depth)
        ctx.lineTo(front.x + front.width * 0.1, front.y - size.depth)

        ctx.moveTo(front.x + front.width, front.y - size.depth)
        ctx.lineTo(front.x + front.width * 0.9, front.y - size.depth)

        ctx.moveTo(front.x, front.y)
        ctx.lineTo(front.x, front.y - size.depth * 0.6)

        ctx.moveTo(front.x + front.width, front.y)
        ctx.lineTo(front.x + front.width, front.y - size.depth * 0.6)

        ctx.moveTo(front.x, front.y + front.height)
        ctx.lineTo(front.x, front.y + front.height + size.depth * 0.6)

        if (options.style == 'double-tuck') {
            ctx.moveTo(front.x, front.y + front.height + size.depth)
            ctx.lineTo(front.x + front.width * 0.1, front.y + front.height + size.depth)

            ctx.moveTo(front.x + front.width * 0.9, front.y + front.height + size.depth)
            ctx.lineTo(front.x + front.width, front.y + front.height + size.depth)
        }

        ctx.moveTo(front.x + front.width, front.y + front.height)
        ctx.lineTo(front.x + front.width, front.y + front.height + size.depth * 0.6)

        ctx.moveTo(back.x, back.y + back.height + size.depth * 0.6)
        ctx.lineTo(back.x, back.y + back.height)
    }

    const pathScores = () => {
        // inner bottom
        ctx.moveTo(front.x, front.y + front.height)
        ctx.lineTo(front.x + front.width, front.y + front.height)

    
        // right
        ctx.moveTo(front.x - size.depth, front.y)
        ctx.lineTo(front.x, front.y)
        ctx.lineTo(front.x, front.y + front.height)
        ctx.lineTo(front.x - size.depth, front.y + front.height)
    
        // left
        ctx.moveTo(front.x + front.width, front.y)
        ctx.lineTo(front.x + front.width + size.depth, front.y)
        ctx.lineTo(front.x + front.width + size.depth, front.y + front.height)
        ctx.lineTo(front.x + front.width, front.y + front.height)
        ctx.lineTo(front.x + front.width, front.y)
    
        // back
        ctx.moveTo(back.x + back.width, back.y)
        ctx.lineTo(back.x + back.width, back.y + back.height)
        if (options.style != 'double-tuck')
            ctx.lineTo(back.x, back.y + back.height)
    
        // top
        ctx.moveTo(front.x, front.y)
        ctx.lineTo(front.x + front.width, front.y)
        ctx.moveTo(front.x + front.width * 0.1, front.y - size.depth)
        ctx.lineTo(front.x + front.width * 0.9, front.y - size.depth)

        if (options.style == 'double-tuck') {
            // bottom
            ctx.moveTo(front.x + front.width * 0.1, front.y + front.height + size.depth)
            ctx.lineTo(front.x + front.width * 0.9, front.y + front.height + size.depth)
        }
    }

    const wrapText = (text: string, w: number, lineHeight: number, cb: (t: string, y: number) => void) => {
        var words = text.split(/\s+/)
        var line = ''
        var first = true
        var yOffset = 0

        for (const word of words) {
            const attempt = line + word + ' '
            const m: any = ctx.measureText(attempt)
            
            if (m.width > w && !first) {
                cb(line, yOffset)

                line = word + ' '
                yOffset += lineHeight
            }
            else {
                line = attempt
            }

            first = false
        }

        if (line !== '')
            cb(line, yOffset)
    }

    const findLineHeight = () => {
        const m = ctx.measureText('M')
        if ('fontBoundingBoxAscent' in (m as object) && 'fontBoundingBoxDescent' in (m as object))
            return m.fontBoundingBoxAscent + m.fontBoundingBoxDescent
        else
            return m.width // hack
    }

    const drawLine = (x: number, y: number, text: string) => {
        ctx.strokeText(text, x, y)
        ctx.fillText(text, x, y)
    }

    const writeLine = (text: string, font: Font, x: number, y: number, w: number) => {
        ctx.save()
        setFont(font)
        wrapText(text, w, findLineHeight(), (line, yOffset) => drawLine(x, y + yOffset, line))
        ctx.restore()
    }

    const writeCenterAngle = (text: string, font: Font, x: number, y: number, r: number, w: number) => {
        ctx.save()
        setFont(font)
        ctx.translate(x, y)
        ctx.rotate(r)

        const [xs, textAlign] = ((): [number, CanvasTextAlign] => {
            switch (ctx.textAlign) {
                case 'center':
                    return [0.5, 'center']
                case 'right':
                case 'end':
                    return [1.0, 'right']
                default:
                    return [0.0, 'left']
            }
        })()

        const cb = (line: string, yOffset: number) => {
            const m: any = ctx.measureText(line)
            drawLine(-m.width * xs, yOffset, line)
        }

        const m = ctx.measureText(text)
        ctx.textAlign = 'left'
        wrapText(text, w, findLineHeight(), cb)
        ctx.textAlign = textAlign

        ctx.restore()
    }

    const drawText = () => {
        // front
        if (options.face.front.text && options.face.front.font)
            writeLine(options.face.front.text, options.face.front.font, front.x + front.width * 0.5, front.y + front.height * 0.25, front.width * 0.9)

        // back
        if (options.face.back.text && options.face.back.font)
            writeLine(options.face.back.text, options.face.back.font, back.x + back.width * 0.5, back.y + back.height * 0.25, back.width * 0.9)

        // top
        if (options.face.top.text && options.face.top.font)
            writeCenterAngle(options.face.top.text, options.face.top.font, front.x + front.width * 0.5, front.y - size.depth * 0.5, Math.PI, back.width * 0.9)

        // bottom
        if (options.face.bottom.text && options.face.bottom.font)
            writeLine(options.face.bottom.text, options.face.bottom.font, front.x + front.width * 0.5, front.y  + front.height + size.depth * 0.5, front.width * 0.9)

        // left
        if (options.face.left.text && options.face.left.font)
            writeCenterAngle(options.face.left.text, options.face.left.font, front.x - size.depth * 0.5, front.y + front.height * 0.5, Math.PI * 0.5, front.height * 0.9)

        // right
        if (options.face.right.text && options.face.right.font)
            writeCenterAngle(options.face.right.text, options.face.right.font, front.x + front.width + size.depth * 0.5, front.y + front.height * 0.5, Math.PI * 1.5, front.height * 0.9)
    }

    const drawImage = (tx: number, ty: number, tw: number, th: number, image: HTMLCanvasElement, r: number = 0) => {
        const b = options.bleed

        ctx.save()
        ctx.translate(tx, ty)
        ctx.rotate(r)

        // adjust for bleed, which is relative to the rotated offset (must be after rotate)
        ctx.translate(b, b)
       
        // image is drawn within the bleed area of the requested rect
        ctx.drawImage(image, 0, 0, tw - b * 2, th - b * 2)
        ctx.restore()
    }

    // box color (overlap to handle bleed)
    ctx.save()
    if (options.color.r !== 1 || options.color.g !== 1 || options.color.b !== 1) {
        ctx.setLineDash([])
        ctx.fillStyle = `rgb(${options.color.r}, ${options.color.g}, ${options.color.b})`
        ctx.strokeStyle = `rgb(${options.color.r}, ${options.color.g}, ${options.color.b})`
        ctx.lineWidth = options.bleed * 2

        ctx.beginPath()

        pathOutline()
        ctx.stroke()
        ctx.fill()
    }
    ctx.restore()

    // stroke & fill outline
    ctx.save()
    {
        ctx.beginPath()

        pathOutline()

        ctx.setLineDash([])
        ctx.lineWidth = lineWidth
        ctx.strokeStyle = cutColor

        ctx.stroke()
    }
    ctx.restore()

    // stroke inner cut lines
    ctx.save()
    {
        ctx.beginPath()

        pathCuts()

        ctx.setLineDash([])
        ctx.lineWidth = lineWidth
        ctx.strokeStyle = cutColor

        ctx.stroke()
    }
    ctx.restore()

    // stroke fold lines
    ctx.save()
    {
        ctx.beginPath()

        pathScores()

        ctx.setLineDash(foldDash)
        ctx.lineWidth = lineWidth
        ctx.strokeStyle = scoreColor

        ctx.stroke()
    }
    ctx.restore()

    // images
    ctx.save()
    {
        // clip within outline
        ctx.beginPath()
        pathOutline()
        ctx.clip()

        if (options.face.front.image)
            drawImage(front.x, front.y, front.width, front.height, options.face.front.image)

        if (options.face.back.image)
            drawImage(back.x, back.y, back.width, back.height, options.face.back.image)

        if (options.face.top.image)
            drawImage(front.x + front.width, front.y, front.width, size.depth, options.face.top.image, Math.PI)

        if (options.face.bottom.image)
            drawImage(front.x, front.y + front.height, front.width, size.depth, options.face.bottom.image)

        if (options.face.left.image)
            drawImage(front.x, front.y, front.height, size.depth, options.face.left.image, Math.PI * 0.5)
        
        if (options.face.right.image)
            drawImage(back.x - size.depth, back.y + back.height, back.height, size.depth, options.face.right.image, Math.PI * 1.5)
    }
    ctx.restore()

    // text labels
    ctx.save()
    {
        ctx.beginPath()
        ctx.fillStyle = '#000000'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        drawText()
    }
    ctx.restore()

    // ctx.strokeStyle = '#ff0000'
    // ctx.strokeRect(front.x + options.bleed, front.y + options.bleed, front.width - options.bleed * 2, front.height - options.bleed * 2)

    // ctx.strokeStyle = '#00ff00'
    // ctx.strokeRect(front.x + options.thickness, front.y + options.thickness, options.size.width, options.size.height)
}
import { mm2pt, convert } from './convert'
import { Size, Font } from './types'

export interface FaceOptions {
    text?: string,
    font?: Font,
    image?: HTMLImageElement,
}

export interface GenerateOptions {
    size: Size,
    color: string,
    face: {
        front: FaceOptions,
        back: FaceOptions,
        top: FaceOptions,
        bottom: FaceOptions,
        left: FaceOptions,
        right: FaceOptions,
    }
}

const defaultText = 'Sample'
const defaultFont: Font = {
    family: 'Times-Roman',
    size: 14,
    weight: 700
}

export function generate(ctx: CanvasRenderingContext2D, options: GenerateOptions) {
    // expand size to account for paper thickness
    const thickness = mm2pt(0.4)
    const bleed = mm2pt(3)
    const size = {
        width: options.size.width + thickness,
        height: options.size.height + thickness,
        depth: options.size.depth + thickness
    }

    const offset = size.depth + Math.max(size.depth, size.width * 0.3)
    const back = { x: offset, y: offset, width: size.width, height: size.height }
    const front = { x: back.x + back.width + size.depth, y: back.y, width: size.width, height: size.height }

    const lineWidth = 1
    const foldDash = [0.1 * 72.0, 0.05 * 72.0] // quarter inch and tenth of inch, at 72 DPI

    const setFont = (font: Font) => {
        ctx.font = `${Math.round(font.weight)} ${Math.round(font.size)}pt ${font.family}`
    }

    const pathOutline = () => {
        // top
        ctx.moveTo(back.x, back.y - size.depth * 0.6)
        ctx.lineTo(back.x, back.y - size.depth)
        ctx.arc(back.x + size.width * 0.2, back.y - size.depth, size.width * 0.2, Math.PI, Math.PI * 1.5)
        ctx.arc(back.x + size.width - size.width * 0.2, back.y - size.depth, size.width * 0.2, Math.PI * 1.5, Math.PI * 2)
        ctx.lineTo(back.x + size.width, back.y - size.depth * 0.6)

        // left (top)
        ctx.arc(back.x + back.width + size.depth * 0.5, back.y - size.depth * 0.1, size.depth * 0.5, Math.PI * 1.5, Math.PI * 2)
        ctx.lineTo(front.x, front.y)
    
        // front (top)
        ctx.lineTo(front.x + front.width * 0.5 - front.width * 0.15, front.y)
        ctx.arc(front.x + front.width * 0.5, front.y, front.width * 0.15, Math.PI, 0, true)
        ctx.lineTo(front.x + front.width, front.y)
    
        // inner right
        ctx.lineTo(front.x + front.width + size.depth * 0.8, front.y)
        ctx.lineTo(front.x + front.width + size.depth * 0.8, front.y + size.height)
        ctx.lineTo(front.x + front.width, front.y + size.height)

        // front (bottom)
        ctx.lineTo(front.x + front.width, front.y + front.height + size.depth * 0.8)
        ctx.lineTo(front.x, front.y + front.height + size.depth * 0.8)

        // left (bottom)
        ctx.lineTo(front.x, front.y + front.height + size.depth * 0.6)
        ctx.lineTo(back.x + back.width, back.y + size.height + size.depth * 0.6)

        // inner bottom
        ctx.lineTo(back.x + back.width, back.y + back.height + size.depth)
        ctx.lineTo(back.x, back.y + back.height + size.depth)
        ctx.lineTo(back.x, back.y + back.height + size.depth * 0.6)
        
        // right
        ctx.lineTo(back.x - size.depth, back.y + back.height + size.depth * 0.6)
        ctx.lineTo(back.x - size.depth, back.y)
        ctx.arc(back.x - size.depth * 0.5, back.y - size.depth * 0.1, size.depth * 0.5, Math.PI, Math.PI * 1.5)
        ctx.lineTo(back.x, back.y - size.depth * 0.6)
    }

    const pathCuts = () => {
        ctx.moveTo(back.x, back.y - size.depth)
        ctx.lineTo(back.x + back.width * 0.1, back.y - size.depth)

        ctx.moveTo(back.x + back.width, back.y - size.depth)
        ctx.lineTo(back.x + back.width * 0.9, back.y - size.depth)

        ctx.moveTo(back.x, back.y)
        ctx.lineTo(back.x, back.y - size.depth * 0.6)

        ctx.moveTo(back.x + back.width, back.y)
        ctx.lineTo(back.x + back.width, back.y - size.depth * 0.6)

        ctx.moveTo(back.x, back.y + back.height)
        ctx.lineTo(back.x, back.y + back.height + size.depth * 0.6)

        ctx.moveTo(back.x + back.width, back.y + back.height)
        ctx.lineTo(back.x + back.width, back.y + back.height + size.depth * 0.6)

        ctx.moveTo(front.x, front.y + front.height + size.depth * 0.6)
        ctx.lineTo(front.x, front.y + front.height)
    }

    const pathFolds = () => {
        // inner bottom
        ctx.moveTo(back.x, back.y + back.height)
        ctx.lineTo(back.x + back.width, back.y + back.height)
    
        // right
        ctx.moveTo(back.x - size.depth, back.y)
        ctx.lineTo(back.x, back.y)
        ctx.lineTo(back.x, back.y + size.height)
        ctx.lineTo(back.x - size.depth, back.y + size.height)
    
        // left
        ctx.moveTo(back.x + back.width, back.y)
        ctx.lineTo(back.x + back.width + size.depth, back.y)
        ctx.lineTo(back.x + back.width + size.depth, back.y + size.height)
        ctx.lineTo(back.x + back.width, back.y + size.height)
        ctx.lineTo(back.x + back.width, back.y)
    
        // front
        ctx.moveTo(front.x + front.width, front.y)
        ctx.lineTo(front.x + front.width, front.y + front.height)
        ctx.lineTo(front.x, front.y + front.height)
    
        // top
        ctx.moveTo(back.x, back.y)
        ctx.lineTo(back.x + size.width, back.y)
        ctx.moveTo(back.x + size.width * 0.1, back.y - size.depth)
        ctx.lineTo(back.x + size.width * 0.9, back.y - size.depth)
    }

    const wrapText = (text: string, w: number, lineHeight: number, cb: (t: string, y: number) => void) => {
        var words = text.split(/\s+/)
        var line = ''
        var first = true
        var yOffset = 0
        var lastWidth = 0

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

    const writeLine = (text: string, font: Font, x: number, y: number, w: number) => {
        ctx.save()
        setFont(font)
        wrapText(text, w, 20, (line, yOffset) => ctx.fillText(line, x, y + yOffset, w))
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
            ctx.fillText(line, -m.width * xs, yOffset)
        }

        const m = ctx.measureText(text)
        ctx.textAlign = 'left'
        wrapText(text, w, 20, cb)
        //ctx.fillText(text, -Math.min(m.width, w) * xs, 0, w)
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
            writeLine(options.face.top.text, options.face.top.font, back.x + back.width * 0.5, back.y - size.depth * 0.5, back.width * 0.9)

        // bottom
        if (options.face.bottom.text && options.face.bottom.font)
            writeCenterAngle(options.face.bottom.text, options.face.bottom.font, back.x + back.width * 0.5, back.y + back.height + size.depth * 0.5, Math.PI, front.width * 0.9)

        // left
        if (options.face.left.text && options.face.left.font)
            writeCenterAngle(options.face.left.text, options.face.left.font, back.x - size.depth * 0.5, back.y + back.height * 0.5, Math.PI * 1.5, back.height * 0.9)

        // right
        if (options.face.right.text && options.face.right.font)
            writeCenterAngle(options.face.right.text, options.face.right.font, back.x + back.width + size.depth * 0.5, back.y + back.height * 0.5, Math.PI * 0.5, back.height * 0.9)
    }

    const drawImage = (tx: number, ty: number, tw: number, th: number, image: HTMLImageElement) => {
        let w = image.width, h = image.height
        if (w > h) {
            const ar = image.height / image.width
            w = size.width
            h = w * ar
        }
        else {
            const ar = image.width / image.height
            h = size.height
            w = h * ar
        }

        w = Math.min(convert(w, 'px', 'pt'), tw)
        h = Math.min(convert(h, 'px', 'pt'), th)
        
        ctx.drawImage(image, tx + (tw - w) * 0.5, ty + (th - h) * 0.5, w, h)
    }

    // background color (overlap to handle bleed)
    ctx.save()
    if (options.color && options.color != '#ffffff00') {
        ctx.setLineDash([])
        ctx.fillStyle = options.color

        ctx.fillRect(back.x - size.depth - bleed,
            back.y - size.depth * 1.5 - bleed,
            back.width + front.width + options.size.depth * 2.9 + bleed * 2,
            back.height + size.depth * 2.5 + bleed * 2)

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
        ctx.strokeStyle = '#000000'

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
        ctx.strokeStyle = '#000000'

        ctx.stroke()
    }
    ctx.restore()

    // stroke fold lines
    ctx.save()
    {
        ctx.beginPath()

        pathFolds()

        ctx.setLineDash(foldDash)
        ctx.lineWidth = lineWidth
        ctx.strokeStyle = '#000000'

        ctx.stroke()
    }
    ctx.restore()

    // images
    ctx.save()
    {
        if (options.face.front.image)
            drawImage(front.x, front.y, front.width, front.height, options.face.front.image)

        if (options.face.back.image)
            drawImage(back.x, back.y, back.width, back.height, options.face.back.image)

        if (options.face.top.image)
            drawImage(front.x, front.y - size.depth, front.width, size.depth, options.face.top.image)

        if (options.face.bottom.image)
            drawImage(front.x, front.y + front.height, front.width, size.depth, options.face.bottom.image)

        if (options.face.left.image)
            drawImage(front.x - size.depth, front.y, size.depth, front.height, options.face.left.image)

        if (options.face.right.image)
            drawImage(back.x - size.depth, back.y, size.depth, back.height, options.face.right.image)
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
}
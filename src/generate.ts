import { mm2pt } from './convert'

interface DeckSize {
    width: number,
    height: number,
    depth: number
}

export function generate(ctx: CanvasRenderingContext2D, deck: DeckSize, title: string, bgColor: string, font: string) {
    // expand size to account for paper thickness
    const thickness = mm2pt(0.4)
    const bleed = mm2pt(3)
    const size = {
        width: deck.width + thickness,
        height: deck.height + thickness,
        depth: deck.depth + thickness
    }

    const offset = size.depth + Math.max(size.depth, size.width * 0.3)
    const back = { x: offset, y: offset, width: size.width, height: size.height }
    const front = { x: back.x + back.width + size.depth, y: back.y, width: size.width, height: size.height }

    const lineWidth = 1
    const foldDash = [0.1 * 72.0, 0.05 * 72.0] // quarter inch and tenth of inch, at 72 DPI

    const pathOutline = () => {
        // top
        ctx.moveTo(back.x, back.y - size.depth * 0.6)
        ctx.lineTo(back.x, back.y - size.depth)
        ctx.arc(back.x + size.width * 0.2, back.y - size.depth, size.width * 0.2, Math.PI, Math.PI * 1.5)
        ctx.arc(back.x + size.width - size.width * 0.2, back.y - size.depth, size.width * 0.2, Math.PI * 1.5, Math.PI * 2)
        ctx.lineTo(back.x + size.width, back.y - size.depth * 0.6)

        // side B (top)
        ctx.arc(back.x + back.width + size.depth * 0.5, back.y - size.depth * 0.1, size.depth * 0.5, Math.PI * 1.5, Math.PI * 2)
        ctx.lineTo(front.x, front.y)
    
        // front (top)
        ctx.lineTo(front.x + front.width * 0.5 - front.width * 0.15, front.y)
        ctx.arc(front.x + front.width * 0.5, front.y, front.width * 0.15, Math.PI, 0, true)
        ctx.lineTo(front.x + front.width, front.y)
    
        // inner side
        ctx.lineTo(front.x + front.width + size.depth * 0.8, front.y)
        ctx.lineTo(front.x + front.width + size.depth * 0.8, front.y + size.height)
        ctx.lineTo(front.x + front.width, front.y + size.height)

        // front (bottom)
        ctx.lineTo(front.x + front.width, front.y + front.height + size.depth * 0.8)
        ctx.lineTo(front.x, front.y + front.height + size.depth * 0.8)

        // side B (bottom)
        ctx.lineTo(front.x, front.y + front.height + size.depth * 0.6)
        ctx.lineTo(back.x + back.width, back.y + size.height + size.depth * 0.6)

        // inner bottom
        ctx.lineTo(back.x + back.width, back.y + back.height + size.depth)
        ctx.lineTo(back.x, back.y + back.height + size.depth)
        ctx.lineTo(back.x, back.y + back.height + size.depth * 0.6)
        
        // side A
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
    
        // side A
        ctx.moveTo(back.x - size.depth, back.y)
        ctx.lineTo(back.x, back.y)
        ctx.lineTo(back.x, back.y + size.height)
        ctx.lineTo(back.x - size.depth, back.y + size.height)
    
        // side B
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

    const wrapText = (text, w, lineHeight, cb) => {
        var words = text.split(/\s+/)
        var line = ''
        var first = true
        var yOffset = 0
        var lastWidth = 0

        for (const word of words) {
            const attempt = line + word + ' '
            const m = ctx.measureText(attempt)
            
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

    const writeLine = (text, x, y, w) => {
        wrapText(text, w, 20, (line, yOffset) => ctx.fillText(line, x, y + yOffset, w))
    }

    const writeCenterAngle = (text, x, y, r, w) => {
        ctx.save()
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

        const cb = (line, yOffset) => {
            const m = ctx.measureText(line)
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
        writeLine(title, front.x + front.width * 0.5, front.y + front.height * 0.25, front.width * 0.9)

        // back
        writeLine(title, back.x + back.width * 0.5, back.y + back.height * 0.25, back.width * 0.9)

        // top
        writeLine(title, back.x + back.width * 0.5, back.y - size.depth * 0.5, back.width * 0.9)

        // bottom
        writeCenterAngle(title, back.x + back.width * 0.5, back.y + back.height + size.depth * 0.5, Math.PI, front.width * 0.9)

        // side A
        writeCenterAngle(title, back.x - size.depth * 0.5, back.y + back.height * 0.5, Math.PI * 1.5, back.height * 0.9)

        // side B
        writeCenterAngle(title, back.x + back.width + size.depth * 0.5, back.y + back.height * 0.5, Math.PI * 0.5, back.height * 0.9)
    }

    // background color (overlap to handle bleed)
    ctx.save()
    if (bgColor && bgColor != '#ffffff00') {
        ctx.setLineDash([])
        ctx.fillStyle = bgColor

        ctx.fillRect(back.x - size.depth - bleed,
            back.y - size.depth * 1.5 - bleed,
            back.width + front.width + deck.depth * 2.9 + bleed * 2,
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

    // text labels
    ctx.save()
    {
        ctx.beginPath()

        ctx.font = font
        ctx.fillStyle = '#000000'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        drawText()
    }
    ctx.restore()
}
import { Context2d, Matrix, Rectangle } from 'jspdf'

export default function(ctx: Context2d): CanvasRenderingContext2D {
    const fillText = ctx.fillText.bind(ctx)
    const strokeText = ctx.strokeText.bind(ctx)
    const drawImage = ctx.drawImage.bind(ctx)

    // https://github.com/parallax/jsPDF/issues/2733
    // https://github.com/parallax/jsPDF/issues/3225
    const text = (func: (t: string, x: number, y: number, w?: number) => void, text: string, x: number, y: number, w?: number) => {
        // scalars to correct jsPDF failing to convert from canvas pixel units to pdf points
        const scale = 96.0 / 72.0
        const invScale = 1.0 / scale
        
        // x-asis adjustment scalar to apply for text alignment because jsPDF only applies
        // alignment after transforming the text bounding box
        const align = ctx.textAlign
        const xs = (align == 'center' ? 0.5 :
            align == 'right' || align == 'end' ? 1.0 : 0.0)

        // save state so subsequent drawing operations aren't affected
        ctx.save()
        try {
            ctx.scale(scale, 1)
            ctx.textAlign = 'left'

            const m: any = ctx.measureText(text)
            func(text, (x - m.width * xs) * invScale, y, w !== undefined ? w * invScale : undefined)
        }
        finally {
            ctx.restore()
        }
    }
    ctx.fillText = text.bind(null, fillText)
    ctx.strokeText = text.bind(null, strokeText)

    ctx.drawImage = function (img, x, y, w, h) {
        const self = this as any

        const matrix = self.ctx.transform as Matrix
        const { rotate } = matrix.decompose()
        const rad = Math.atan2(-rotate.shx, rotate.sx)
        const deg = Math.round(rad * 180 / Math.PI)

        const ul = matrix.applyToPoint({ x, y })

        self.pdf.addImage(
            img,
            "JPEG",
            ul.x - Math.sin(rad) * h,
            ul.y + (Math.abs(deg) == 90 ? -h : Math.abs(deg) == 180 ? -(h * 2) : 0),
            w,
            h,
            null,
            null,
            -deg
          );
    }

    return (ctx as unknown) as CanvasRenderingContext2D
}
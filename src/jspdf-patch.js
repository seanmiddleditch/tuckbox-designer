export default function(ctx) {
    const fillText = ctx.fillText.bind(ctx)

    // https://github.com/parallax/jsPDF/issues/2733
    // https://github.com/parallax/jsPDF/issues/3225
    ctx.fillText = function (text, x, y, w) {
        // scalars to correct jsPDF failing to convert from canvas pixel units to pdf points
        const scale = 96.0 / 72.0
        const invScale = 1.0 / scale
        
        // x-asis adjustment scalar to apply for text alignment because jsPDF only applies
        // alignment after transforming the text bounding box
        const align = this.textAlign
        const xs = (align == 'middle' || align == 'center' ? 0.5 :
            align == 'right' || align == 'end' ? 1.0 : 0.0)

        // save state so subsequent drawing operations aren't affected
        this.save()
        try {
            this.scale(scale, 1)
            this.textAlign = 'left'

            const m = this.measureText(text)
            fillText(text, (x - m.width * xs) * invScale, y, w * invScale)
        }
        finally {
            this.restore()
        }
    }

    return ctx
}
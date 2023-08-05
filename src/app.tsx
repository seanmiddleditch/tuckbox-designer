import { createEffect, createSignal, Switch, Match } from 'solid-js'
import { paperSize } from './paper'
import { convert } from './convert'
import { generate } from './generate'
import { createLocalStore } from './local'
import PDFDocument from 'jspdf'
import { Button } from './components/button'
import { HStack, VStack } from './components/stack'
import { Select } from './components/select'
import { Toggle } from './components/toggle'
import { ColorPicker } from './components/color-picker'
import { SizeInput } from './components/size-input'
import { TextInput } from './components/text-input'
import { ImageSelect } from './components/image-select'
import { Download as DownloadIcon } from '@suid/icons-material'
import patchJsPdf from './jspdf-patch'

import '@suid/material'

const defualtConfig = {
    units: 'in',
    page: 'letter',
    title: 'Sample',
    color: '#ffffff00',
    font: {
        family: 'Times-Roman',
        size: 18,
        weight: 700,
    },
    image: {
        front: ''
    },
    size: {
        width: 2.25,
        height: 3.5,
        depth: 1.0
    },
}

export const App = () => {
    const [config, setConfig] = createLocalStore('tuckbox-config', defualtConfig)
    const [preview, setPreview] = createSignal('canvas')

    const imageFront = (() => {
        const [getter, setImage] = createSignal<HTMLImageElement|null>(null)
            
        createEffect(() => {
            if (config.image.front != '') {
                const img = new Image()
                img.onload = () => {
                    setImage(img)
                }
                img.src = config.image.front
            }
            else {
                setImage(null!)
            }
        })

        return getter
    })()

    let pageDetailsRef: HTMLDivElement|undefined = undefined
    let canvasRef: HTMLCanvasElement|undefined = undefined
    let pdfLinkRef: HTMLAnchorElement|undefined = undefined
    let data_url: string = ''
    let previewFrameRef: HTMLIFrameElement|undefined = undefined

    const fontName = () => `${config.font.weight} ${config.font.size}pt ${config.font.family}`

    const resetConfig = () => {
        if (confirm('Reset all configuration?')) {
            localStorage.clear()
            setConfig(defualtConfig)
        }
    }

    createEffect(() => {
        if (preview() != 'canvas')
            return
        
        // page dimensions
        const pageSize = paperSize({ 'format': config.page, 'units': config.units, 'orientation': 'landscape' })

        pageDetailsRef!.textContent = `${config.page} ${pageSize[0]}x${pageSize[1]}${config.units}`

        const canvas = canvasRef!
        canvas.width = convert(pageSize[0], config.units, 'pt')
        canvas.height = convert(pageSize[1], config.units, 'pt')

        const size = {
            width: convert(config.size.width, config.units, 'pt'),
            height: convert(config.size.height, config.units, 'pt'),
            depth: convert(config.size.depth, config.units, 'pt')
        }

        const ctx = canvas.getContext("2d")!
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        generate(ctx, size, config.title, config.color, fontName())

        const front = imageFront()
        if (front) {
            let w = front.width, h = front.height
            if (w > h) {
                const ar = front.height / front.width
                w = size.width
                h = w * ar
            }
            else {
                const ar = front.width / front.height
                h = size.height
                w = h * ar
            }

            w = convert(w, 'px', 'pt')
            h = convert(h, 'px', 'pt')
                
            ctx.drawImage(front, size.depth * 2 + size.width * 0.5 - w * 0.5, size.depth * 2 + size.height * 0.5 - h * 0.5, w, h)
        }
    })

    const generatePdfBlob = () => {
        const size = {
            width: convert(config.size.width, config.units, 'pt'),
            height: convert(config.size.height, config.units, 'pt'),
            depth: convert(config.size.depth, config.units, 'pt')
        }

        const doc = new PDFDocument({
            orientation: 'landscape',
            unit: 'pt',
            format: config.page
        })

        const ctx = patchJsPdf(doc.canvas.getContext("2d"))
        
        generate(ctx, size, config.title, config.color, fontName())

        const bytes = doc.output('blob')
        const blob = new Blob([bytes], { type: 'application/pdf' })
        return blob
    }

    const makeDataUrl = (blob: Blob) => {
        if (data_url) {
            URL.revokeObjectURL(data_url)
            data_url = ''
        }

        data_url = URL.createObjectURL(blob)
        return data_url
    }

    createEffect(() => {
        if (preview() != 'pdf')
            return
        
        const blob = generatePdfBlob()
        const url = makeDataUrl(blob)

        previewFrameRef!.src = url
    })

    const savePdf = () => {
        const blob = generatePdfBlob()
        const url = makeDataUrl(blob)

        pdfLinkRef!.href = url
        pdfLinkRef!.download = 'tuckbox.pdf'
        pdfLinkRef!.click()
    }

    const openPdf = () => {
        const blob = generatePdfBlob()
        const url = makeDataUrl(blob)

        window.open(url, 'pdf')
    }

    return <HStack spacing={8} width='100%' height='100%'>
        <VStack>
            <h2>Page & Print</h2>
            <HStack>
                <Select id='page-size' label='Page Format' value={config.page} onChange={value => setConfig('page', value)}>
                    <Select.Item value='letter'>US Letter</Select.Item>
                    <Select.Item value='a4'>A4</Select.Item>
                </Select>
                <Select id='page-size' label='Units' value={config.units} onChange={value => setConfig('units', value)}>
                    <Select.Item value='cm'>centimeters</Select.Item>
                    <Select.Item value='mm'>millimeters</Select.Item>
                    <Select.Item value='in'>inches</Select.Item>
                    <Select.Item value='pt'>points</Select.Item>
                </Select>
            </HStack>
            <h2>Deck Size</h2>
            <VStack alignItems='flex-start'>
                <HStack>
                    <SizeInput id="width" value={config.size.width} units={config.units} onChange={value => setConfig('size', 'width', value)} label='Width' />
                    <SizeInput id="height" value={config.size.height} units={config.units} onChange={value => setConfig('size', 'height', value)} label='Height' />
                    <SizeInput id="depth" value={config.size.depth} units={config.units} onChange={value => setConfig('size', 'depth', value)} label='Depth' />
                </HStack>
            </VStack>
            <h2>Design</h2>
            <VStack alignItems='flex-start'>
                <ColorPicker label='Box Color' color={config.color} onChange={value => setConfig('color', value)}/>
            </VStack>
            <ImageSelect label='Front Image' imageWidth={convert(config.size.width, config.units, 'px')} imageHeight={convert(config.size.height, config.units, 'px')} onChange={image => setConfig('image', 'front', image.toDataURL())}/>
            <h2>Title & Font</h2>
            <VStack alignItems='flex-start'>
                <TextInput id='title' label='Deck Title' sx={{ width: '100%' }} value={config.title} onChange={value => setConfig('title', value)} />
                <HStack>
                    <Select id='font-family' label='Font Family' width='14em' value={config.font.family} onChange={value => setConfig('font', 'family', value)}>
                        <Select.Item value='Courier'>Courier</Select.Item>
                        <Select.Item value='Helvetica'>Helvetica</Select.Item>
                        <Select.Item value='Times-Roman'>Times Roman</Select.Item>
                    </Select>
                    <SizeInput id='font-size' label='Font Size' units='pt' value={config.font.size} onChange={value => setConfig('font', 'size', value)} />
                    <TextInput id='font-weight' label='Font Weight' sx={{ width: '14ch' }} value={config.font.weight} onChange={(value: string) => setConfig('font', 'weight', value)} />
                </HStack>
            </VStack>
            <h2>Download</h2>
            <VStack>
                <Button.Group>
                    <Button onClick={() => openPdf()} variant='contained'>Open PDF</Button>
                    <Button onClick={() => savePdf()} variant='contained'><DownloadIcon/></Button>
                </Button.Group>
                <Button.Group>
                    <Button variant='outlined' color='error' onClick={resetConfig}>Reset</Button>
                </Button.Group>
            </VStack>
            <a class="hidden" ref={pdfLinkRef} style={{ display: 'none' }}></a>
        </VStack>
        <VStack width='100%' alignItems='flex-start'>
            <HStack alignItems='baseline'>
                <h2>Preview</h2>
                <Toggle.Group exclusive style={{ height: '2.5em', 'vertical-align': 'end' }} value={preview()} onChange={value => setPreview(value)}>
                    <Toggle.Button value='canvas'>Canvas</Toggle.Button>
                    <Toggle.Button value='pdf'>PDF</Toggle.Button>
                </Toggle.Group>
            </HStack>
            <Switch fallback={<>
                <canvas width="800" height="600" ref={canvasRef} style={{ border: '1px solid grey' }}></canvas>
            </>}>
                <Match when={preview() == 'pdf'}>
                    <iframe width="800" height="600" ref={previewFrameRef} style={{ border: 'none', width: '100%' }}></iframe>
                </Match>
            </Switch>
            <div ref={pageDetailsRef}></div>
        </VStack>
    </HStack>
}
import { createEffect, Switch, Match, Show, onCleanup } from 'solid-js'
import { SetStoreFunction, StoreSetter, createStore } from 'solid-js/store'
import { paperSize, PaperFormats } from './paper'
import { convert, Units } from './convert'
import { generate } from './generate'
import { createLocalStore } from './local'
import PDFDocument from 'jspdf'
import { Button } from './components/button'
import { HStack, VStack } from './components/stack'
import { Select } from './components/select'
import { ToggleButton } from './components/toggle-button'
import { ColorPicker } from './components/color-picker'
import { NumberInput } from './components/number-input'
import { TextInput } from './components/text-input'
import { ImageSelect } from './components/image-select'
import { Download as DownloadIcon } from '@suid/icons-material'
import { Font, Size, Face, RGB } from './types'
import patchJsPdf from './jspdf-patch'

import '@suid/material'
import { ToggleSwitch } from './components/toggle-switch'

type Faces = 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right'

interface Config {
    units: Units
    page: PaperFormats
    title: string
    color: RGB
    view: {
        preview: 'canvas' | 'pdf',
        face: Faces
    }
    face: {
        front: Face
        back: Face & { sameAsFront: boolean }
        top: Face
        bottom: Face & { sameAsTop: boolean }
        left: Face
        right: Face & { sameAsLeft: boolean }
    }
    size: Size
    bleed: number
    margin: number
    thickness: number
}

interface FaceImageCache {
    front?: HTMLImageElement
    back?: HTMLImageElement
    top?: HTMLImageElement
    bottom?: HTMLImageElement
    left?: HTMLImageElement
    right?: HTMLImageElement
}

const defaultFont: Font = {
    family: 'Times-Roman',
    size: 18,
    weight: 700,
    color: { r: 0, g: 0, b: 0 },
    outlineColor: { r: 255, g: 255, b: 255 },
    outlineWidth: 0,
}

const defaultFace: Face = {
    text: '',
    font: defaultFont,
}

const defualtConfig: Config = {
    units: 'in',
    page: 'letter',
    title: 'Sample',
    color: { r: 255, g: 255, b: 255 },
    view: {
        preview: 'canvas',
        face: 'front',
    },
    face: {
        front: { ...defaultFace, text: 'Sample' },
        back: { sameAsFront: true, ...defaultFace },
        top: { ...defaultFace },
        bottom: { sameAsTop: true, ...defaultFace },
        left: { ...defaultFace },
        right: { sameAsLeft: true, ...defaultFace },
    },
    size: {
        width: 2.25,
        height: 3.5,
        depth: 1.0
    },
    bleed: 0.12,
    margin: 0.25,
    thickness: 0.02
}

interface FaceComponentProps {
    id: string
    face: Face
    width: number
    height: number
    setValue: (...params: any[]) => void
}

const FaceComponent = (props: FaceComponentProps) => 
    <VStack alignItems='flex-start'>
        <TextInput id={`${props.id}-text`} label='Label' sx={{ width: '100%' }} value={props.face.text} onChange={text => props.setValue({ text })} />
        <HStack>
            <Select id={`${props.id}-font-family`} label='Font Family' width='14em' value={props.face.font.family} onChange={family => props.setValue('font', { family })}>
                <Select.Item value='Courier'>Courier</Select.Item>
                <Select.Item value='Helvetica'>Helvetica</Select.Item>
                <Select.Item value='Times-Roman'>Times Roman</Select.Item>
            </Select>
            <NumberInput id={`${props.id}-font-size`} label='Font Size' units='pt' integer value={props.face.font.size} onChange={size => props.setValue('font', { size })} />
            <NumberInput id={`${props.id}-font-weight`} label='Font Weight' value={props.face.font.weight} onChange={weight => props.setValue('font', { weight })} />
        </HStack>
        <HStack>
            <ColorPicker id={`${props.id}-font-color`} label='Font Color' color={props.face.font.color} onChange={color => props.setValue('font', { color })} />
            <ColorPicker id={`${props.id}-font-outline-color`} label='Outline Color' color={props.face.font.outlineColor} onChange={outlineColor => props.setValue('font', { outlineColor })} />
            <NumberInput id={`${props.id}-font-outline-width`} label='Outline Width' value={props.face.font.outlineWidth} onChange={outlineWidth => props.setValue('font', { outlineWidth })} />
        </HStack>
        <ImageSelect id={`${props.id}-image`} label='Image' imageWidth={props.width} imageHeight={props.height} onChange={image => props.setValue({ image: image.toDataURL() })}/>
    </VStack>

export const App = () => {
    const [config, setConfig] = createLocalStore('tuckbox-config', defualtConfig)
    const [imageCache, setImageCache] = createStore<FaceImageCache>({})
    
    let pdfDataUrl = ''
    let pdfBlob: Blob|undefined = undefined
    let pageDetailsRef: HTMLDivElement|undefined = undefined
    let canvasRef: HTMLCanvasElement|undefined = undefined
    let pdfLinkRef: HTMLAnchorElement|undefined = undefined
    let previewFrameRef: HTMLIFrameElement|undefined = undefined

    const toPt = (value: number) => convert(value, config.units, 'pt')
    const toPx = (value: number) => convert(value, config.units, 'px')

    // Release the cached PDF data url (not important in a top-level app
    // content, but good practice anyway)
    onCleanup(() => {
        if (pdfDataUrl !== '') {
            URL.revokeObjectURL(pdfDataUrl)
            pdfDataUrl = ''
        }
    })
    
    // Update the Image caches for each face based on the stored data URL
    createEffect(() => {
        const op = (face: Face, name: Faces) => {
            if (face.image) {
                const img = new Image()
                img.onload = () => setImageCache({ [name]: img })
                img.src = face.image
            }
            else {
                setImageCache({ [name]: undefined })
            }
        }

        op(config.face.front, 'front')
        op(config.face.back, 'back')
        op(config.face.top, 'top')
        op(config.face.bottom, 'bottom')
        op(config.face.left, 'left')
        op(config.face.right, 'right')
    })

    const changeUnits = (units: Units) => {
        setConfig((store) => {
            const precision = units == 'mm' ? 1 : units == 'pt' ? 4 : 2
            const cv = (value: number) => Number.parseFloat(convert(value, store.units, units).toFixed(precision))
            return {
                size: {
                    width: cv(store.size.width),
                    height: cv(store.size.height),
                    depth: cv(store.size.depth),
                },
                bleed: cv(store.bleed),
                margin: cv(store.margin),
                thickness: cv(store.thickness),
                units
            }
        })
    }

    const renderTuckBox = (ctx: CanvasRenderingContext2D) => {
        const size = {
            width: toPt(config.size.width),
            height: toPt(config.size.height),
            depth: toPt(config.size.depth)
        }

        const front = { ...config.face.front, image: imageCache.front }
        const back = config.face.back.sameAsFront ? front : {
            ...config.face.back, image: imageCache.back
        }
        const top = { ...config.face.top, image: imageCache.top }
        const bottom = config.face.bottom.sameAsTop ? top : {
            ...config.face.bottom, image: imageCache.bottom
        }
        const left = { ...config.face.left, image: imageCache.left }
        const right = config.face.right.sameAsLeft ? left : {
            ...config.face.right, image: imageCache.right
        }

        generate(ctx, {
            size,
            color: config.color,
            bleed: toPt(config.bleed),
            thickness: toPt(config.thickness),
            margin: toPt(config.margin),
            face: {
                front,
                back,
                top,
                bottom,
                left,
                right,
            }
        })
    }
        
    const generatePdfBlob = () => {
        const doc = new PDFDocument({
            orientation: 'landscape',
            unit: 'pt',
            format: config.page
        })

        const ctx = patchJsPdf(doc.canvas.getContext("2d"))
        
        renderTuckBox(ctx)

        const bytes = doc.output('blob')
        pdfBlob = new Blob([bytes], { type: 'application/pdf' })

        URL.revokeObjectURL(pdfDataUrl)
        pdfDataUrl = URL.createObjectURL(pdfBlob)

        return { blob: pdfBlob, url: pdfDataUrl }
    }
        
    // Update previews
    createEffect(() => {
        if (config.view.preview == 'canvas') {
            // page dimensions
            const pageSize = paperSize({ 'format': config.page, 'units': config.units, 'orientation': 'landscape' })

            pageDetailsRef!.textContent = `${config.page} ${pageSize[0]}x${pageSize[1]}${config.units}`

            const canvas = canvasRef!
            canvas.width = convert(pageSize[0], config.units, 'pt')
            canvas.height = convert(pageSize[1], config.units, 'pt')

            const ctx = canvas.getContext("2d")!
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            renderTuckBox(ctx)
        }
        else if (config.view.preview == 'pdf') {
            const { blob, url } = generatePdfBlob()
            previewFrameRef!.src = url
        }
    })
    
    const resetConfig = () => {
        if (confirm('Reset all configuration?')) {
            localStorage.clear()
            setConfig(defualtConfig)
        }
    }

    const savePdf = () => {
        const { blob, url } = generatePdfBlob()

        let name = config.title.toLowerCase().replace(/[^a-z0-9]+/, '-')
        if (name === '')
            name += '-'
        name += 'tuckbox.pdf'

        pdfLinkRef!.href = url
        pdfLinkRef!.download = name
        pdfLinkRef!.click()
    }

    const openPdf = () => {
        const { blob, url } = generatePdfBlob()

        window.open(url, 'pdf')
    }

    return <HStack spacing={8} width='100%' height='100%'>
        <VStack>
            <h2>Page & Print</h2>
            <HStack>
                <Select id='page-size' label='Page Format' value={config.page} onChange={value => setConfig('page', value as PaperFormats)}>
                    <Select.Item value='letter'>US Letter</Select.Item>
                    <Select.Item value='a4'>A4</Select.Item>
                </Select>
                <Select id='page-size' label='Units' value={config.units} onChange={value => changeUnits(value)}>
                    <Select.Item value='cm'>centimeters</Select.Item>
                    <Select.Item value='mm'>millimeters</Select.Item>
                    <Select.Item value='in'>inches</Select.Item>
                    <Select.Item value='pt'>points</Select.Item>
                </Select>
            </HStack>
            <HStack>
                <NumberInput id='bleed' label='Bleed' units={config.units} value={config.bleed} onChange={bleed => setConfig({ bleed })} />
                <NumberInput id='margin' label='Margin' units={config.units} value={config.margin} onChange={margin => setConfig({ margin })} />
                <NumberInput id='thickness' label='Thickness' units={config.units} value={config.thickness} onChange={thickness => setConfig({ thickness })}/>
            </HStack>
            <h2>Deck Setup</h2>
            <VStack alignItems='flex-start'>
                <HStack>
                    <NumberInput id="width" value={config.size.width} units={config.units} onChange={value => setConfig('size', 'width', value)} label='Width' />
                    <NumberInput id="height" value={config.size.height} units={config.units} onChange={value => setConfig('size', 'height', value)} label='Height' />
                    <NumberInput id="depth" value={config.size.depth} units={config.units} onChange={value => setConfig('size', 'depth', value)} label='Depth' />
                </HStack>
                <TextInput id='title' label='Deck Title' sx={{ width: '100%' }} value={config.title} onChange={value => setConfig('title', value)} />
                <ColorPicker id='box-color' label='Box Color' color={config.color} onChange={value => setConfig('color', value)}/>
            </VStack>
            <HStack alignItems='baseline'>
                <h2>Faces</h2>
                <ToggleButton value={config.view.face} onChange={value => setConfig('view', 'face', value)} style={{ height: '2.5em', 'vertical-align': 'end' }}>
                    <ToggleButton.Item value='front'>Front</ToggleButton.Item>
                    <ToggleButton.Item value='back'>Back</ToggleButton.Item>
                    <ToggleButton.Item value='top'>Top</ToggleButton.Item>
                    <ToggleButton.Item value='bottom'>Bottom</ToggleButton.Item>
                    <ToggleButton.Item value='left'>Left</ToggleButton.Item>
                    <ToggleButton.Item value='right'>Right</ToggleButton.Item>
                </ToggleButton>
            </HStack>
            <Switch>
                <Match when={config.view.face == 'front'}>
                    <FaceComponent id='front-face' face={config.face.front} width={toPx(config.size.width)} height={toPx(config.size.height)} setValue={setConfig.bind(undefined, 'face', 'front')} />
                </Match>
                <Match when={config.view.face == 'back'}>
                    <ToggleSwitch label='Same as Front' value={config.face.back.sameAsFront} onChange={value => setConfig('face', 'back', 'sameAsFront', value)} />
                    <Show when={!config.face.back.sameAsFront}>
                        <FaceComponent id='back-face' face={config.face.back}  width={toPx(config.size.width)} height={toPx(config.size.height)} setValue={setConfig.bind(undefined, 'face', 'back')}/>
                    </Show>
                </Match>
                <Match when={config.view.face == 'top'}>
                    <FaceComponent id='top-face' face={config.face.top}  width={toPx(config.size.width)} height={toPx(config.size.depth)} setValue={setConfig.bind(undefined, 'face', 'top')} />
                </Match>
                <Match when={config.view.face == 'bottom'}>
                    <ToggleSwitch label='Same as Top' value={config.face.bottom.sameAsTop} onChange={value => setConfig('face', 'bottom', 'sameAsTop', value)} />
                    <Show when={!config.face.bottom.sameAsTop}>
                        <FaceComponent id='bottom-face' face={config.face.bottom}  width={toPx(config.size.width)} height={toPx(config.size.depth)} setValue={setConfig.bind(undefined, 'face', 'bottom')}/>
                    </Show>
                </Match>
                <Match when={config.view.face == 'left'}>
                    <FaceComponent id='left-face' face={config.face.left}  width={toPx(config.size.height)} height={toPx(config.size.depth)} setValue={setConfig.bind(undefined, 'face', 'left')} />
                </Match>
                <Match when={config.view.face == 'right'}>
                    <ToggleSwitch label='Same as Left' value={config.face.right.sameAsLeft} onChange={value => setConfig('face', 'right', 'sameAsLeft', value)} />
                    <Show when={!config.face.right.sameAsLeft}>
                        <FaceComponent id='right-face' face={config.face.right}  width={toPx(config.size.height)} height={toPx(config.size.depth)} setValue={setConfig.bind(undefined, 'face', 'right')}/>
                    </Show>
                </Match>
            </Switch>
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
                <ToggleButton exclusive style={{ height: '2.5em', 'vertical-align': 'end' }} value={config.view.preview} onChange={value => setConfig('view', 'preview', value)}>
                    <ToggleButton.Item value='canvas'>Canvas</ToggleButton.Item>
                    <ToggleButton.Item value='pdf'>PDF</ToggleButton.Item>
                </ToggleButton>
            </HStack>
            <Switch fallback={<>
                <canvas width="800" height="600" ref={canvasRef} style={{ border: '1px solid grey' }}></canvas>
            </>}>
                <Match when={config.view.preview == 'pdf'}>
                    <iframe width="800" height="600" ref={previewFrameRef} style={{ border: 'none', width: '100%' }}></iframe>
                </Match>
            </Switch>
            <div ref={pageDetailsRef}></div>
        </VStack>
    </HStack>
}
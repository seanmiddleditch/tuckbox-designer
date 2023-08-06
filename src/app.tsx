import { createEffect, createSignal, Switch, Match, Show } from 'solid-js'
import { SetStoreFunction, createStore } from 'solid-js/store'
import { paperSize, PaperFormats } from './paper'
import { convert, Units } from './convert'
import { generate } from './generate'
import { createLocalStore } from './local'
import PDFDocument from 'jspdf'
import { Button } from './components/button'
import { HStack, VStack } from './components/stack'
import { Select } from './components/select'
import { Toggle } from './components/toggle'
import { ColorPicker } from './components/color-picker'
import { NumberInput } from './components/number-input'
import { TextInput } from './components/text-input'
import { ImageSelect } from './components/image-select'
import { Download as DownloadIcon } from '@suid/icons-material'
import { DeepPartial } from 'ts-essentials'
import { Font, Size, Face } from './types'
import patchJsPdf from './jspdf-patch'

import '@suid/material'
import { ToggleSwitch } from './components/toggle-switch'

interface Config {
    units: Units,
    page: PaperFormats,
    title: string,
    color: string,
    face: {
        front: Face,
        back: Face & { sameAsFront: boolean },
        top: Face,
        bottom: Face & { sameAsTop: boolean },
        left: Face,
        right: Face & { sameAsLeft: boolean },
    },
    size: Size
}

interface FaceImageCache {
    front?: HTMLImageElement,
    back?: HTMLImageElement,
    top?: HTMLImageElement,
    bottom?: HTMLImageElement,
    left?: HTMLImageElement,
    right?: HTMLImageElement,
}

const defaultFont: Font = {
    family: 'Times-Roman',
    size: 18,
    weight: 700,
}

const defaultFace: Face = {
    text: '',
    font: defaultFont,
}

const defualtConfig: Config = {
    units: 'in',
    page: 'letter',
    title: 'Sample',
    color: '#ffffff00',
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
}

type Faces = 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right'

const FaceComponent = (props: { id: string, face: Face, size: Size, units: Units, setValue: (values: DeepPartial<Face>) => void }) => 
    <VStack alignItems='flex-start'>
        <TextInput id={`${props.id}-text`} label='Label' sx={{ width: '100%' }} value={props.face.text} onChange={value => props.setValue({ text: value })} />
        <HStack>
            <Select id={`${props.id}-font-family`} label='Font Family' width='14em' value={props.face.font.family} onChange={value => props.setValue({ font: { family: value } })}>
                <Select.Item value='Courier'>Courier</Select.Item>
                <Select.Item value='Helvetica'>Helvetica</Select.Item>
                <Select.Item value='Times-Roman'>Times Roman</Select.Item>
            </Select>
            <NumberInput id={`${props.id}-font-size`} label='Font Size' units='pt' value={props.face.font.size} onChange={value => props.setValue({ font: { size: value } })} />
            <NumberInput id={`${props.id}-font-weight`} label='Font Weight' value={props.face.font.weight} onChange={value => props.setValue({ font: { weight: value } })} />
        </HStack>
        <ImageSelect id={`${props.id}-image`} label='Image' imageWidth={convert(props.size.width, props.units, 'px')} imageHeight={convert(props.size.height, props.units, 'px')} onChange={image => props.setValue({ image: image.toDataURL() })}/>
    </VStack>

export const App = () => {
    const [config, setConfig] = createLocalStore('tuckbox-config', defualtConfig)
    const [imageCache, setImageCache] = createStore<FaceImageCache>({})
    const [currentFace, setCurrentFace] = createSignal<Faces>('front')
    const [preview, setPreview] = createSignal('canvas')

    let pageDetailsRef: HTMLDivElement|undefined = undefined
    let canvasRef: HTMLCanvasElement|undefined = undefined
    let pdfLinkRef: HTMLAnchorElement|undefined = undefined
    let data_url: string = ''
    let previewFrameRef: HTMLIFrameElement|undefined = undefined

    const resetConfig = () => {
        if (confirm('Reset all configuration?')) {
            localStorage.clear()
            setConfig(defualtConfig)
        }
    }
    
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

    const drawToCanvas = (ctx: CanvasRenderingContext2D) => {
        const size = {
            width: convert(config.size.width, config.units, 'pt'),
            height: convert(config.size.height, config.units, 'pt'),
            depth: convert(config.size.depth, config.units, 'pt')
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

    createEffect(() => {
        if (preview() != 'canvas')
            return
        
        // page dimensions
        const pageSize = paperSize({ 'format': config.page, 'units': config.units, 'orientation': 'landscape' })

        pageDetailsRef!.textContent = `${config.page} ${pageSize[0]}x${pageSize[1]}${config.units}`

        const canvas = canvasRef!
        canvas.width = convert(pageSize[0], config.units, 'pt')
        canvas.height = convert(pageSize[1], config.units, 'pt')

        const ctx = canvas.getContext("2d")!
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        drawToCanvas(ctx)
    })

    const generatePdfBlob = () => {
        const doc = new PDFDocument({
            orientation: 'landscape',
            unit: 'pt',
            format: config.page
        })

        const ctx = patchJsPdf(doc.canvas.getContext("2d"))
        
        drawToCanvas(ctx)

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
                <Select id='page-size' label='Page Format' value={config.page} onChange={value => setConfig('page', value as PaperFormats)}>
                    <Select.Item value='letter'>US Letter</Select.Item>
                    <Select.Item value='a4'>A4</Select.Item>
                </Select>
                <Select id='page-size' label='Units' value={config.units} onChange={value => setConfig('units', value as Units)}>
                    <Select.Item value='cm'>centimeters</Select.Item>
                    <Select.Item value='mm'>millimeters</Select.Item>
                    <Select.Item value='in'>inches</Select.Item>
                    <Select.Item value='pt'>points</Select.Item>
                </Select>
            </HStack>
            <h2>Deck Setup</h2>
            <VStack alignItems='flex-start'>
                <HStack>
                    <NumberInput id="width" value={config.size.width} units={config.units} onChange={value => setConfig('size', 'width', value)} label='Width' />
                    <NumberInput id="height" value={config.size.height} units={config.units} onChange={value => setConfig('size', 'height', value)} label='Height' />
                    <NumberInput id="depth" value={config.size.depth} units={config.units} onChange={value => setConfig('size', 'depth', value)} label='Depth' />
                </HStack>
                <TextInput id='title' label='Deck Title' sx={{ width: '100%' }} value={config.title} onChange={value => setConfig('title', value)} />
                <ColorPicker label='Box Color' color={config.color} onChange={value => setConfig('color', value)}/>
            </VStack>
            <HStack alignItems='baseline'>
                <h2>Faces</h2>
                <Toggle.Group value={currentFace()} onChange={setCurrentFace} style={{ height: '2.5em', 'vertical-align': 'end' }}>
                    <Toggle.Button value='front'>Front</Toggle.Button>
                    <Toggle.Button value='back'>Back</Toggle.Button>
                    <Toggle.Button value='top'>Top</Toggle.Button>
                    <Toggle.Button value='bottom'>Bottom</Toggle.Button>
                    <Toggle.Button value='left'>Left</Toggle.Button>
                    <Toggle.Button value='right'>Right</Toggle.Button>
                </Toggle.Group>
            </HStack>
            <Switch>
                <Match when={currentFace() == 'front'}>
                    <FaceComponent id='front-face' face={config.face.front} size={config.size} units={config.units} setValue={setConfig.bind(undefined, 'face', 'front')} />
                </Match>
                <Match when={currentFace() == 'back'}>
                    <ToggleSwitch label='Same as Front' value={config.face.back.sameAsFront} onChange={value => setConfig('face', 'back', 'sameAsFront', value)} />
                    <Show when={!config.face.back.sameAsFront}>
                        <FaceComponent id='back-face' face={config.face.back} size={config.size} units={config.units} setValue={setConfig.bind(undefined, 'face', 'back')}/>
                    </Show>
                </Match>
                <Match when={currentFace() == 'top'}>
                    <FaceComponent id='top-face' face={config.face.top} size={config.size} units={config.units} setValue={setConfig.bind(undefined, 'face', 'top')} />
                </Match>
                <Match when={currentFace() == 'bottom'}>
                    <ToggleSwitch label='Same as Top' value={config.face.bottom.sameAsTop} onChange={value => setConfig('face', 'bottom', 'sameAsTop', value)} />
                    <Show when={!config.face.bottom.sameAsTop}>
                        <FaceComponent id='bottom-face' face={config.face.bottom} size={config.size} units={config.units} setValue={setConfig.bind(undefined, 'face', 'bottom')}/>
                    </Show>
                </Match>
                <Match when={currentFace() == 'left'}>
                    <FaceComponent id='left-face' face={config.face.left} size={config.size} units={config.units} setValue={setConfig.bind(undefined, 'face', 'left')} />
                </Match>
                <Match when={currentFace() == 'right'}>
                    <ToggleSwitch label='Same as Left' value={config.face.right.sameAsLeft} onChange={value => setConfig('face', 'right', 'sameAsLeft', value)} />
                    <Show when={!config.face.right.sameAsLeft}>
                        <FaceComponent id='right-face' face={config.face.right} size={config.size} units={config.units} setValue={setConfig.bind(undefined, 'face', 'right')}/>
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
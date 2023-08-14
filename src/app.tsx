import { createEffect, Switch, Match, Show, onCleanup, batch, createSignal } from 'solid-js'
import { SetStoreFunction, StoreSetter, createStore } from 'solid-js/store'
import { paperSize, PaperFormats } from './paper'
import { convert, Units } from './convert'
import { GetFaceDimensionsOptions, generate, getFaceDimensions } from './generate'
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
import { Modal } from '@suid/material'
import { Download as DownloadIcon } from '@suid/icons-material'
import { Font, Size, Face, RGB, Faces } from './types'
import patchJsPdf from './jspdf-patch'

import '@suid/material'
import { ToggleSwitch } from './components/toggle-switch'

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

interface FaceCache<T> {
    front?: T
    back?: T
    top?: T
    bottom?: T
    left?: T
    right?: T
}

const defaultFont: Font = {
    family: 'Times-Roman',
    size: 18,
    weight: 700,
    color: { r: 0, g: 0, b: 0 },
    outlineColor: { r: 255, g: 255, b: 255 },
    outlineWidth: 3,
}

const defaultFace: Face = {
    text: '',
    font: defaultFont,
    crop: { x: 0, y: 0, width: 0, height: 0 }
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
    id: Faces
    value: Face
}

interface AppState {
    loading: boolean
}

const loadImage = (blob: Blob): Promise<HTMLCanvasElement> => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    const promise = new Promise<HTMLCanvasElement>((resolve, reject) => {
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            if (ctx == null)
                return reject(new Error('Failed to create 2d context'))
            ctx.drawImage(img, 0, 0)
            resolve(canvas)
        }
        img.onerror = reject
    })
    .finally(() => URL.revokeObjectURL(url))
    img.src = url
    return promise
}

export const App = () => {
    const [config, setConfig] = createLocalStore('tuckbox-config', defualtConfig)
    const [state, setState] = createStore<AppState>({loading: true})
    const [imageCache, setImageCache] = createStore<FaceCache<HTMLCanvasElement>>({})
    const [blobCache, setBlobCache] = createStore<FaceCache<Blob>>({})

    const [pageDetailsDiv, setPageDetailsDiv] = createSignal<HTMLDivElement | undefined>(undefined)
    const [previewCanvas, setPreviewCanvas] = createSignal<HTMLCanvasElement | undefined>(undefined)
    const [previewFrame, setPreviewFrame] = createSignal<HTMLIFrameElement | undefined>(undefined)
        
    let pdfDataUrl = ''
    let pdfBlob: Blob|undefined = undefined
    let pdfLinkRef: HTMLAnchorElement|undefined = undefined

    const toPt = (value: number) => convert(value, config.units, 'pt')

    // load up the image cache
    navigator.storage.getDirectory()
        .then(dir => {
            const faces: Faces[] = ['front', 'back', 'top', 'bottom', 'left', 'right']
            return Promise.all(faces.map(async (face) => {
                let h: FileSystemFileHandle
                try {
                    h = await dir.getFileHandle(face)
                }
                catch (e) {
                    if (e instanceof Error && e.name != 'NotFoundError')
                        throw e
                    return
                }
                const file = await h.getFile()
                const canvas = await loadImage(file)
                batch(() => {
                    setImageCache(face, canvas)
                    setBlobCache(face, file)
                })
            }))
        })
        .catch(err => console.error(err))
        .finally(() => setState({ loading: false }))
    
    const saveImage = (face: Faces, blob: Blob) => {
        navigator.storage.getDirectory().then(async (dir) => {
            const handle = await dir.getFileHandle(face, { create: true })
            const writeable = await handle.createWritable()
            blob.stream().pipeTo(writeable)
        })
        .catch(err => console.error(err))
        .finally(() => console.log('Done'))
    }

    const deleteImage = (face: Faces) => {
        navigator.storage.getDirectory()
            .then(dir => dir.removeEntry(face))
            .catch(err => err.name != 'NotFoundError' ?  console.error(err) : false)
    }

    // Release the cached PDF data url (not important in a top-level app
    // content, but good practice anyway)
    onCleanup(() => {
        if (pdfDataUrl !== '') {
            URL.revokeObjectURL(pdfDataUrl)
            pdfDataUrl = ''
        }
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
            const detailsDiv = pageDetailsDiv()
            const canvas = previewCanvas()

            if (!detailsDiv || !canvas)
                return

            // page dimensions
            const pageSize = paperSize({ 'format': config.page, 'units': config.units, 'orientation': 'landscape' })

            detailsDiv.textContent = `${config.page} ${pageSize[0]}x${pageSize[1]}${config.units}`

            canvas.width = convert(pageSize[0], config.units, 'pt')
            canvas.height = convert(pageSize[1], config.units, 'pt')

            const ctx = canvas.getContext("2d")!
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            renderTuckBox(ctx)
        }
        else if (config.view.preview == 'pdf') {
            const frame = previewFrame()
            if (!frame)
                return

            const { url } = generatePdfBlob()
            frame.src = url
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
    
    const getFaceDimensionsPixels = (face: Faces): [number, number] => {
        const size = {
            width: config.size.width,
            height: config.size.height,
            depth: config.size.depth,
        }
        const dims = getFaceDimensions(face, { size, thickness: config.thickness, bleed: config.bleed })
        return [convert(dims[0], config.units, 'px'), convert(dims[1], config.units, 'px')]
    }
    
    const FaceComponent = (props: FaceComponentProps) => 
        <VStack alignItems='flex-start'>
            <TextInput id={`${props.id}-text`} label='Label' sx={{ width: '100%' }} value={props.value.text} onChange={text => setConfig('face', props.id, { text })}/>
            <HStack>
                <Select id={`${props.id}-font-family`} label='Font Family' width='14em' disabled={props.value.text == ''} value={props.value.font.family} onChange={family => setConfig('face', props.id, 'font', { family })}>
                    <Select.Item value='Courier'>Courier</Select.Item>
                    <Select.Item value='Helvetica'>Helvetica</Select.Item>
                    <Select.Item value='Times-Roman'>Times Roman</Select.Item>
                </Select>
                <NumberInput id={`${props.id}-font-size`} label='Font Size' units='pt' integer disabled={props.value.text == ''} value={props.value.font.size} onChange={size => setConfig('face', props.id, 'font', { size })} />
                <NumberInput id={`${props.id}-font-weight`} label='Font Weight' disabled={props.value.text == ''} value={props.value.font.weight} onChange={weight => setConfig('face', props.id, 'font', { weight })} />
            </HStack>
            <HStack>
                <ColorPicker id={`${props.id}-font-color`} label='Font Color' disabled={props.value.text == ''} color={props.value.font.color} onChange={color => setConfig('face', props.id, 'font', { color })} />
                <NumberInput id={`${props.id}-font-outline-width`} label='Width' disabled={props.value.text == ''} value={props.value.font.outlineWidth} onChange={outlineWidth => setConfig('face', props.id, 'font', { outlineWidth })} />
                <ColorPicker id={`${props.id}-font-outline-color`} label='Outline Color' disabled={props.value.text == ''} color={props.value.font.outlineColor} onChange={outlineColor => setConfig('face', props.id, 'font', { outlineColor })} />
            </HStack>
            <ImageSelect id={`${props.id}-image`} label='Image' dimensions={getFaceDimensionsPixels(props.id)} blob={blobCache[props.id]} cropData={config.face[props.id].crop} onChange={result => batch(() => {
                if (result) {
                    setImageCache(props.id, result.canvas)
                    if (result.blob !== blobCache[props.id]) {
                        setBlobCache(props.id, result.blob)
                        saveImage(props.id, result.blob)
                    }
                    setConfig('face', props.id, 'crop', { x: result.cropData.x, y: result.cropData.y, width: result.cropData.width, height: result.cropData.height })
                }
                else {
                    setImageCache(props.id, undefined)
                    setBlobCache(props.id, undefined)
                    deleteImage(props.id)
                    setConfig('face', props.id, 'crop', defaultFace.crop)
                }
            })} />
        </VStack>

    return <Show when={!state.loading} fallback={'Loading...'}>
        <HStack spacing={8} width='100%' height='100%'>
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
                        <FaceComponent id='front' value={config.face.front} />
                    </Match>
                    <Match when={config.view.face == 'back'}>
                        <ToggleSwitch label='Same as Front' value={config.face.back.sameAsFront} onChange={value => setConfig('face', 'back', 'sameAsFront', value)} />
                        <Show when={!config.face.back.sameAsFront}>
                            <FaceComponent id='back' value={config.face.back} />
                        </Show>
                    </Match>
                    <Match when={config.view.face == 'top'}>
                        <FaceComponent id='top' value={config.face.top} />
                    </Match>
                    <Match when={config.view.face == 'bottom'}>
                        <ToggleSwitch label='Same as Top' value={config.face.bottom.sameAsTop} onChange={value => setConfig('face', 'bottom', 'sameAsTop', value)} />
                        <Show when={!config.face.bottom.sameAsTop}>
                            <FaceComponent id='bottom' value={config.face.bottom} />
                        </Show>
                    </Match>
                    <Match when={config.view.face == 'left'}>
                        <FaceComponent id='left' value={config.face.left} />
                    </Match>
                    <Match when={config.view.face == 'right'}>
                        <ToggleSwitch label='Same as Left' value={config.face.right.sameAsLeft} onChange={value => setConfig('face', 'right', 'sameAsLeft', value)} />
                        <Show when={!config.face.right.sameAsLeft}>
                            <FaceComponent id='right' value={config.face.right} />
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
                    <canvas width="800" height="600" ref={setPreviewCanvas} style={{ border: '1px solid grey' }}></canvas>
                </>}>
                    <Match when={config.view.preview == 'pdf'}>
                        <iframe width="800" height="600" ref={setPreviewFrame} style={{ border: 'none', width: '100%' }}></iframe>
                    </Match>
                </Switch>
                <div ref={setPageDetailsDiv}></div>
            </VStack>
        </HStack>
    </Show>
}
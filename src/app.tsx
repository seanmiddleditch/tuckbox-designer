import { createEffect, Switch, Match, Show, onCleanup, batch, createSignal, For } from 'solid-js'
import { createStore } from 'solid-js/store'
import { paperSize, PaperFormats, getPaperSizes, getPaperSize } from './paper'
import { convert, Units } from './convert'
import { FaceOptions, generate, getFaceDimensions } from './generate'
import { createLocalStore } from './local'
import PDFDocument from 'jspdf'
import { Button } from './components/button'
import { HStack, VStack } from './components/stack'
import { Select } from './components/select'
import { Checkbox } from './components/checkbox'
import { ColorPicker } from './components/color-picker'
import { NumberInput } from './components/number-input'
import { TextInput } from './components/text-input'
import { FontSelector } from './components/font-selector'
import { ImageSelect, ImageSelectResult } from './components/image-select'
import { FormControlLabel, FormGroup, Typography, Link, Container, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@suid/material'
import { BugReportRounded as BugIcon, CopyrightRounded as CopyrightIcon, Download as DownloadIcon } from '@suid/icons-material'
import { Font, Size, Face, RGB, Faces, CropData, BoxStyle } from './types'
import Cropper from 'cropperjs'
import patchJsPdf from './jspdf-patch'

import '@suid/material'
import { HelpButton } from './components/help-button'
import { colorToRgb } from './color'

interface Config {
    units: Units
    page: PaperFormats
    style: {
        title: string
        color: RGB
        font: Font
        style: BoxStyle
    }
    view: {
        advanced: boolean
        preview: 'canvas' | 'canvas-pretty' | 'pdf'
        face: Faces
    }
    face: {
        front: Face
        back: Face
        top: Face
        bottom: Face
        left: Face
        right: Face
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
    label: '',
    font: defaultFont,
    useLabel: true,
    useDefaultFont: true,
    useOppositeImage: true,
    useImage: false,
    cloneOpposite: false,
    crop: { x: 0, y: 0, width: 0, height: 0, rotate: 0, scaleX: 1, scaleY: 1 },
    feather: 0,
    opacity: 1.0,
}

const defualtConfig: Config = {
    units: 'in',
    page: 'letter',
    style: {
        title: 'Sample',
        color: { r: 255, g: 255, b: 255 },
        font: { ...defaultFont },
        style: 'default',
    },
    view: {
        advanced: false,
        preview: 'canvas',
        face: 'front',
    },
    face: {
        front: { ...defaultFace, useImage: true, useLabel: true },
        back: { ...defaultFace, cloneOpposite: true },
        top: { ...defaultFace, useImage: true },
        bottom: { ...defaultFace, cloneOpposite: true },
        left: { ...defaultFace, useImage: true },
        right: { ...defaultFace, cloneOpposite: true },
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

interface AppState {
    loading: boolean
}

const faces: Faces[] = ['front', 'back', 'top', 'bottom', 'left', 'right']

const canCloneOpposite = (face: Faces) => face == 'back' || face == 'bottom' || face == 'right'

const getOppositeFace = (face: Faces) => {
    switch (face) {
        case 'front': return 'back'
        case 'back': return 'front'
        case 'top': return 'bottom'
        case 'bottom': return 'top'
        case 'left': return 'right'
        case 'right': return 'left'
    }
}

interface LoadImageOptions {
    color: RGB
    feather: number
    opacity: number
}

const loadImage = (blob: Blob, crop: CropData, dims: [number, number], options: LoadImageOptions): Promise<HTMLCanvasElement> => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    const promise = new Promise<HTMLCanvasElement>((resolve, reject) => {
        img.onload = () => {
            document.body.appendChild(img)

            const cropper = new Cropper(img, {
                data: crop,
                background: false,
                ready: () => {
                    const canvas = cropper.getCroppedCanvas({
                        width: dims[0] || 400,
                        height: dims[1] || 300,
                        imageSmoothingEnabled: true,
                        imageSmoothingQuality: 'high',
                    })
                    cropper.destroy()
                    document.body.removeChild(img)
                    resolve(canvas)
                }
            })
        }
        img.onerror = reject
    })
        .finally(() => URL.revokeObjectURL(url))
        .then(cropped => {
            const f = options.feather
            if (f <= 0)
                return cropped

            const canvas = document.createElement('canvas')
            canvas.width = cropped.width
            canvas.height = cropped.height
            const ctx = canvas.getContext('2d')
            if (!ctx) throw 'Failed to create canvas context'

            // feather edges
            ctx.shadowOffsetX = canvas.width
            ctx.shadowBlur = f
            ctx.shadowColor = '#0f0'
            ctx.fillRect(-canvas.width + f, f, canvas.width - f * 2, canvas.height - f * 2)
            
            ctx.shadowBlur = 0
            ctx.globalCompositeOperation = 'source-in'
            ctx.drawImage(cropped, 0, 0)

            return canvas
        })
        .then(image => {
            const canvas = document.createElement('canvas')
            canvas.width = image.width
            canvas.height = image.height
            const ctx = canvas.getContext('2d')
            if (!ctx) throw 'Failed to create canvas context'

            // we fill in the background with our box color
            // due to https://github.com/parallax/jsPDF/issues/816
            ctx.fillStyle = colorToRgb(options.color)
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            ctx.globalAlpha = options.opacity

            ctx.drawImage(image, 0, 0)
            return canvas
        })
    img.src = url
    return promise
}

export const App = () => {
    const [config, setConfig] = createLocalStore('tuckbox-config', defualtConfig)
    const [state, setState] = createStore<AppState>({loading: true})
    const [imageCache, setImageCache] = createStore<FaceCache<HTMLCanvasElement>>({})
    const [blobCache, setBlobCache] = createStore<FaceCache<Blob>>({})

    const [previewCanvas, setPreviewCanvas] = createSignal<HTMLCanvasElement | undefined>(undefined)
    const [previewObject, setPreviewObject] = createSignal<HTMLObjectElement | undefined>(undefined)
        
    let pdfDataUrl = ''
    let pdfBlob: Blob|undefined = undefined
    let pdfLinkRef: HTMLAnchorElement|undefined = undefined

    const toPt = (value: number) => convert(value, config.units, 'pt')
    
    const getFaceDimensionsPixels = (face: Faces): [number, number] => {
        const size = {
            width: config.size.width,
            height: config.size.height,
            depth: config.size.depth,
        }
        const dims = getFaceDimensions(face, { size, thickness: config.thickness, bleed: config.bleed })
        return [convert(dims[0], config.units, 'px'), convert(dims[1], config.units, 'px')]
    }

    // load up the image cache
    navigator.storage.getDirectory().then(dir => dir.getDirectoryHandle('images', { create: true }))
        .then(dir => {
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
                setBlobCache(face, file)
            }))
        })
        .catch(err => console.error(err))
        .finally(() => setState({ loading: false }))
    
    const saveImage = (face: Faces, blob: Blob) => {
        navigator.storage.getDirectory().then(dir => dir.getDirectoryHandle('images', { create: true })).then(async (dir) => {
            const handle = await dir.getFileHandle(face, { create: true })
            const writeable = await handle.createWritable()
            blob.stream().pipeTo(writeable)
        })
        .catch(err => console.error(err))
    }

    const deleteImage = (face: Faces) => {
        navigator.storage.getDirectory().then(dir => dir.getDirectoryHandle('images'))
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

    // Update canvas caches of images
    faces.map(face => {
        createEffect(() => {
            const blob = blobCache[face]
            if (blob && config.face[face].crop) {
                // we need to read the properties themselves to be reactive
                const { x, y, width, height, scaleX, scaleY, rotate } = config.face[face].crop
                const options = {
                    color: { ...config.style.color },
                    feather: +config.face[face].feather,
                    opacity: +config.face[face].opacity,
                }

                loadImage(blob, { x, y, width, height, scaleX, scaleY, rotate }, getFaceDimensionsPixels(face), options)
                    .then(canvas => setImageCache(face, canvas))
            } else {
                setImageCache(face, undefined)
            }
        })
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

        const getFace = (face: Faces): FaceOptions => {
            const canClone = canCloneOpposite(face)
            const opposite = getOppositeFace(face)

            if (canClone && config.face[face].cloneOpposite)
                return getFace(opposite)

            return {
                ...config.face[face],
                text: config.face[face].useLabel ? (config.face[face].label !== '' ? config.face[face].label : config.style.title) : undefined,
                font: config.face[face].useDefaultFont ? config.style.font : config.face[face].font,
                image: config.face[face].useImage ? ((imageCache[face] || !canClone) ? imageCache[face] : imageCache[opposite]) : undefined,
            }
        }

        const face = {
            front: getFace('front'),
            back: getFace('back'),
            top: getFace('top'),
            bottom: getFace('bottom'),
            left: getFace('left'),
            right: getFace('right'),
        }

        generate(ctx, {
            size,
            pageSize: paperSize({ 'format': config.page, 'units': 'pt', 'orientation': 'landscape' }),
            style: config.style.style,
            color: config.style.color,
            bleed: toPt(config.bleed),
            thickness: toPt(config.thickness),
            margin: toPt(config.margin),
            prettyPreview: config.view.preview == 'canvas-pretty',
            face
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
        const pageSize = paperSize({ 'format': config.page, 'units': config.units, 'orientation': 'landscape' })

        if (config.view.preview == 'pdf') {
            const preview = previewObject()
            if (!preview)
                return

            const toolbarHeight = 20 // guess at toolbar height for browser PDF viewers
            
            preview.width = `${convert(pageSize.width, pageSize.units, 'px')}px`
            preview.height = `${convert(pageSize.height, pageSize.units, 'px') + toolbarHeight}px` 

            const { url } = generatePdfBlob()
            preview.data = url
        }
        else {
            const canvas = previewCanvas()
            if (!canvas)
                return

            canvas.width = convert(pageSize.width, config.units, 'pt')
            canvas.height = convert(pageSize.height, config.units, 'pt')

            const ctx = canvas.getContext("2d")!
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            renderTuckBox(ctx)
        }

    })
    
    const resetConfig = () => {
        setState({ loading: true })
        localStorage.clear()
        navigator.storage.getDirectory().then(dir => dir.removeEntry('images', { recursive: true }))
            .catch(err => err.name != 'NotFoundError' ? console.error(err) : false)
            .then(() => window.location.reload())
    }

    const savePdf = () => {
        const { blob, url } = generatePdfBlob()

        let name = config.style.title.toLowerCase().replace(/[^a-z0-9]+/, '-')
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

    const setFaceImage = (face: Faces, result: ImageSelectResult) => {
        batch(() => {
            if (result) {
                if (result.blob !== blobCache[face]) {
                    setBlobCache(face, result.blob)
                    saveImage(face, result.blob)
                }
                setConfig('face', face, 'crop', {
                    x: result.cropData.x,
                    y: result.cropData.y,
                    width: result.cropData.width,
                    height: result.cropData.height,
                    rotate: result.cropData.rotate,
                    scaleX: result.cropData.scaleX,
                    scaleY: result.cropData.scaleY,
                })
            }
            else {
                setBlobCache(face, undefined)
                deleteImage(face)
                setConfig('face', face, 'crop', defaultFace.crop)
            }
        })
    }

    const ResetButton = (props: { onReset: () => void }) => {
        const [open, setOpen] = createSignal(false)

        const onClick = () => setOpen(true)
        const onCancel = () => setOpen(false)
        const onAccept = () => { setOpen(false); props.onReset(); }

        return <>
            <Button variant='outlined' color='error' onClick={onClick}>Reset</Button>
            <Dialog open={open()} onClose={onCancel}>
                <DialogTitle>Reset Current Design</DialogTitle>
                <DialogContent>
                    <DialogContentText>Clicking <b>Reset</b> will clear all elements of the design back to their defaults.</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onCancel}>Keep Design</Button>
                    <Button color='error' onClick={onAccept}>Reset</Button>
                </DialogActions>
            </Dialog>
        </>
    }

    return <Show when={!state.loading} fallback={'Loading...'}>
        <VStack>
            <HStack alignItems='baseline'>
                <Typography variant='h3'>Tuckbox Designer</Typography>
                <Typography>by Sean Middleditch</Typography>
                <Typography><BugIcon fontSize='small' style='display: inline-flex; vertical-align: top'/> <Link href="https://github.com/seanmiddleditch/tuckbox-designer">Issue Tracker &amp; Source Code</Link></Typography>
                <Typography><CopyrightIcon fontSize='small' style='display: inline-flex; vertical-align: top'/> <Link href="https://creativecommons.org/publicdomain/zero/1.0/legalcode">Creative Commons Zero</Link></Typography>
            </HStack>
            <HStack spacing={8} width='100%' height='100%'>
                <VStack>
                    <HStack alignItems='center'>
                        <Typography variant='h6'>Page &amp; Print</Typography>
                        <FormGroup>
                            <Checkbox label='Advanced' checked={config.view.advanced} onChange={advanced => setConfig('view', { advanced })} />
                        </FormGroup>
                    </HStack>
                    <HStack>
                        <Select id='page-size' label='Page Format' value={config.page} renderValue={value => getPaperSize(value).name} onChange={format => setConfig('page', format)}>
                            <For each={getPaperSizes()}>{paper =>
                                <Select.Item value={paper.format} style='width: 220px; text-align: baseline' note={<>{paper.width}x{paper.height}{paper.units}</>}>
                                    {paper.name}
                                </Select.Item>
                            }</For>
                        </Select>
                        <Select id='page-size' label='Units' value={config.units} onChange={value => changeUnits(value)}>
                            <Select.Item value='cm'>Centimeters</Select.Item>
                            <Select.Item value='mm'>Millimeters</Select.Item>
                            <Select.Item value='in'>Inches</Select.Item>
                            <Select.Item value='pt'>Points</Select.Item>
                        </Select>
                    </HStack>
                    <Show when={config.view.advanced}>
                        <HStack>
                            <NumberInput id='bleed' label='Bleed' units={config.units} min={0} value={config.bleed} onChange={bleed => setConfig({ bleed })} />
                            <NumberInput id='margin' label='Margin' units={config.units} min={0} value={config.margin} onChange={margin => setConfig({ margin })} />
                            <NumberInput id='thickness' label='Thickness' units={config.units} min={0} value={config.thickness} onChange={thickness => setConfig({ thickness })} />
                        </HStack>
                    </Show>
                    <Typography variant='h6'>Deck Size</Typography>
                    <HStack>
                        <NumberInput id="width" value={config.size.width} units={config.units} min={0} onChange={value => setConfig('size', 'width', value)} label='Width' />
                        <NumberInput id="height" value={config.size.height} units={config.units} min={0} onChange={value => setConfig('size', 'height', value)} label='Height' />
                        <NumberInput id="depth" value={config.size.depth} units={config.units} min={0} onChange={value => setConfig('size', 'depth', value)} label='Depth' />
                    </HStack>
                    <Typography variant='h6'>Styling</Typography>
                    <TextInput id='title' label='Deck Name' sx={{ width: '100%' }} value={config.style.title} onChange={title => setConfig('style', { title })} />
                    <HStack alignItems='center'>
                        <ColorPicker id='box-color' label='Box Color' color={config.style.color} onChange={color => setConfig('style', { color })}/>
                        <Select id='box-style' label='Box Style' value={config.style.style} onChange={style => setConfig('style', { style })}>
                            <Select.Item value='default'>Default</Select.Item>
                            <Select.Item value='double-tuck'>Bottom Tuck</Select.Item>
                        </Select>
                        <HelpButton>
                            <p>The <b>Default</b> box style requires gluing the bottom box flaps.</p>
                            <p>The <b>Bottom Tuck</b> box style uses a tuck flap on the bottom of the box.</p>
                        </HelpButton>
                    </HStack>
                    <FontSelector id='default-font' label='Default Font' value={config.style.font} onChange={font => setConfig('style', 'font', font)} />
                    <HStack alignItems='center'>
                        <Typography variant='h6'>Faces</Typography>
                        <Select id='current-face' value={config.view.face} onChange={face => setConfig('view', 'face', face)}>
                            <Select.Item value='front'>Front</Select.Item>
                            <Select.Item value='back'>Back</Select.Item>
                            <Select.Item value='top'>Top</Select.Item>
                            <Select.Item value='bottom'>Bottom</Select.Item>
                            <Select.Item value='left'>Left</Select.Item>
                            <Select.Item value='right'>Right</Select.Item>
                        </Select>
                        <Show when={canCloneOpposite(config.view.face)}>
                            <Checkbox label={`Clone ${getOppositeFace(config.view.face)}`} checked={config.face[config.view.face].cloneOpposite ?? false} onChange={cloneOpposite => setConfig('face', config.view.face, { cloneOpposite })} />
                            <HelpButton>
                                <p>When <b>Clone {getOppositeFace(config.view.face)}</b> is checked, all elements of the <i>{getOppositeFace(config.view.face)}</i> face will be used for this face.</p>
                            </HelpButton>
                        </Show>
                    </HStack>
                    <Switch>
                        <For each={faces}>
                            {face => <Match when={config.view.face == face}>
                                <VStack>
                                    <HStack alignItems='center'>
                                        <Typography variant='button'>Use...</Typography>
                                        <Checkbox label='Label' checked={config.face[face].useLabel} onChange={useLabel => setConfig('face', face, { useLabel })} />
                                        <Checkbox label='Font' disabled={!config.face[face].useLabel} checked={!config.face[face].useDefaultFont} onChange={checked => setConfig('face', face, { useDefaultFont: !checked })} />
                                        <Checkbox label='Image' checked={config.face[face].useImage} onChange={useImage => setConfig('face', face, { useImage })} />
                                        <HelpButton>
                                            <p>When <b>Label</b> is checked, this face will have a label. If no label text is provided, deck title <i>{config.style.title}</i> will be used.</p>
                                            <p>When <b>Font</b> is checked, this face's label will use the selected font styling. Otherwise, the deck's default font will be used.</p>
                                            <p>When <b>Image</b> is checked, this face may use the selected image file. <Show when={canCloneOpposite(face)}>If no image is selected, the <i>{getOppositeFace(face)}</i> image will be used.</Show></p>
                                        </HelpButton>
                                    </HStack>
                                    <TextInput id={`face-${face}-text`} label='Label' disabled={!config.face[face].useLabel} sx={{ width: '100%' }} placeholder={config.style.title} value={config.face[face].label} onChange={text => setConfig('face', face, { label: text })} />
                                    <FontSelector id={`face-${face}-font`} label='Font' disabled={config.face[face].useDefaultFont} value={config.face[face].font} onChange={font => setConfig('face', face, 'font', font)} />
                                    <HStack>
                                        <ImageSelect id={`face-${face}-image`} disabled={!config.face[face].useImage} label='Select Image' dimensions={getFaceDimensionsPixels(face)} blob={blobCache[face]} cropData={config.face[face].crop} onChange={result => setFaceImage(face, result)} />
                                        <NumberInput id={`face-${face}-feather`} disabled={!blobCache[face] || !config.face[face].useImage} label='Feather' units='px' min={0} value={config.face[face].feather} onChange={feather => setConfig('face', face, { feather })} />
                                        <NumberInput id={`face-${face}-opacity`} disabled={!blobCache[face] || !config.face[face].useImage} label='Opacity' units='%' integer min={0} max={100} step={1} value={Math.round(config.face[face].opacity * 100)} onChange={opacity => setConfig('face', face, { opacity: opacity / 100.0 })}/>
                                    </HStack>
                                </VStack>
                            </Match>}
                        </For>
                    </Switch>
                </VStack>
                <VStack alignItems='flex-start' width='100%'>
                    <HStack alignItems='center'>
                        <Typography variant='h6'>Preview</Typography>
                        <Select id='preview' width='10em' value={config.view.preview} onChange={preview => setConfig('view', { preview })}>
                            <Select.Item value='canvas'>Canvas</Select.Item>
                            <Select.Item value='canvas-pretty'>Canvas (Pretty)</Select.Item>
                            <Select.Item value='pdf'>Live PDF</Select.Item>
                        </Select>
                        <Button.Group>
                            <Button onClick={() => openPdf()} variant='contained'>Open PDF</Button>
                            <Button onClick={() => savePdf()} variant='contained'><DownloadIcon/></Button>
                        </Button.Group>
                        <Button.Group>
                            <ResetButton onReset={resetConfig}/>
                        </Button.Group>
                        <a class="hidden" ref={pdfLinkRef} style={{ display: 'none' }}></a>
                    </HStack>
                    <Switch fallback={<>
                        <canvas width='800' height='600' ref={setPreviewCanvas} style={{ border: '1px solid grey' }}></canvas>
                    </>}>
                        <Match when={config.view.preview == 'pdf'}>
                            <object ref={setPreviewObject} type='application/pdf' width='800' height='600'><Typography>Loading...</Typography></object>
                        </Match>
                    </Switch>
                    <Typography>Made with <Link href="https://www.solidjs.com/">Solid</Link>, <Link href="https://mui.com/core/">MUI</Link>, <Link href="https://github.com/parallax/jsPDF">jsPDF</Link>, <Link href="https://fengyuanchen.github.io/cropperjs/">Cropper.js</Link>, and <Link href="https://github.com/xbmlz/solid-color">solid-color</Link></Typography>
                </VStack>
            </HStack>
        </VStack>
    </Show>
}
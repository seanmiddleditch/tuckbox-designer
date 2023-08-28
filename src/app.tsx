import { createEffect, Switch, Match, Show, onCleanup, batch, createSignal, For } from 'solid-js'
import { createStore } from 'solid-js/store'
import { paperSize, PaperFormats, getPaperSizes, getPaperSize } from './paper'
import { convert, Units } from './convert'
import { FaceOptions, GenerateMode, GenerateSide, generate, getFaceDimensions } from './generate'
import { createLocalStore, createSessionStore } from './local'
import { colorToRgb } from './color'
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
import { Typography, Link, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@suid/material'
import { BugReportRounded as BugIcon, CopyrightRounded as CopyrightIcon, Download as DownloadIcon } from '@suid/icons-material'
import { Font, Size, Face, RGB, Faces, CropData, BoxStyle, Background } from './types'
import patchJsPdf from './jspdf-patch'

import '@suid/material'
import { renderToBackground, featherImage, loadBlobToCanvas, cropImage } from './image'

interface Config {
    units: Units
    page: PaperFormats
    style: {
        title: string
        style: BoxStyle
        twoSided: boolean
    }
    background: Background
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
    safeArea: number
    margin: number
    thickness: number
}

interface View {
    preview: 'canvas' | 'canvas-pretty' | 'pdf'
    face: Faces
}

interface ImageCache<T> {
    background?: T
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

const defaultCropData: CropData = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotate: 0,
    scaleX: 1,
    scaleY: 1,
}

const defaultFace: Face = {
    label: '',
    font: { ...defaultFont },
    useLabel: true,
    useImage: false,
    cloneOpposite: false,
    crop: { ...defaultCropData },
    feather: 0,
    opacity: 1.0,
}

const defualtConfig: Config = {
    units: 'in',
    page: 'letter',
    style: {
        title: 'Sample',
        style: 'default',
        twoSided: false,
    },
    background: {
        color: { r: 255, g: 255, b: 255 },
        crop: { ...defaultCropData },
        opacity: 1.0,
        tileSize: { width: 1, height: 1 }
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
    safeArea: 0.12,
    margin: 0.25,
    thickness: 0.02
}

const defaultView: View = {
    preview: 'canvas',
    face: 'front',
}

interface AppState {
    loading: boolean
}

type ImageKeys = keyof ImageCache<Blob>

const faceKeys: Faces[] = ['front', 'back', 'top', 'bottom', 'left', 'right']
const imageKeys: ImageKeys[] = ['front', 'back', 'top', 'bottom', 'left', 'right', 'background']

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

const titlecase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

interface LoadImageOptions {
    color: RGB
    feather: number
    opacity: number
}

const loadImage = (blob: Blob, crop: CropData, dims: { width: number, height: number }, options: LoadImageOptions): Promise<HTMLCanvasElement> => {
    return loadBlobToCanvas(blob)
        .then(image => cropImage(image, dims, crop))
        .then(cropped => featherImage(cropped, options.feather))
        .then(image => renderToBackground(image, options.color, options.opacity))
}

export const App = () => {
    const [config, setConfig] = createLocalStore('tuckbox-config', defualtConfig)
    const [view, setView] = createSessionStore('tuckbox-view', defaultView)
    const [state, setState] = createStore<AppState>({loading: true})
    const [imageCache, setImageCache] = createStore<ImageCache<HTMLCanvasElement>>({})
    const [blobCache, setBlobCache] = createStore<ImageCache<Blob>>({})

    const [previewCanvas, setPreviewCanvas] = createSignal<HTMLCanvasElement | undefined>(undefined)
    const [previewObject, setPreviewObject] = createSignal<HTMLObjectElement | undefined>(undefined)
        
    let pdfDataUrl = ''
    let pdfBlob: Blob|undefined = undefined
    let pdfLinkRef: HTMLAnchorElement|undefined = undefined

    const toPt = (value: number) => convert(value, config.units, 'pt')
    
    const getFaceDimensionsPixels = (face: Faces): { width: number, height: number } => {
        const size = {
            width: config.size.width,
            height: config.size.height,
            depth: config.size.depth,
        }
        const dims = getFaceDimensions(face, { size, thickness: config.thickness, safe: config.safeArea })
        return { width: convert(dims[0], config.units, 'px'), height: convert(dims[1], config.units, 'px') }
    }

    // load up the image cache
    const loadBlob = async (dir: FileSystemDirectoryHandle, key: ImageKeys): Promise<Blob|undefined> => {
        let h: FileSystemFileHandle
        try {
            h = await dir.getFileHandle(key)
        }
        catch (e) {
            if (e instanceof Error && e.name != 'NotFoundError')
                throw e
            return
        }
        return await h.getFile()
    }
    navigator.storage.getDirectory().then(dir => dir.getDirectoryHandle('images', { create: true }))
        .then(dir => Promise.all(imageKeys.map(key => loadBlob(dir, key).then(blob => setBlobCache(key, blob)))))
        .catch(err => console.error(err))
        .finally(() => setState({ loading: false }))
    
    const saveImage = (key: ImageKeys, blob: Blob) => {
        navigator.storage.getDirectory().then(dir => dir.getDirectoryHandle('images', { create: true })).then(async (dir) => {
            const handle = await dir.getFileHandle(key, { create: true })
            const writeable = await handle.createWritable()
            blob.stream().pipeTo(writeable)
        })
        .catch(err => console.error(err))
    }

    const deleteImage = (key: ImageKeys) => {
        navigator.storage.getDirectory().then(dir => dir.getDirectoryHandle('images'))
            .then(dir => dir.removeEntry(key))
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
    faceKeys.map(face => {
        createEffect(() => {
            const blob = blobCache[face]
            if (blob && config.face[face].crop) {
                // we need to read the properties themselves to be reactive,
                // and they cannot be bound for async functions
                const feather = config.face[face].feather
                const opacity = config.face[face].opacity
                const crop = { ...config.face[face].crop }
                const color = { ...config.background.color }

                return loadBlobToCanvas(blob)
                    .then(image => cropImage(image, getFaceDimensionsPixels(face), crop))
                    .then(cropped => featherImage(cropped, feather))
                    .then(image => renderToBackground(image, color, opacity))
                    .then(canvas => setImageCache(face, canvas))
            } else {
                setImageCache(face, undefined)
            }
        })
    })

    createEffect(() => {
        const blob = blobCache['background']
        if (blob) {
            // we need to read the properties themselves to be reactive,
            // and they cannot be bound for async functions
            const opacity = config.background.opacity
            const crop = { ...config.background.crop }
            const color = { ...config.background.color }
            const size = {
                width: convert(config.background.tileSize.width, config.units, 'px'),
                height: convert(config.background.tileSize.height, config.units, 'px'),
            }

            return loadBlobToCanvas(blob)
                .then(image => cropImage(image, size, crop))
                .then(image => renderToBackground(image, color, opacity))
                .then(canvas => setImageCache('background', canvas))
        }
        else {
            setImageCache('background', undefined)
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
                safe: cv(store.safeArea),
                margin: cv(store.margin),
                thickness: cv(store.thickness),
                background: {
                    ...store.background,
                    tileSize: {
                        width: cv(store.background.tileSize.width),
                        height: cv(store.background.tileSize.height),
                    }
                },
                units,
            }
        })
    }

    const renderTuckBox = (ctx: CanvasRenderingContext2D, options?: { mode?: GenerateMode, side?: GenerateSide }) => {
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
                font: config.face[face].font,
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
            background: {
                color: config.background.color,
                image: imageCache['background'],
                opacity: 1.0,
            },
            bleed: toPt(config.bleed),
            safe: toPt(config.safeArea),
            thickness: toPt(config.thickness),
            margin: toPt(config.margin),
            mode: options?.mode,
            side: options?.side,
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
        
        renderTuckBox(ctx, { mode: config.style.twoSided ? 'two-sided' : 'standard', side: 'front' })
        if (config.style.twoSided) {
            doc.addPage(config.page, 'landscape')
            renderTuckBox(ctx, { mode: 'two-sided', side: 'back' })
        }

        const bytes = doc.output('blob')
        pdfBlob = new Blob([bytes], { type: 'application/pdf' })

        URL.revokeObjectURL(pdfDataUrl)
        pdfDataUrl = URL.createObjectURL(pdfBlob)

        return { blob: pdfBlob, url: pdfDataUrl }
    }
        
    // Update previews
    createEffect(() => {
        const pageSize = paperSize({ 'format': config.page, 'units': config.units, 'orientation': 'landscape' })

        if (view.preview == 'pdf') {
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

            renderTuckBox(ctx, { mode: view.preview == 'canvas-pretty' ? 'pretty' : config.style.twoSided ? 'two-sided' : 'standard' })
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
                setConfig('face', face, 'crop', defaultCropData)
            }
        })
    }

    const setBackgroundImage = (result: ImageSelectResult) => {
        batch(() => {
            if (result) {
                if (result.blob !== blobCache['background']) {
                    setBlobCache('background', result.blob)
                    saveImage('background', result.blob)
                }
                setConfig('background', 'crop', {
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
                setBlobCache('background', undefined)
                deleteImage('background')
                setConfig('background', 'crop', defaultCropData)
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
                    <Typography variant='h6'>Page &amp; Paper</Typography>
                    <HStack alignItems='center'>
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
                        <Checkbox label='Two-Sided' checked={config.style.twoSided} onChange={twoSided => setConfig('style', { twoSided })} />
                    </HStack>
                    <HStack alignItems='center'>
                        <NumberInput id='bleed' label='Bleed' units={config.units} min={0} value={config.bleed} onChange={bleed => setConfig({ bleed })} />
                        <NumberInput id='safe-area' label='Safe Area' units={config.units} min={0} value={config.safeArea} onChange={safeArea => setConfig({ safeArea })} />
                        <NumberInput id='margin' label='Margin' units={config.units} min={0} value={config.margin} onChange={margin => setConfig({ margin })} />
                        <NumberInput id='thickness' label='Thickness' units={config.units} min={0} value={config.thickness} onChange={thickness => setConfig({ thickness })} />
                    </HStack>
                    <Typography variant='h6'>Deck Size</Typography>
                    <HStack>
                        <NumberInput id="width" value={config.size.width} units={config.units} min={0} onChange={value => setConfig('size', 'width', value)} label='Width' />
                        <NumberInput id="height" value={config.size.height} units={config.units} min={0} onChange={value => setConfig('size', 'height', value)} label='Height' />
                        <NumberInput id="depth" value={config.size.depth} units={config.units} min={0} onChange={value => setConfig('size', 'depth', value)} label='Depth' />
                    </HStack>
                    <Typography variant='h6'>Box Styling</Typography>
                    <TextInput id='title' label='Deck Name' sx={{ width: '100%' }} value={config.style.title} onChange={title => setConfig('style', { title })} />
                    <HStack alignItems='center'>
                        <ColorPicker id='box-color' label='Color' color={config.background.color} onChange={color => setConfig('background', { color })} />
                        <Select id='box-style' label='Box Style' value={config.style.style} onChange={style => setConfig('style', { style })}>
                            <Select.Item value='default'>Glued Bottom</Select.Item>
                            <Select.Item value='double-tuck'>Tucked Bottom</Select.Item>
                        </Select>
                    </HStack>
                    {/* 
                    <Typography variant='h6'>Box Background</Typography>
                    <HStack alignItems='center'>
                        Disable background image for now -- https://github.com/seanmiddleditch/tuckbox-designer/issues/26
                        <NumberInput id="background-width" value={config.background.tileSize.width} units={config.units} min={0} onChange={value => setConfig('background', 'tileSize', 'width', value)} label='Width' />
                        <NumberInput id="background-height" value={config.background.tileSize.height} units={config.units} min={0} onChange={value => setConfig('background', 'tileSize', 'height', value)} label='Height' />
                        <NumberInput id="background-opacity" disabled={!blobCache['background']} label='Opacity' units='%' integer min={0} max={100} step={1} value={Math.round(config.background.opacity * 100)} onChange={opacity => setConfig('background', { opacity: opacity / 100.0 })} />
                        <ImageSelect id="background-image" label='Select Image' blob={blobCache['background']} cropData={config.background.crop} onChange={result => setBackgroundImage(result)} />
                    </HStack>
                    */}
                    <HStack alignItems='center'>
                        <Typography variant='h6'>Face Styling</Typography>
                        <Select id='current-face' value={view.face} onChange={face => setView({ face })}>
                            <Select.Item value='front'>Front</Select.Item>
                            <Select.Item value='back'>Back</Select.Item>
                            <Select.Item value='top'>Top</Select.Item>
                            <Select.Item value='bottom'>Bottom</Select.Item>
                            <Select.Item value='left'>Left</Select.Item>
                            <Select.Item value='right'>Right</Select.Item>
                        </Select>
                        <Show when={canCloneOpposite(view.face)}>
                            <Checkbox
                                label={`Clone ${titlecase(getOppositeFace(view.face))} Face`}
                                checked={config.face[view.face].cloneOpposite ?? false}
                                onChange={cloneOpposite => setConfig('face', view.face, { cloneOpposite })} />
                        </Show>
                    </HStack>
                    <Switch>
                        <For each={faceKeys}>
                            {face => <Match when={view.face == face}>
                                <Show when={!canCloneOpposite(face) || !config.face[face].cloneOpposite}>
                                    <VStack>
                                        <HStack alignItems='center'>
                                            <Typography variant='button'>Use...</Typography>
                                            <Checkbox label='Label' checked={config.face[face].useLabel} onChange={useLabel => setConfig('face', face, { useLabel })} />
                                            <Checkbox label='Image' checked={config.face[face].useImage} onChange={useImage => setConfig('face', face, { useImage })} />
                                        </HStack>
                                        <TextInput id={`face-${face}-text`} label='Label' disabled={!config.face[face].useLabel} multiline sx={{ width: '100%' }} placeholder={config.style.title} value={config.face[face].label} onChange={text => setConfig('face', face, { label: text })} />
                                        <FontSelector id={`face-${face}-font`} label='Font' disabled={!config.face[face].useLabel} value={config.face[face].font} onChange={font => setConfig('face', face, 'font', font)} />
                                        <HStack alignItems='center'>
                                            <ImageSelect id={`face-${face}-image`} disabled={!config.face[face].useImage} label='Select Image' size={getFaceDimensionsPixels(face)} blob={blobCache[face]} cropData={config.face[face].crop} onChange={result => setFaceImage(face, result)} />
                                            <NumberInput id={`face-${face}-feather`} disabled={!blobCache[face] || !config.face[face].useImage} label='Feather' units='px' min={0} value={config.face[face].feather} onChange={feather => setConfig('face', face, { feather })} />
                                            <NumberInput id={`face-${face}-opacity`} disabled={!blobCache[face] || !config.face[face].useImage} label='Opacity' units='%' integer min={0} max={100} step={1} value={Math.round(config.face[face].opacity * 100)} onChange={opacity => setConfig('face', face, { opacity: opacity / 100.0 })} />
                                        </HStack>
                                    </VStack>
                                </Show>
                            </Match>}
                        </For>
                    </Switch>
                </VStack>
                <VStack alignItems='flex-start' width='100%'>
                    <HStack alignItems='center'>
                        <Typography variant='h6'>Preview</Typography>
                        <Select id='preview' width='10em' value={view.preview} onChange={preview => setView({ preview })}>
                            <Select.Item value='canvas'>Quick</Select.Item>
                            <Select.Item value='canvas-pretty'>Pretty</Select.Item>
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
                        <Match when={view.preview == 'pdf'}>
                            <object ref={setPreviewObject} type='application/pdf' width='800' height='600'><Typography>Loading...</Typography></object>
                        </Match>
                    </Switch>
                    <Typography>Made with <Link href="https://www.solidjs.com/">Solid</Link>, <Link href="https://mui.com/core/">MUI</Link>, <Link href="https://github.com/parallax/jsPDF">jsPDF</Link>, <Link href="https://fengyuanchen.github.io/cropperjs/">Cropper.js</Link>, and <Link href="https://github.com/xbmlz/solid-color">solid-color</Link></Typography>
                </VStack>
            </HStack>
        </VStack>
    </Show>
}
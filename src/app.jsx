import { createEffect, createSignal } from 'solid-js'
import { paperSize } from './paper'
import { convert } from './convert'
import { generate } from './generate'
import { createLocalStore } from './local'
import PDFDocument from 'jspdf'
import { Box, Modal, Button, ButtonGroup, TextField, InputAdornment } from '@suid/material'
import { HStack, VStack } from './components/stack'
import { Select } from './components/select'
import { Toggle } from './components/toggle'
import { ColorPicker } from './components/color-picker'
import { createTheme, ThemeProvider } from '@suid/material/styles'
import { Download as DownloadIcon } from '@suid/icons-material'
import patchJsPdf from './jspdf-patch'

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
    size: {
        width: 2.25,
        height: 3.5,
        depth: 1.0
    },
}

export const App = () => {
    const theme = createTheme()
    const [config, setConfig] = createLocalStore('tuckbox-config', defualtConfig)
    const [preview, setPreview] = createSignal('canvas')

    let page_details = undefined
    let canvas = undefined
    let link = undefined
    let data_url = undefined
    let pdf_preview = undefined

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

        page_details.textContent = `${config.page} ${pageSize[0]}x${pageSize[1]}${config.units}`

        canvas.width = convert(pageSize[0], config.units, 'pt')
        canvas.height = convert(pageSize[1], config.units, 'pt')

        const size = {
            width: convert(config.size.width, config.units, 'pt'),
            height: convert(config.size.height, config.units, 'pt'),
            depth: convert(config.size.depth, config.units, 'pt')
        }

        const ctx = canvas.getContext("2d")
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        generate(ctx, size, config.title, config.color, fontName())
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

    const makeDataUrl = blob => {
        if (data_url) {
            URL.revokeObjectURL(data_url)
            data_url = undefined
        }

        data_url = URL.createObjectURL(blob)
        return data_url
    }

    createEffect(() => {
        if (preview() != 'pdf')
            return
        
        const blob = generatePdfBlob()
        const url = makeDataUrl(blob)

        pdf_preview.src = url
    })

    const savePdf = () => {
        const blob = generatePdfBlob()
        const url = makeDataUrl(blob)

        link.href = url
        link.download = 'tuckbox.pdf'
        link.click()
    }

    const openPdf = () => {
        const blob = generatePdfBlob()
        const url = makeDataUrl(blob)

        window.open(url, 'pdf')
    }
    
    const SizeInput = (props) => 
        <TextField id={props.name} name={props.name} size='small' variant='outlined' sx={{width: '14ch'}}
            value={props.value}
            label={props.label}
            onChange={e => props.onChange(e.target.value)}
            InputProps={{
                endAdornment: () => <InputAdornment position='end'>{props.units ?? config.units}</InputAdornment>,
            }}/>

    return <ThemeProvider theme={theme}>
        <HStack spacing={8} width='100%' height='100%'>
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
                        <SizeInput name="width" value={config.size.width} onChange={value => setConfig('size', 'width', value)} label='Width' />
                        <SizeInput name="height" value={config.size.height} onChange={value => setConfig('size', 'height', value)} label='Height' />
                        <SizeInput name="depth" value={config.size.depth} onChange={value => setConfig('size', 'depth', value)} label='Depth' />
                    </HStack>
                </VStack>
                <h2>Design</h2>
                <VStack alignItems='flex-start'>
                    <ColorPicker label='Box Color' color={config.color} onChange={value => setConfig('color', value)}/>
                </VStack>
                <h2>Title & Font</h2>
                <VStack alignItems='flex-start'>
                    <TextField id="title" name="title" size='small' label='Title' variant='outlined' sx={{ width: '100%' }} value={config.title} onChange={e => setConfig('title', e.target.value)} />
                    <HStack>
                        <Select label='Font Family' width='14em' value={config.font.family} onChange={value => setConfig('font', 'family', value)}>
                            <Select.Item value='Courier'>Courier</Select.Item>
                            <Select.Item value='Helvetica'>Helvetica</Select.Item>
                            <Select.Item value='Times-Roman'>Times Roman</Select.Item>
                        </Select>
                        <SizeInput label='Font Size' size='small' variant='outlined' units='pt' value={config.font.size} onChange={value => setConfig('font', 'size', value)} />
                        <TextField label='Font Weight' size='small' variant='outlined' sx={{ width: '14ch' }} value={config.font.weight} onChange={(e, value) => setConfig('font', 'weight', value)} />
                    </HStack>
                </VStack>
                <h2>Download</h2>
                <VStack>
                    <Toggle.Group exclusive size='small' value={preview()} onChange={value => setPreview(value)}>
                        <Toggle.Button value='canvas'>Canvas</Toggle.Button>
                        <Toggle.Button value='pdf'>PDF</Toggle.Button>
                    </Toggle.Group>
                    <ButtonGroup>
                        <Button onClick={() => openPdf()} variant='contained'>Open PDF</Button>
                        <Button onClick={() => savePdf()} size='small' variant='contained'><DownloadIcon title='Download PDF'/></Button>
                    </ButtonGroup>
                    <ButtonGroup>
                        <Button variant='outlined' color='error' onClick={resetConfig}>Reset</Button>
                    </ButtonGroup>
                </VStack>
                <a class="hidden" ref={link} style={{ display: 'none' }}></a>
            </VStack>
            <VStack width='100%' alignItems='flex-start'>
                <h2>Preview</h2>
                <Switch fallback={<>
                    <canvas width="800" height="600" ref={canvas} style={{ border: '1px solid grey' }}></canvas>
                </>}>
                    <Match when={preview() == 'pdf'}>
                        <iframe width="800" height="600" ref={pdf_preview} style={{ border: 'none', width: '100%' }}></iframe>
                    </Match>
                </Switch>
                <div ref={page_details}></div>
            </VStack>
        </HStack>
    </ThemeProvider>
}
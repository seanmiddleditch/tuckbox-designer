import 'cropperjs/dist/cropper.css'

import { Button, ButtonGroup, Modal, Box } from '@suid/material'
import { createEffect, onCleanup, Component, Show, createSignal, batch } from 'solid-js'
import Cropper from 'cropperjs'
import { HStack, VStack } from './stack'
import { NumberInput } from './number-input'
import { createStore, unwrap } from 'solid-js/store'
import { Rotate90DegreesCwRounded, Rotate90DegreesCcwRounded, SwapHorizRounded, SwapVertRounded, UploadFileRounded, ClearRounded, CheckRounded } from '@suid/icons-material'

interface ImageSelectProps {
    id: string
    dimensions: [number, number]
    label: string
    value?: HTMLCanvasElement
    accept?: string
    onChange: (value?: { canvas: HTMLCanvasElement, cropData: Cropper.Data }) => void
}

interface ImageSelectStore {
    open: boolean
    image?: HTMLImageElement
    file?: Blob
    size: { width: number, height: number }
    scale: { x: number, y: number }
    cropper?: Cropper
}

export const ImageSelect: Component<ImageSelectProps> = props => {
    const [store, setStore] = createStore<ImageSelectStore>({
        open: false,
        size: { width: 0, height: 0 },
        scale: { x: 1, y: 1 }
    })

    var fileRef: HTMLInputElement | undefined = undefined
    var previewImageRef: HTMLImageElement | undefined = undefined
    
    const aspectRatio = props.dimensions[1] != 0 ? props.dimensions[0] / props.dimensions[1] : 4 / 3

    onCleanup(() => {
        if (store.cropper)
            store.cropper.destroy()
    })

    const updateCropper = (blob: Blob, image: HTMLImageElement) => {
        if (!blob || !image)
            return
        
        const url = URL.createObjectURL(blob)
        image.onload = () => {
            if (!store.cropper) {
                setStore({
                    cropper: new Cropper(image, {
                        aspectRatio,
                        autoCropArea: 1,
                        crop(event) {
                            setStore('size', { width: Math.round(event.detail.width), height: Math.round(event.detail.height) })
                        }
                    })
                })
            }
            else {
                store.cropper.replace(url)
            }
            URL.revokeObjectURL(url)
        }
        image.src = url
    }
    
    const onSelectFile = (files: FileList | null) => {
        const file = files?.length ? files[0] : undefined
        if (file) {
            batch(() => {
                setStore({ file, open: true })
                if (store.image)
                    updateCropper(file, store.image)
            })
        }
    }

    const onBindImage = (image: HTMLImageElement) => {
        batch(() => {
            setStore({ image })
            if (store.file)
                updateCropper(store.file, image)
        })
    }

    createEffect(() => {
        if (store.cropper && store.file) {
            store.cropper.scaleX(store.scale.x)
            store.cropper.scaleY(store.scale.y)
        }
    })

    createEffect(() => {
        if (!previewImageRef)
            return

        if (!props.value) {
            previewImageRef.src = ''
            return
        }

        props.value.toBlob(blob => {
            if (!blob || !previewImageRef)
                return

            const url = URL.createObjectURL(blob)
            previewImageRef.onload = () => URL.revokeObjectURL(url)
            previewImageRef.src = url
        })
    })

    const closeModal = () => {
        if (store.cropper)
            store.cropper.destroy()
        setStore({ image: undefined, cropper: undefined })
    }

    const onFinishCrop = () => batch(() => {
        if (store.cropper) {
            const canvas = store.cropper.getCroppedCanvas({
                width: props.dimensions[0] || 400,
                height: props.dimensions[1] || 300,
                imageSmoothingEnabled: false,
                imageSmoothingQuality: 'high'
            })
            const cropData = store.cropper.getData(true)
          
            try {
                props.onChange({ canvas, cropData })
            }
            catch (e) {
                console.error(e)
            }
        }

        batch(() => {
            setStore({ open: false, file: undefined })
            closeModal()
        })
    })

    const onClear = () => {
        batch(() => {
            setStore({ open: false, file: undefined })
            closeModal()
        })

        props.onChange(undefined)
    }

    const onPreviewButtonClick = () => {
        if (props.value)
            props.value.toBlob(blob => setStore({ file: blob ?? undefined, open: !!blob }))
        else
            fileRef!.click()
    }

    return <>
        <input ref={fileRef} type='file' style='display: none' onChange={e => onSelectFile(e.target.files)} accept={props.accept ?? 'image/*'} />
        <ButtonGroup>
            <Button size='small' variant='outlined' onClick={onPreviewButtonClick}>
                <Show when={props.value} fallback={props.label ?? 'Image'}>
                    <div style='max-width: 64px; height: 64px; overflow: hidden; display: flex; justify-content: center'>
                        <img ref={previewImageRef} height="64" />
                    </div>
                </Show>
            </Button>
        </ButtonGroup>
        <Modal open={store.open} onClose={onFinishCrop}>
            <Box sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                bgcolor: 'background.paper',
                border: "2px solid #000",
                boxShadow: "24px",
                p: 4,
                maxWidth: '50%'
            }}>
                <HStack>
                    <VStack alignItems='center'>
                        <img ref={onBindImage} style='width: 100%; max-height: 600px'></img>
                        <HStack>
                            <ButtonGroup>
                                <Button disabled={!store.cropper} onClick={() => store.cropper?.rotate(+90)}><Rotate90DegreesCwRounded/></Button>
                                <Button disabled={!store.cropper} onClick={() => store.cropper?.rotate(-90)}><Rotate90DegreesCcwRounded/></Button>
                            </ButtonGroup>
                            <ButtonGroup>
                                <Button disabled={!store.cropper} onClick={() => setStore('scale', 'x', store.scale.x * -1)}><SwapHorizRounded/></Button>
                                <Button disabled={!store.cropper} onClick={() => setStore('scale', 'y', store.scale.y * -1)}><SwapVertRounded/></Button>
                            </ButtonGroup>
                            <ButtonGroup>
                                <Button onClick={onClear}><ClearRounded/></Button>
                            </ButtonGroup>
                            <ButtonGroup>
                                <Button disabled={!store.cropper} onClick={onFinishCrop}><CheckRounded/></Button>
                            </ButtonGroup>
                        </HStack>
                    </VStack>
                    <VStack>
                        <NumberInput id='img-width' label='Width' units='px' disabled value={store.size.width} onChange={value => setStore('size', 'width', value)} />
                        <NumberInput id='img-height' label='Height' units='px' disabled value={store.size.height} onChange={value => setStore('size', 'height', value)} />
                    </VStack>
                </HStack>
            </Box>
        </Modal>
    </>
}
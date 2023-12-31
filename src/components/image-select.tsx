import 'cropperjs/dist/cropper.css'

import { Button, ButtonGroup, Modal, Box } from '@suid/material'
import { createEffect, onCleanup, Component, Show, createSignal, batch, untrack } from 'solid-js'
import Cropper from 'cropperjs'
import { HStack, VStack } from './stack'
import { NumberInput } from './number-input'
import { createStore, unwrap } from 'solid-js/store'
import { Rotate90DegreesCwRounded, Rotate90DegreesCcwRounded, SwapHorizRounded, SwapVertRounded, UploadFileRounded, ClearRounded, CheckRounded } from '@suid/icons-material'
import { CropData } from '../types'
import { preview } from 'vite'

export type ImageSelectResult = { canvas: HTMLCanvasElement, blob: Blob, cropData: Cropper.Data } | undefined

interface ImageSelectProps {
    id: string
    size?: { width: number, height: number }
    disabled?: boolean
    label: string
    blob?: Blob
    cropData?: CropData
    accept?: string
    onChange: (value: ImageSelectResult) => void
}

interface ImageSelectStore {
    open: boolean
    image?: HTMLImageElement
    file?: Blob
    cropData?: CropData
    cropState?: CropData
    cropper?: Cropper
}

export const ImageSelect: Component<ImageSelectProps> = props => {
    const [store, setStore] = createStore<ImageSelectStore>({ open: false })
    const [previewImage, setPreviewImage] = createSignal<HTMLImageElement|undefined>(undefined)

    let fileRef: HTMLInputElement | undefined = undefined
    
    const aspectRatio = props.size ? (props.size.height != 0 ? props.size.width / props.size.height : 4 / 3) : undefined

    onCleanup(() => {
        if (store.cropper)
            store.cropper.destroy()
    })

    const updateCropper = (blob: Blob, image: HTMLImageElement) => {
        if (!blob || !image)
            return
        
        untrack(() => {
            const url = URL.createObjectURL(blob)
            image.onload = () => {
                if (!store.cropper) {
                    const cropper = new Cropper(image, {
                        aspectRatio,
                        autoCropArea: 1,
                        data: unwrap(store.cropData),
                        crop(event) {
                            setStore('cropState', event.detail)
                        }
                    })
                    setStore({ cropper })
                }
                else {
                    store.cropper.replace(url)
                }
                URL.revokeObjectURL(url)
            }
            image.onerror = e => {
                console.error('Failed to load ', url)
                setStore({ open: false })
            }
            image.src = url
        })
    }
    
    const onSelectFile = (files: FileList | null) => {
        const file = files?.length ? files[0] : undefined
        if (file) {
            batch(() => {
                setStore({ file, cropData: undefined, open: true })
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
        const img = previewImage()
        if (!img)
            return

        if (!props.blob) {
            img.src = ''
            return
        }

        const url = URL.createObjectURL(props.blob)
        img.onload = () => URL.revokeObjectURL(url)
        img.src = url
    })

    const closeModal = () => {
        if (store.cropper)
            store.cropper.destroy()
        setStore({ image: undefined, cropper: undefined })
    }

    const onFinishCrop = () => batch(() => {
        if (store.cropper && store.file) {
            const canvas = store.cropper.getCroppedCanvas({
                width: props.size?.width,
                height: props.size?.height,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            })
            const cropData = store.cropper.getData(true)
          
            try {
                props.onChange({ canvas, blob: store.file, cropData })
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
        if (props.blob)
            setStore({ file: props.blob, cropData: props.cropData, open: true })
        else
            fileRef!.click()
    }

    return <>
        <input ref={fileRef} type='file' style='display: none' disabled={props.disabled} onChange={e => onSelectFile(e.target.files)} accept={props.accept ?? 'image/*'} />
        <ButtonGroup>
            <Button size='small' variant='outlined' disabled={props.disabled} onClick={onPreviewButtonClick}>
                <Show when={props.blob} fallback={props.label ?? 'Image'}>
                    <div style='width: 2.5em; height: 2.5em; overflow: hidden; display: flex; justify-content: center'>
                        <img ref={setPreviewImage} style={ (previewImage()?.naturalWidth ?? 0) > (previewImage()?.naturalHeight ?? 0) ? 'width: 100%' : 'height: 100%' } />
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
                                <Button disabled={!store.cropper} onClick={() => store.cropper?.scaleX((store.cropState?.scaleX ?? 1) * -1)}><SwapHorizRounded /></Button>
                                <Button disabled={!store.cropper} onClick={() => store.cropper?.scaleY((store.cropState?.scaleY ?? 1) * -1)}><SwapVertRounded/></Button>
                            </ButtonGroup>
                            <ButtonGroup>
                                <Button onClick={onClear}><ClearRounded/> Clear</Button>
                            </ButtonGroup>
                            <ButtonGroup>
                                <Button disabled={!store.cropper} onClick={onFinishCrop}><CheckRounded/> Accept</Button>
                            </ButtonGroup>
                        </HStack>
                    </VStack>
                    <VStack>
                        <NumberInput id='img-width' label='Width' units='px' disabled value={Math.round(store.cropState?.width ?? 0)}/>
                        <NumberInput id='img-height' label='Height' units='px' disabled value={Math.round(store.cropState?.height ?? 0)} />
                    </VStack>
                </HStack>
            </Box>
        </Modal>
    </>
}
import 'cropperjs/dist/cropper.css'

import { Button, ButtonGroup, Modal, Box } from '@suid/material'
import { createSignal, createEffect, onCleanup, Component } from 'solid-js'
import Cropper from 'cropperjs'
import { HStack, VStack } from './stack'
import { NumberInput } from './number-input'
import { createStore } from 'solid-js/store'
import { Rotate90DegreesCwRounded, Rotate90DegreesCcwRounded, SwapHorizRounded, SwapVertRounded } from '@suid/icons-material'

interface ImageSelectProps {
    id: string
    dimensions: [number, number]
    label: string
    accept?: string
    onChange: (value: HTMLCanvasElement) => void
}

interface ImageSelectStore {
    open: boolean
    cropper?: Cropper
    file?: File
    img?: HTMLImageElement
    size: { width: number, height: number }
    scale: { x: number, y: number }
}

export const ImageSelect: Component<ImageSelectProps> = props => {
    const [store, setStore] = createStore<ImageSelectStore>({
        open: false,
        size: { width: 0, height: 0 },
        scale: { x: 1, y: 1 }
    })

    var fileRef: HTMLInputElement | undefined = undefined
    
    const aspectRatio = props.dimensions[1] != 0 ? props.dimensions[0] / props.dimensions[1] : 4 / 3

    onCleanup(() => {
        if (store.cropper)
            store.cropper.destroy()
    })
    
    const onSelectImage = (file: File) => {
        setStore({ file, open: true })
    }

    const onCrop = () => {
        if (store.cropper) {
            const data = store.cropper.getImageData()
            console.log(data)
            setStore({ size: { width: Math.round(data.width), height: Math.round(data.height) }})
        }
    }

    createEffect(() => {
        if (!store.file)
            return

        if (!store.img)
            return

        const img = store.img
        img.onload = () => {
            let cropper = store.cropper
            if (!cropper)
                cropper = new Cropper(img, { aspectRatio, dragMode: 'move' })
            else
                cropper.replace(img.src)

            img.removeEventListener('crop', onCrop)
            img.addEventListener('crop', onCrop)
    
            setStore({ cropper })
            URL.revokeObjectURL(img.src)
        }
        img.src = URL.createObjectURL(store.file)
    })

    createEffect(() => {
        if (store.cropper) {
            store.cropper.scaleX(store.scale.x)
            store.cropper.scaleY(store.scale.y)
        }
    })

    const onFinishCrop = () => {
        const cropper = store.cropper
        if (!cropper)
            return

        const image = cropper.getCroppedCanvas({
            maxWidth: props.dimensions[0] || 400,
            maxHeight: props.dimensions[1] || 300,
        })
        props.onChange(image)

        cropper.destroy()
        setStore({ open: false, file: undefined, cropper: undefined })
    }

    return <>
        <input ref={fileRef} type='file' style='display: none' onChange={e => onSelectImage(e.target.files![0])} accept={props.accept ?? 'image/*'} />
        <ButtonGroup>
            <Button size='small' variant='contained' onClick={e => fileRef!.click()}>{props.label ?? 'Image'}</Button>
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
            }}>
                <HStack>
                    <VStack alignItems='center'>
                        <img ref={img => setStore({ img })} style={{ 'height': '600px', 'min-width': '600px' }}></img>
                        <HStack>
                            <ButtonGroup>
                                <Button onClick={() => store.cropper?.rotate(+90)}><Rotate90DegreesCwRounded/></Button>
                                <Button onClick={() => store.cropper?.rotate(-90)}><Rotate90DegreesCcwRounded/></Button>
                            </ButtonGroup>
                            <ButtonGroup>
                                <Button onClick={() => setStore('scale', 'x', store.scale.x * -1)}><SwapHorizRounded/></Button>
                                <Button onClick={() => setStore('scale', 'y', store.scale.y * -1)}><SwapVertRounded/></Button>
                            </ButtonGroup>
                        </HStack>
                    </VStack>
                    <VStack>
                        <h2>Source</h2>
                        <NumberInput id='img-width' label='Width' units='px' disabled value={store.size.width} onChange={value => setStore('size', 'width', value)} />
                        <NumberInput id='img-height' label='Height' units='px' disabled value={store.size.height} onChange={value => setStore('size', 'height', value)} />
                        <h2>Actions</h2>
                    </VStack>
                </HStack>
            </Box>
        </Modal>
    </>
}
import 'cropperjs/dist/cropper.css'

import { Button, ButtonGroup, Modal, Box } from '@suid/material'
import { createSignal, createEffect, onCleanup, Component } from 'solid-js'
import Cropper from 'cropperjs'

interface ImageSelectProps {
    id: string,
    imageWidth: number,
    imageHeight: number,
    label: string,
    accept?: string,
    onChange: (value: HTMLCanvasElement) => void
}

export const ImageSelect: Component<ImageSelectProps> = props => {
    const [isCropperOpen, setCropperOpen] = createSignal(false)
    const [cropperInst, setCropperInst] = createSignal<Cropper|null>(null)
    const [imageFile, setImageFile] = createSignal<File|null>(null)

    const [imageRef, setImageRef] = (() => {
        const [ref, setRef] = createSignal<HTMLImageElement|null>(null)

        const setter = (img: HTMLImageElement) => {
            setRef(img)

            const cropper = new Cropper(img, { aspectRatio: 4 / 3, dragMode: 'move' })
            
            if (props.imageWidth !== undefined && props.imageHeight !== undefined)
                cropper.setAspectRatio(props.imageWidth / props.imageHeight)
    
            setCropperInst(cropper)
        }

        return [ref, setter]
    })()

    var fileRef: HTMLInputElement|undefined = undefined

    onCleanup(() => {
        const cropper = cropperInst()
        if (cropper)
            cropper.destroy()
    })
    
    const onSelectImage = (file: File) => {
        setImageFile(file)
        setCropperOpen(!!file)
    }

    createEffect(() => {
        const cropper = cropperInst()
        if (!cropper)
            return
        
        const file = imageFile()
        if (!file)
            return

        const img = imageRef()
        if (!img)
            return

        img.onload = () => URL.revokeObjectURL(img.src)
        img.src = URL.createObjectURL(file)

        cropper.replace(img.src)

    })

    const onFinishCrop = () => {
        const cropper = cropperInst()

        const image = cropper!.getCroppedCanvas({
            maxWidth: props.imageWidth || 400,
            maxHeight: props.imageHeight || 300,
        })
        props.onChange(image)

        setCropperOpen(false)
    }

    return <>
        <input ref={fileRef} type='file' style='display: none' onChange={e => onSelectImage(e.target.files![0])} accept={props.accept ?? 'image/*'} />
        <ButtonGroup>
            <Button size='small' variant='contained' onClick={e => fileRef!.click()}>{props.label ?? 'Image'}</Button>
        </ButtonGroup>
        <Modal open={isCropperOpen()} onClose={onFinishCrop}>
            <Box sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 800,
                    bgcolor: 'background.paper',
                    border: "2px solid #000",
                    boxShadow: "24px",
                    p: 4,
            }}>
                <img ref={setImageRef} style='position: relative; max-width: 740'></img>
            </Box>
        </Modal>
    </>
}
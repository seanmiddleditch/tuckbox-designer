import 'cropperjs/dist/cropper.css'

import { Button, ButtonGroup, Modal, Box } from '@suid/material'
import { createSignal, createEffect, onCleanup } from 'solid-js'
import Cropper from 'cropperjs'

export const ImageSelect = props => {
    const [isCropperOpen, setCropperOpen] = createSignal(false)
    const [imageFile, setImageFile] = createSignal(null)
    const [imageRef, setImageRef] = createSignal(null)

    var fileRef = undefined
    var cropper = undefined

    const onImage = file => {
        setImageFile(file)
        setCropperOpen(true)
    }

    createEffect(() => {
        const img = imageRef()
        if (!img)
            return

        const file = imageFile()
        if (file) {
            img.src = URL.createObjectURL(imageFile())
            img.onload = () => URL.revokeObjectURL(img.src)
        }

        if (file && isCropperOpen()) {
            if (!cropper)
                cropper = new Cropper(img, {aspectRatio: 4/3})
            
            console.log(props.imageWidth, props.imageHeight)
            if (props.imageWidth !== undefined && props.imageHeight !== undefined)
                cropper.setAspectRatio(props.imageWidth / props.imageHeight)
            
            cropper.replace(img.src)
        }
        else if (cropper) {
            cropper.destroy()
            cropper = undefined
        }
    })

    onCleanup(() => {
        if (cropper)
            cropper.destroy()
    })

    const finish = () => {
        if (cropper) {
            const result = cropper.getCroppedCanvas({
                maxWidth: props.imageWidth || 400,
                maxHeight: props.imageHeight || 300,
            })
            props.onChange(result)
        }
        setCropperOpen(false)
    }

    return <>
        <input ref={fileRef} type='file' style='display: none' onChange={e => onImage(e.target.files[0])} accept={props.accept ?? 'image/*'} />
        <ButtonGroup>
            <Button size='small' variant='contained' onClick={e => fileRef.click()}>{props.label ?? 'Image'}</Button>
        </ButtonGroup>
        <Modal open={isCropperOpen()} onClose={finish}>
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
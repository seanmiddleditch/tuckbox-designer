import { createEffect } from 'solid-js'
import { createStore } from 'solid-js/store'

export function createLocalStore(name: string, init: any) {
    const localState = localStorage.getItem(name)
    const [state, setState] = createStore(localState ? JSON.parse(localState) : init)

    createEffect(() => localStorage.setItem(name, JSON.stringify(state)))
    return [state, setState]
}
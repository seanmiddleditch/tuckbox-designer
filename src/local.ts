import { createEffect } from 'solid-js'
import { SetStoreFunction, createStore } from 'solid-js/store'

export function createLocalStore<T extends Object>(name: string, init: T): [T, SetStoreFunction<T>] {
    const localState = localStorage.getItem(name)
    const [state, setState] = createStore<T>(localState ? JSON.parse(localState) : init)

    createEffect(() => localStorage.setItem(name, JSON.stringify(state)))
    return [state, setState]
}
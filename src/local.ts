import { deepmergeInto } from 'deepmerge-ts'
import { createEffect } from 'solid-js'
import { SetStoreFunction, createStore } from 'solid-js/store'
import { DeepPartial } from 'ts-essentials'

export function createLocalStore<T extends Object>(name: string, init: T): [T, SetStoreFunction<T>] {
    const localStateString = localStorage.getItem(name)

    const localState: DeepPartial<T> = localStateString ? JSON.parse(localStateString) : {}
    const initialState: T = JSON.parse(JSON.stringify(init))
    deepmergeInto(initialState, localState)

    const [store, setStore] = createStore<T>(initialState)

    createEffect(() => localStorage.setItem(name, JSON.stringify(store)))
    return [store, setStore]
}

export function createSessionStore<T extends Object>(name: string, init: T): [T, SetStoreFunction<T>] {
    const sessionStateString = sessionStorage.getItem(name)

    const sessionState: DeepPartial<T> = sessionStateString ? JSON.parse(sessionStateString) : {}
    const initialState: T = JSON.parse(JSON.stringify(init))
    deepmergeInto(initialState, sessionState)

    const [store, setStore] = createStore<T>(initialState)

    createEffect(() => sessionStorage.setItem(name, JSON.stringify(store)))
    return [store, setStore]
}
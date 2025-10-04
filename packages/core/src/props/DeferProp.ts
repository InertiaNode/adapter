import type { IgnoreFirstLoad, Mergeable, PropCallback } from '../types.js'

export class DeferProp implements IgnoreFirstLoad, Mergeable {
    private callback: PropCallback
    private groupValue: string | null
    private mergeFlag = false
    private deepMergeFlag = false
    private matchOnArray: string[] = []
    private appendFlag = true
    private appendsAtPathsArray: string[] = []
    private prependsAtPathsArray: string[] = []

    constructor(callback: PropCallback, group: string | null = null) {
        this.callback = callback
        this.groupValue = group
    }

    group(): string | null {
        return this.groupValue
    }

    __invoke(): any {
        return this.callback()
    }

    merge(): this {
        this.mergeFlag = true
        return this
    }

    deepMerge(): this {
        this.deepMergeFlag = true
        return this.merge()
    }

    matchOn(matchOn: string | string[]): this {
        this.matchOnArray = Array.isArray(matchOn) ? matchOn : [matchOn]
        return this
    }

    append(path: boolean | string | string[] = true, matchOn?: string): this {
        if (typeof path === 'boolean') {
            this.appendFlag = path
        } else if (typeof path === 'string') {
            this.appendsAtPathsArray.push(path)
            if (matchOn) {
                this.matchOnArray.push(`${path}.${matchOn}`)
            }
        } else if (Array.isArray(path)) {
            path.forEach(p => this.append(p))
        }
        return this
    }

    prepend(path: boolean | string | string[] = true, matchOn?: string): this {
        if (typeof path === 'boolean') {
            this.appendFlag = !path
        } else if (typeof path === 'string') {
            this.prependsAtPathsArray.push(path)
            if (matchOn) {
                this.matchOnArray.push(`${path}.${matchOn}`)
            }
        } else if (Array.isArray(path)) {
            path.forEach(p => this.prepend(p))
        }
        return this
    }

    shouldMerge(): boolean {
        return this.mergeFlag
    }

    shouldDeepMerge(): boolean {
        return this.deepMergeFlag
    }

    matchesOn(): string[] {
        return this.matchOnArray
    }

    appendsAtRoot(): boolean {
        return this.appendFlag && this.mergesAtRoot()
    }

    prependsAtRoot(): boolean {
        return !this.appendFlag && this.mergesAtRoot()
    }

    private mergesAtRoot(): boolean {
        return this.appendsAtPathsArray.length === 0 && this.prependsAtPathsArray.length === 0
    }

    appendsAtPaths(): string[] {
        return this.appendsAtPathsArray
    }

    prependsAtPaths(): string[] {
        return this.prependsAtPathsArray
    }
}

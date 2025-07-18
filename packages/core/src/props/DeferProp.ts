import type { IgnoreFirstLoad, Mergeable, PropCallback } from '../types.js'

export class DeferProp implements IgnoreFirstLoad, Mergeable {
    private callback: PropCallback
    private groupValue: string | null
    private mergeFlag = false
    private deepMergeFlag = false
    private matchOnArray: string[] = []

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

    shouldMerge(): boolean {
        return this.mergeFlag
    }

    shouldDeepMerge(): boolean {
        return this.deepMergeFlag
    }

    matchesOn(): string[] {
        return this.matchOnArray
    }
}

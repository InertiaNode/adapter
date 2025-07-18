import type { Mergeable } from '../types.js'

export class MergeProp implements Mergeable {
    private value: any
    private mergeFlag = true
    private deepMergeFlag = false
    private matchOnArray: string[] = []

    constructor(value: any) {
        this.value = value
    }

    __invoke(): any {
        return typeof this.value === 'function' ? this.value() : this.value
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

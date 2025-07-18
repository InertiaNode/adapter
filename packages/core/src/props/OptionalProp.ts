import type { IgnoreFirstLoad, PropCallback } from '../types.js'

export class OptionalProp implements IgnoreFirstLoad {
    private callback: PropCallback

    constructor(callback: PropCallback) {
        this.callback = callback
    }

    __invoke(): any {
        return this.callback()
    }
}

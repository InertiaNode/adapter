import type { IgnoreFirstLoad, PropCallback } from '../types.js'

export class LazyProp implements IgnoreFirstLoad {
    private callback: PropCallback

    constructor(callback: PropCallback) {
        this.callback = callback
    }

    __invoke(): any {
        return this.callback()
    }
}

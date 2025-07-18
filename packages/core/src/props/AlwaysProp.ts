export class AlwaysProp {
    private value: any

    constructor(value: any) {
        this.value = value
    }

    __invoke(): any {
        return typeof this.value === 'function' ? this.value() : this.value
    }
}

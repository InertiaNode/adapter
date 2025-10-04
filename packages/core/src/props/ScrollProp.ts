export class ScrollProp {
    private wrapper?: string
    private metadata?: Record<string, any>

    constructor(wrapper?: string, metadata?: Record<string, any>) {
        this.wrapper = wrapper
        this.metadata = metadata
    }

    getWrapper(): string | undefined {
        return this.wrapper
    }

    getMetadata(): Record<string, any> | undefined {
        return this.metadata
    }

    __invoke(): any {
        return {
            wrapper: this.wrapper,
            ...this.metadata
        }
    }
}

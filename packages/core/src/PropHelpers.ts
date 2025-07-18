import { LazyProp, DeferProp, MergeProp, AlwaysProp, OptionalProp } from './props/index.js'
import type { PropCallback } from './types.js'

/**
 * Create a lazy prop that will only be resolved when needed.
 * Lazy props are ignored on the first page load.
 */
export function lazy(callback: PropCallback): LazyProp {
    return new LazyProp(callback)
}

/**
 * Create a deferred prop that will be loaded after the initial page load.
 * Deferred props can be grouped and support merging.
 */
export function defer(callback: PropCallback, group?: string): DeferProp {
    return new DeferProp(callback, group)
}

/**
 * Create a merge prop that will be merged with existing props on the client.
 * Merge props can be deep merged and support matching strategies.
 */
export function merge(value: any): MergeProp {
    return new MergeProp(value)
}

/**
 * Create an always prop that will always be included, even in partial requests.
 */
export function always(value: any): AlwaysProp {
    return new AlwaysProp(value)
}

/**
 * Create an optional prop that will only be resolved when needed.
 * Optional props are ignored on the first page load.
 */
export function optional(callback: PropCallback): OptionalProp {
    return new OptionalProp(callback)
}

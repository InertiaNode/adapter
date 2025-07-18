import { describe, it, expect } from 'vitest'
import { MergeProp } from '../props/MergeProp.js'

describe('MergeProp', () => {
    it('should store the value and be callable', () => {
        const mergeProp = new MergeProp('merge value')

        expect(mergeProp.__invoke()).toBe('merge value')
    })

    it('should handle merge functionality', () => {
        const mergeProp = new MergeProp('merge value')

        expect(mergeProp.shouldMerge()).toBe(true)
    })

    it('should handle deep merge functionality', () => {
        const mergeProp = new MergeProp('merge value').deepMerge()

        expect(mergeProp.shouldMerge()).toBe(true)
        expect(mergeProp.shouldDeepMerge()).toBe(true)
    })

    it('should handle match on functionality', () => {
        const mergeProp = new MergeProp('merge value').matchOn('id')

        expect(mergeProp.matchesOn()).toEqual(['id'])
    })

    it('should handle multiple match on values', () => {
        const mergeProp = new MergeProp('merge value').matchOn(['id', 'name'])

        expect(mergeProp.matchesOn()).toEqual(['id', 'name'])
    })

    it('should handle complex values', () => {
        const complexValue = { user: { name: 'John', age: 30 } }
        const mergeProp = new MergeProp(complexValue)

        expect(mergeProp.__invoke()).toEqual(complexValue)
    })

    it('should support method chaining', () => {
        const mergeProp = new MergeProp('value')
            .deepMerge()
            .matchOn('id')

        expect(mergeProp.shouldDeepMerge()).toBe(true)
        expect(mergeProp.matchesOn()).toEqual(['id'])
    })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fs and path modules before importing VersionDetector
const mockExistsSync = vi.hoisted(() => vi.fn())
const mockReadFileSync = vi.hoisted(() => vi.fn())
const mockJoin = vi.hoisted(() => vi.fn())

vi.mock('fs', () => ({
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    default: {
        existsSync: mockExistsSync,
        readFileSync: mockReadFileSync
    }
}))

vi.mock('path', () => ({
    join: mockJoin,
    default: {
        join: mockJoin
    }
}))

import { VersionDetector } from '../VersionDetector.js'

describe('VersionDetector', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('detectVersion', () => {
        it('should detect version from Vite manifest', () => {
            const mockManifest = {
                'resources/js/app.js': {
                    file: 'assets/app-abc123.js',
                    src: 'resources/js/app.js',
                    isEntry: true
                }
            }

            mockExistsSync
                .mockReturnValueOnce(false) // hot file doesn't exist
                .mockReturnValueOnce(true)  // vite manifest exists
            mockReadFileSync.mockReturnValue(JSON.stringify(mockManifest))
            mockJoin
                .mockReturnValueOnce('/public/hot')
                .mockReturnValueOnce('/public/build/manifest.json')

            const version = VersionDetector.detectVersion('public')

            expect(version).toBeDefined()
            expect(mockJoin).toHaveBeenCalledWith(process.cwd(), 'public', 'hot')
            expect(mockJoin).toHaveBeenCalledWith(process.cwd(), 'public', 'build', 'manifest.json')
            expect(mockExistsSync).toHaveBeenCalledWith('/public/hot')
            expect(mockExistsSync).toHaveBeenCalledWith('/public/build/manifest.json')
            expect(mockReadFileSync).toHaveBeenCalledWith('/public/build/manifest.json', 'utf8')
        })

        it('should detect version from Laravel Mix manifest', () => {
            const mockManifest = {
                '/js/app.js': '/js/app.js?id=abc123',
                '/css/app.css': '/css/app.css?id=def456'
            }

            mockExistsSync
                .mockReturnValueOnce(false) // hot file doesn't exist
                .mockReturnValueOnce(false) // vite manifest doesn't exist
                .mockReturnValueOnce(true)  // mix manifest exists
            mockReadFileSync.mockReturnValue(JSON.stringify(mockManifest))
            mockJoin
                .mockReturnValueOnce('/public/hot')
                .mockReturnValueOnce('/public/build/manifest.json')
                .mockReturnValueOnce('/public/mix-manifest.json')

            const version = VersionDetector.detectVersion('public')

            expect(version).toBeDefined()
            expect(mockJoin).toHaveBeenCalledWith(process.cwd(), 'public', 'hot')
            expect(mockJoin).toHaveBeenCalledWith(process.cwd(), 'public', 'build', 'manifest.json')
            expect(mockJoin).toHaveBeenCalledWith(process.cwd(), 'public', 'mix-manifest.json')
            expect(mockExistsSync).toHaveBeenCalledWith('/public/hot')
            expect(mockExistsSync).toHaveBeenCalledWith('/public/build/manifest.json')
            expect(mockExistsSync).toHaveBeenCalledWith('/public/mix-manifest.json')
        })

        it('should detect version from custom manifest', () => {
            const mockManifest = {
                'app.js': 'app-xyz789.js'
            }

            mockExistsSync
                .mockReturnValueOnce(false) // hot file doesn't exist
                .mockReturnValueOnce(false) // vite manifest doesn't exist
                .mockReturnValueOnce(false) // mix manifest doesn't exist
                .mockReturnValueOnce(true)  // custom manifest exists
            mockReadFileSync.mockReturnValue(JSON.stringify(mockManifest))
            mockJoin
                .mockReturnValueOnce('/public/hot')
                .mockReturnValueOnce('/public/build/manifest.json')
                .mockReturnValueOnce('/public/mix-manifest.json')
                .mockReturnValueOnce('/public/manifest.json')

            const version = VersionDetector.detectVersion('public')

            expect(version).toBeDefined()
            expect(mockJoin).toHaveBeenCalledWith(process.cwd(), 'public', 'hot')
            expect(mockJoin).toHaveBeenCalledWith(process.cwd(), 'public', 'build', 'manifest.json')
            expect(mockJoin).toHaveBeenCalledWith(process.cwd(), 'public', 'mix-manifest.json')
            expect(mockJoin).toHaveBeenCalledWith(process.cwd(), 'public', 'manifest.json')
            expect(mockExistsSync).toHaveBeenCalledWith('/public/hot')
            expect(mockExistsSync).toHaveBeenCalledWith('/public/build/manifest.json')
            expect(mockExistsSync).toHaveBeenCalledWith('/public/mix-manifest.json')
            expect(mockExistsSync).toHaveBeenCalledWith('/public/manifest.json')
        })

        it('should return null when no manifest exists', () => {
            mockExistsSync.mockReturnValue(false)
            mockJoin
                .mockReturnValueOnce('/public/hot')
                .mockReturnValueOnce('/public/build/manifest.json')
                .mockReturnValueOnce('/public/mix-manifest.json')
                .mockReturnValueOnce('/public/manifest.json')

            const version = VersionDetector.detectVersion('public')

            expect(version).toBe(null)
        })
    })

    describe('isDevelopmentMode', () => {
        it('should detect development mode when hot file exists', () => {
            mockExistsSync.mockReturnValue(true)
            mockJoin.mockReturnValue('/public/hot')

            const isDev = VersionDetector.isDevelopmentMode('public', 'hot')

            expect(isDev).toBe(true)
            expect(mockJoin).toHaveBeenCalledWith(process.cwd(), 'public', 'hot')
            expect(mockExistsSync).toHaveBeenCalledWith('/public/hot')
        })

        it('should detect production mode when hot file does not exist', () => {
            mockExistsSync.mockReturnValue(false)
            mockJoin.mockReturnValue('/public/hot')

            const isDev = VersionDetector.isDevelopmentMode('public', 'hot')

            expect(isDev).toBe(false)
            expect(mockJoin).toHaveBeenCalledWith(process.cwd(), 'public', 'hot')
            expect(mockExistsSync).toHaveBeenCalledWith('/public/hot')
        })
    })

    describe('createVersionDetector', () => {
        it('should create a version detector function', () => {
            const mockManifest = { 'app.js': 'app-123.js' }
            mockExistsSync.mockReturnValue(true)
            mockReadFileSync.mockReturnValue(JSON.stringify(mockManifest))
            mockJoin.mockReturnValue('/public/build/manifest.json')

            const detector = VersionDetector.createVersionDetector('public', {
                hotFile: 'hot',
                buildDirectory: 'build',
                manifestFilename: 'manifest.json'
            })

            expect(typeof detector).toBe('function')

            const version = detector()
            expect(version).toBeDefined()
        })
    })

    describe('with custom options', () => {
        it('should use custom Vite options', () => {
            const mockManifest = { 'app.js': 'app-456.js' }
            mockExistsSync
                .mockReturnValueOnce(false) // hot file doesn't exist
                .mockReturnValueOnce(true)  // vite manifest exists
            mockReadFileSync.mockReturnValue(JSON.stringify(mockManifest))
            mockJoin
                .mockReturnValueOnce('/custom/hot')
                .mockReturnValueOnce('/custom/build/manifest.json')

            const version = VersionDetector.detectVersion('custom', {
                hotFile: 'hot',
                buildDirectory: 'build',
                manifestFilename: 'manifest.json'
            })

            expect(version).toBeDefined()
            expect(mockJoin).toHaveBeenCalledWith(process.cwd(), 'custom', 'hot')
            expect(mockJoin).toHaveBeenCalledWith(process.cwd(), 'custom', 'build', 'manifest.json')
        })
    })
})

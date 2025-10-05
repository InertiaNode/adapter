import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ViteOptions } from './types.js';
import { Vite } from './Vite.js';

export class VersionDetector {
    /**
     * Automatically detect the current asset version based on manifest files.
     * This follows the same logic as the Laravel Inertia implementation.
     */
    static detectVersion(publicDirectory: string = 'public', viteOptions?: Partial<ViteOptions>): string | null {
        const options = { ...Vite.defaultOptions, ...(viteOptions || {}) };

        // Check if we're in development mode (hot file exists)
        const hotFilePath = path.join(process.cwd(), publicDirectory, options.hotFile);
        const isDevelopment = fs.existsSync(hotFilePath);

        if (isDevelopment) {
            // In development mode, use the hot file content as version
            // This ensures version changes when the dev server restarts
            try {
                const hotFileContent = fs.readFileSync(hotFilePath, 'utf8');
                return this.hashContent(hotFileContent);
            } catch (error) {
                console.warn(`Failed to read hot file ${hotFilePath}:`, error);
                // Fallback to timestamp-based version for development
                return this.hashContent(Date.now().toString());
            }
        }

        // Production mode - check manifest files
        // Check for Vite manifest first (most common)
        const viteManifestPath = path.join(process.cwd(), publicDirectory, options.buildDirectory, options.manifestFilename);
        if (fs.existsSync(viteManifestPath)) {
            return this.hashFile(viteManifestPath);
        }

        // Check for Mix manifest (Laravel Mix)
        const mixManifestPath = path.join(process.cwd(), publicDirectory, 'mix-manifest.json');
        if (fs.existsSync(mixManifestPath)) {
            return this.hashFile(mixManifestPath);
        }

        // Check for any manifest.json in the public directory
        const manifestPath = path.join(process.cwd(), publicDirectory, options.manifestFilename);
        if (fs.existsSync(manifestPath)) {
            return this.hashFile(manifestPath);
        }

        // If no manifest files found, return null
        return null;
    }

    /**
     * Create a hash of a file content using MD5 algorithm.
     * This matches the Laravel implementation behavior.
     */
    private static hashFile(filePath: string): string {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return this.hashContent(content);
        } catch (error) {
            console.warn(`Failed to hash file ${filePath}:`, error);
            return '';
        }
    }

    /**
     * Create a hash of content using MD5 algorithm.
     */
    private static hashContent(content: string): string {
        return crypto.createHash('md5').update(content).digest('hex');
    }

    /**
     * Create a version detector function that can be used with Inertia.setVersion()
     */
    static createVersionDetector(publicDirectory: string = 'public', viteOptions?: Partial<ViteOptions>): () => string {
        return () => {
            const version = this.detectVersion(publicDirectory, viteOptions);
            return version || '';
        };
    }

    /**
     * Check if we're currently in development mode
     */
    static isDevelopmentMode(publicDirectory: string = 'public', hotFile: string = 'hot'): boolean {
        const hotFilePath = path.join(process.cwd(), publicDirectory, hotFile);
        return fs.existsSync(hotFilePath);
    }
}

/**
 * File watcher for spec.html with debouncing and circular trigger prevention
 */
import chokidar from 'chokidar';
import debounce from 'lodash.debounce';
import { EventEmitter } from 'events';
import { logger } from './utils/logger.js';
export class SpecFileWatcher extends EventEmitter {
    watcher = null;
    isUpdating = false;
    config;
    constructor(config) {
        super();
        this.config = config;
    }
    start() {
        logger.info(`Starting file watcher for ${this.config.specFile}...`);
        // Debounced change handler
        const handleChange = debounce((path) => {
            // Skip if we're in the middle of updating the file ourselves
            if (this.isUpdating) {
                logger.debug('Skipping change event (internal update)');
                return;
            }
            logger.processing(`Detected change in ${path}`);
            this.emit('change', path);
        }, this.config.debounceMs);
        // Watch spec.html with chokidar
        this.watcher = chokidar.watch(this.config.specFile, {
            ignoreInitial: false, // Process on startup
            awaitWriteFinish: {
                stabilityThreshold: 300, // Wait for file to stabilize
                pollInterval: 100,
            },
            persistent: true,
        });
        this.watcher.on('change', handleChange);
        this.watcher.on('add', handleChange);
        this.watcher.on('error', (error) => {
            const err = error;
            logger.error(`Watcher error: ${err.message}`);
        });
        logger.success('File watcher started successfully');
    }
    stop() {
        if (this.watcher) {
            logger.info('Stopping file watcher...');
            this.watcher.close();
            this.watcher = null;
            logger.success('File watcher stopped');
        }
    }
    /**
     * Signal that we're about to update the file internally
     * This prevents circular triggers
     */
    setUpdating(value) {
        this.isUpdating = value;
    }
    /**
     * Check if we're currently updating
     */
    isCurrentlyUpdating() {
        return this.isUpdating;
    }
}

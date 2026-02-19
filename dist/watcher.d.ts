/**
 * File watcher for spec.html with debouncing and circular trigger prevention
 */
import { EventEmitter } from 'events';
import type { Config } from '@claudiv/core';
export declare class SpecFileWatcher extends EventEmitter {
    private watcher;
    private isUpdating;
    private config;
    constructor(config: Config);
    start(): void;
    stop(): void;
    /**
     * Signal that we're about to update the file internally
     * This prevents circular triggers
     */
    setUpdating(value: boolean): void;
    /**
     * Check if we're currently updating
     */
    isCurrentlyUpdating(): boolean;
}

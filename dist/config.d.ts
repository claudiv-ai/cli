/**
 * Configuration loader for Claudiv CLI.
 *
 * Loads config from:
 * 1. .claudiv/config.json (project-level)
 * 2. Environment variables
 * 3. CLI arguments (via env vars set by bin/claudiv.js)
 */
export interface ClaudivConfig {
    mode: 'cli' | 'api';
    apiKey?: string;
    specFile: string;
    debounceMs: number;
    claudeTimeout: number;
}
export declare function loadConfig(): ClaudivConfig;

/**
 * Unified Claude client interface (abstracts CLI vs API mode)
 */
import type { Config, HierarchyContext } from '@claudiv/core';
export interface ClaudeClient {
    sendPrompt(userMessage: string, context: HierarchyContext): AsyncGenerator<string>;
    checkAvailable(): Promise<boolean>;
}
/**
 * Create Claude client based on configuration
 */
export declare function createClaudeClient(config: Config): ClaudeClient;
/**
 * Verify Claude is available before starting
 */
export declare function verifyClaudeAvailable(client: ClaudeClient, mode: 'cli' | 'api'): Promise<void>;

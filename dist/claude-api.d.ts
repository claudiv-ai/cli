/**
 * Anthropic API integration for direct API access
 */
import type { HierarchyContext } from '@claudiv/core';
export declare class ClaudeAPIClient {
    private client;
    constructor(apiKey: string);
    /**
     * Send prompt to Claude API and stream response
     */
    sendPrompt(userMessage: string, context: HierarchyContext): AsyncGenerator<string>;
    /**
     * Check if API is available
     */
    checkAvailable(): Promise<boolean>;
    /**
     * Build system prompt with context
     */
    private buildSystemPrompt;
}

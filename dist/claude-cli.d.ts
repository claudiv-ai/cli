/**
 * Claude Code CLI integration via subprocess
 */
import type { HierarchyContext } from '@claudiv/core';
export declare class ClaudeCLIClient {
    /**
     * Send prompt to Claude Code CLI and stream response
     */
    sendPrompt(userMessage: string, context: HierarchyContext): AsyncGenerator<string>;
    /**
     * Check if Claude CLI is installed
     */
    checkAvailable(): Promise<boolean>;
    /**
     * Build prompt with hierarchy context
     */
    private buildPrompt;
}

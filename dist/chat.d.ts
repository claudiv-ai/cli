/**
 * Chat modes for interactive development
 */
/**
 * Multi-turn chat mode
 * Interactive conversation about the spec file with explicit generation trigger
 */
export declare function startChatSession(specFile: string, claudeClient: any, config: any): Promise<void>;
/**
 * Targeted chat mode (single-turn with generation)
 * Chat about specific topic/component and generate immediately
 */
export declare function startTargetedChat(specFile: string, subject: string, claudeClient: any, config: any): Promise<string>;

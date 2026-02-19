/**
 * Interactive prompts for missing information
 */
export interface PromptResponse {
    provider?: string;
    apiKey?: string;
    model?: string;
    customProvider?: string;
    [key: string]: any;
}
/**
 * Detect if spec content requires additional information
 */
export declare function requiresPrompts(specContent: string): boolean;
/**
 * Prompt for AI provider selection
 */
export declare function promptAIProvider(): Promise<PromptResponse>;
/**
 * Prompt for model selection based on provider
 */
export declare function promptModel(provider: string): Promise<string>;
/**
 * Format provider and model into spec attributes
 */
export declare function formatProviderAttributes(promptResponse: PromptResponse, model: string): string;

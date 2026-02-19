/**
 * Interactive prompts for missing information
 */
import prompts from 'prompts';
/**
 * Detect if spec content requires additional information
 */
export function requiresPrompts(specContent) {
    const keywords = ['ai', 'api', 'provider', 'openai', 'claude', 'gemini', 'llm', 'model'];
    const lowerContent = specContent.toLowerCase();
    return keywords.some(kw => lowerContent.includes(kw));
}
/**
 * Prompt for AI provider selection
 */
export async function promptAIProvider() {
    const response = await prompts([
        {
            type: 'select',
            name: 'provider',
            message: 'Which AI provider?',
            choices: [
                { title: 'OpenAI', value: 'openai' },
                { title: 'Claude (Anthropic)', value: 'anthropic' },
                { title: 'Gemini (Google)', value: 'gemini' },
                { title: 'Other', value: 'other' }
            ],
            initial: 0
        },
        {
            type: (prev) => prev === 'other' ? 'text' : null,
            name: 'customProvider',
            message: 'Provider name:',
            validate: (value) => value.trim() !== '' ? true : 'Provider name is required'
        },
        {
            type: 'password',
            name: 'apiKey',
            message: 'API Key (optional, press Enter to skip):',
            validate: () => true // Optional field
        }
    ]);
    return response;
}
/**
 * Prompt for model selection based on provider
 */
export async function promptModel(provider) {
    const modelChoices = {
        openai: [
            { title: 'GPT-4', value: 'gpt-4' },
            { title: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
            { title: 'DALL-E 3', value: 'dall-e-3' }
        ],
        anthropic: [
            { title: 'Claude Opus 4.6', value: 'claude-opus-4-6' },
            { title: 'Claude Sonnet 4.5', value: 'claude-sonnet-4-5' },
            { title: 'Claude Haiku 4.5', value: 'claude-haiku-4-5' }
        ],
        gemini: [
            { title: 'Gemini Pro', value: 'gemini-pro' },
            { title: 'Gemini Ultra', value: 'gemini-ultra' }
        ]
    };
    const choices = modelChoices[provider] || [];
    if (choices.length === 0) {
        // For custom providers, ask for model name as text
        const response = await prompts({
            type: 'text',
            name: 'model',
            message: 'Model name:',
            validate: (value) => value.trim() !== '' ? true : 'Model name is required'
        });
        return response.model || '';
    }
    const response = await prompts({
        type: 'select',
        name: 'model',
        message: 'Select model:',
        choices,
        initial: 0
    });
    return response.model || '';
}
/**
 * Format provider and model into spec attributes
 */
export function formatProviderAttributes(promptResponse, model) {
    const provider = promptResponse.customProvider || promptResponse.provider;
    let attrs = ` ai-provider="${provider}"`;
    if (model) {
        attrs += ` ai-model="${model}"`;
    }
    if (promptResponse.apiKey && promptResponse.apiKey.trim() !== '') {
        // Note: In real implementation, API key should be stored in .env, not in .cdml
        // For now, just indicate that key was provided
        attrs += ` ai-key-configured="true"`;
    }
    return attrs;
}

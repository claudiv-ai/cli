/**
 * Chat modes for interactive development
 */
import prompts from 'prompts';
import { readFile } from 'fs/promises';
import { logger } from './utils/logger.js';
import { extractCodeBlocks } from '@claudiv/core';
/**
 * Multi-turn chat mode
 * Interactive conversation about the spec file with explicit generation trigger
 */
export async function startChatSession(specFile, claudeClient, config) {
    console.log('\n╔════════════════════════════════════╗');
    console.log('║   Claudiv Chat Mode                ║');
    console.log('╚════════════════════════════════════╝\n');
    console.log('Commands: gen (generate), exit (quit), help\n');
    const conversation = [];
    // Load spec file context
    const specContent = await readFile(specFile, 'utf-8');
    conversation.push({
        role: 'system',
        content: `You are helping the user develop this Claudiv spec file (.cdml):\n\n${specContent}\n\nProvide helpful guidance about the spec structure, features, and implementation suggestions.`
    });
    while (true) {
        const response = await prompts({
            type: 'text',
            name: 'message',
            message: 'You:'
        });
        const userMessage = response.message?.trim();
        // Handle prompts cancellation (Ctrl+C)
        if (!userMessage && userMessage !== '') {
            console.log('\nExiting chat mode.');
            break;
        }
        if (!userMessage)
            continue;
        // Handle commands
        if (userMessage === 'exit' || userMessage === 'quit') {
            console.log('Exiting chat mode.');
            break;
        }
        if (userMessage === 'help') {
            console.log('\nCommands:');
            console.log('  gen     - Generate code from current spec');
            console.log('  exit    - Exit chat mode (or Ctrl+C)');
            console.log('  quit    - Same as exit');
            console.log('  help    - Show this help\n');
            continue;
        }
        if (userMessage === 'gen') {
            console.log('Triggering generation...');
            logger.info('Chat mode ended - returning to normal generation flow');
            // Return to let main process handle generation
            break;
        }
        // Add to conversation
        conversation.push({ role: 'user', content: userMessage });
        // Get Claude response
        console.log('\nClaude:');
        let fullResponse = '';
        try {
            for await (const chunk of claudeClient.sendPrompt(userMessage, { conversation })) {
                fullResponse += chunk;
                process.stdout.write(chunk);
            }
            process.stdout.write('\n\n');
            conversation.push({ role: 'assistant', content: fullResponse });
        }
        catch (error) {
            const err = error;
            logger.error(`Chat error: ${err.message}`);
            console.log('');
        }
    }
}
/**
 * Targeted chat mode (single-turn with generation)
 * Chat about specific topic/component and generate immediately
 */
export async function startTargetedChat(specFile, subject, claudeClient, config) {
    console.log(`\n📝 Chat: "${subject}"\n`);
    const specContent = await readFile(specFile, 'utf-8');
    // Build contextual prompt
    const contextualPrompt = `
Regarding this Claudiv spec file (.cdml):

${specContent}

User question/request: ${subject}

Please provide a helpful response. If this request involves code changes or implementation, include the appropriate code in your response.
`;
    console.log('Claude response:\n');
    let fullResponse = '';
    try {
        for await (const chunk of claudeClient.sendPrompt(contextualPrompt, {})) {
            fullResponse += chunk;
            process.stdout.write(chunk);
        }
        process.stdout.write('\n\n');
        // Check if response contains code
        const codeBlocks = extractCodeBlocks(fullResponse);
        if (codeBlocks.length > 0) {
            logger.info('Detected code in response - will proceed with generation');
        }
        else {
            logger.info('No code detected - response complete');
        }
    }
    catch (error) {
        const err = error;
        logger.error(`Targeted chat error: ${err.message}`);
    }
    return fullResponse;
}

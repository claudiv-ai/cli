/**
 * Claudiv CLI engine — diff-based, transactional processing model.
 *
 * No gen/retry/undo attributes. Changes detected by diffing cached vs current.
 *
 * Flow:
 *   .cdml file change detected
 *     ↓
 *   diffCdml(cached, current) → CdmlDiffResult
 *     ↓
 *   Classify: plan directives | plan answers | content changes
 *     ↓
 *   For each change → BEGIN TRANSACTION:
 *     1. Resolve scope from .claudiv/context.cdml
 *     2. Resolve dependencies → view-filtered facets
 *     3. Read current code from <refs>
 *     4. Assemble prompt: target + current + contracts + facts
 *     5. Execute headless Claude
 *     6. Validate: response only affects target scope
 *     7. COMMIT or ROLLBACK
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import chokidar from 'chokidar';
import {
  diffCdml,
  getChangedElements,
  assembleContext,
  parseContextManifest,
  loadContextManifest,
  serializeContextManifest,
  executeClaudeHeadless,
  loadProject,
  parseSpecFile,
  detectPlanDirectives,
  parsePlanQuestions,
  allQuestionsAnswered,
  questionsToFacts,
  buildPlanPrompt,
  generatePlanQuestions,
} from '@claudiv/core';
import type {
  ContextManifest,
  ProjectRegistry,
  CdmlElementChange,
  PlanDirective,
} from '@claudiv/core';
import type { ParsedCdml } from '@claudiv/core';
import { loadConfig } from './config.js';
import { logger } from './utils/logger.js';
import { parseSystemCdml, createSystemComponents } from './system-manager.js';

/** In-memory CDML cache for diff detection */
const cache = new Map<string, string>();

async function main() {
  const isWatch = process.env.CLAUDIV_WATCH === '1';
  const isHeadless = process.env.CLAUDIV_HEADLESS === '1';
  const isInit = process.env.CLAUDIV_INIT === '1';
  const isDryRun = process.env.CLAUDIV_DRY_RUN === '1';
  const scopeFilter = process.env.CLAUDIV_SCOPE;

  logger.info('Claudiv — Declarative AI Interaction Platform');

  const config = loadConfig();
  const projectRoot = dirname(config.specFile);

  // Initialize mode
  if (isInit) {
    await handleInit(projectRoot);
    process.exit(0);
  }

  // Load project registry
  let registry: ProjectRegistry | null = null;
  const manifestPath = join(projectRoot, 'claudiv.project.cdml');
  if (existsSync(manifestPath)) {
    registry = await loadProject(manifestPath);
    logger.debug(`Loaded project: ${registry.currentProject}`);
  }

  // Load context manifest
  let contextManifest: ContextManifest | null = null;
  const contextPath = join(projectRoot, '.claudiv', 'context.cdml');
  if (existsSync(contextPath)) {
    contextManifest = await loadContextManifest(contextPath);
    logger.debug(`Loaded context for: ${contextManifest.forFile}`);
  }

  // HEADLESS MODE: one-shot processing
  if (isHeadless) {
    const content = await readFile(config.specFile, 'utf-8');
    await processFileChange(
      config.specFile,
      content,
      '',  // no cached version — treat everything as new
      projectRoot,
      registry,
      contextManifest,
      contextPath,
      config,
      isDryRun,
      scopeFilter
    );
    logger.info('Generation complete');
    process.exit(0);
  }

  // WATCH MODE: continuous processing
  if (isWatch) {
    // Initial cache population
    const content = await readFile(config.specFile, 'utf-8');
    const relPath = basename(config.specFile);
    cache.set(relPath, content);

    // Check for system components on first load
    await checkSystemComponents(content, projectRoot);

    const watcher = chokidar.watch('**/*.cdml', {
      cwd: projectRoot,
      persistent: true,
      ignoreInitial: true,
      ignored: ['**/node_modules/**', '**/.claudiv/**', '**/claudiv.project.cdml'],
      awaitWriteFinish: { stabilityThreshold: config.debounceMs, pollInterval: 50 },
    });

    logger.info(`Watching for .cdml changes in ${projectRoot}`);

    watcher.on('change', async (relativePath) => {
      try {
        const filePath = join(projectRoot, relativePath);
        const newContent = await readFile(filePath, 'utf-8');
        const oldContent = cache.get(relativePath) || '';

        await processFileChange(
          filePath,
          newContent,
          oldContent,
          projectRoot,
          registry,
          contextManifest,
          contextPath,
          config,
          isDryRun,
          scopeFilter
        );

        cache.set(relativePath, newContent);
      } catch (error) {
        logger.error(`Error: ${(error as Error).message}`);
      }
    });

    // Cache new files
    watcher.on('add', async (relativePath) => {
      try {
        const content = await readFile(join(projectRoot, relativePath), 'utf-8');
        cache.set(relativePath, content);
      } catch {
        // Ignore
      }
    });

    // Graceful shutdown
    const shutdown = () => {
      logger.info('Shutting down...');
      watcher.close();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    return;
  }

  // Default: one-shot with existing cache
  const content = await readFile(config.specFile, 'utf-8');
  await processFileChange(
    config.specFile,
    content,
    '',
    projectRoot,
    registry,
    contextManifest,
    contextPath,
    config,
    isDryRun,
    scopeFilter
  );
}

/**
 * Process a file change through the transactional pipeline.
 */
async function processFileChange(
  filePath: string,
  newContent: string,
  oldContent: string,
  projectRoot: string,
  registry: ProjectRegistry | null,
  contextManifest: ContextManifest | null,
  contextPath: string,
  config: any,
  isDryRun: boolean,
  scopeFilter?: string
): Promise<void> {
  // 1. Diff
  const diff = diffCdml(oldContent, newContent);
  if (!diff.hasChanges && oldContent) {
    logger.debug('No changes detected');
    return;
  }

  const changes = getChangedElements(diff);
  logger.info(`Changes: +${diff.summary.added} -${diff.summary.removed} ~${diff.summary.modified}`);

  // 2. Parse for plan directives and questions
  const parsed = parseSpecFile(newContent);

  // Handle plan directives
  if (parsed.hasPlanDirectives) {
    await handlePlanDirectives(parsed.dom, filePath, projectRoot, config, contextManifest, contextPath);
  }

  // Handle answered plan:questions
  if (parsed.hasPlanQuestions) {
    await handlePlanAnswers(parsed.dom, filePath, contextManifest, contextPath);
  }

  // 3. Apply scope filter
  const filteredChanges = scopeFilter
    ? changes.filter((c: CdmlElementChange) => c.path.includes(scopeFilter))
    : changes;

  if (filteredChanges.length === 0) {
    logger.debug('No changes match scope filter');
    return;
  }

  // 4. Process each change transactionally
  for (const change of filteredChanges) {
    await processChange(change, projectRoot, registry, contextManifest, contextPath, config, isDryRun);
  }
}

/**
 * Process a single change in a transaction.
 */
async function processChange(
  change: CdmlElementChange,
  projectRoot: string,
  registry: ProjectRegistry | null,
  contextManifest: ContextManifest | null,
  contextPath: string,
  config: any,
  isDryRun: boolean
): Promise<void> {
  logger.info(`Processing: <${change.tagName}> [${change.type}] at ${change.path}`);

  // BEGIN TRANSACTION
  const preState = contextManifest
    ? JSON.parse(JSON.stringify(contextManifest))
    : null;

  try {
    // 1. Assemble context
    if (!contextManifest) {
      logger.debug('No context manifest — minimal processing');
      return;
    }

    const assembled = await assembleContext(
      change,
      change.path,
      contextManifest,
      registry,
      projectRoot
    );

    if (isDryRun) {
      logger.info(`Dry run — prompt: ${assembled.prompt.length} chars`);
      logger.info('Prompt preview:');
      console.log(assembled.prompt.substring(0, 500) + '...');
      return;
    }

    // 2. Execute headless Claude
    const result = await executeClaudeHeadless(assembled, {
      mode: config.mode,
      apiKey: config.apiKey,
      timeoutMs: config.claudeTimeout,
    });

    if (!result.success) {
      throw new Error(`Claude execution failed: ${result.error}`);
    }

    logger.info(`Generated (${result.durationMs}ms)`);

    // 3. Output response
    process.stdout.write(result.response);
    process.stdout.write('\n');

    // COMMIT: update context manifest with new refs/facts
    if (contextManifest) {
      await writeFile(contextPath, serializeContextManifest(contextManifest), 'utf-8');
    }
  } catch (error) {
    // ROLLBACK
    logger.error(`Transaction failed: ${(error as Error).message}`);
    if (preState && contextManifest) {
      Object.assign(contextManifest, preState);
    }
  }
}

/**
 * Handle plan directives — propose one-level-deep expansion.
 */
async function handlePlanDirectives(
  $: any,
  filePath: string,
  projectRoot: string,
  config: any,
  contextManifest: ContextManifest | null,
  contextPath: string
): Promise<void> {
  const directives = detectPlanDirectives($);

  for (const directive of directives) {
    logger.info(`Plan directive at ${directive.scope}: "${directive.instruction}"`);

    const prompt = buildPlanPrompt(directive);

    const result = await executeClaudeHeadless(
      {
        target: directive.instruction,
        current: {},
        contracts: [],
        dependencies: [],
        constraints: directive.existingChildren,
        facts: [],
        changeTargets: [],
        prompt,
      },
      {
        mode: config.mode,
        apiKey: config.apiKey,
        timeoutMs: config.claudeTimeout,
      }
    );

    if (result.success) {
      logger.info(`Plan expansion generated (${result.durationMs}ms)`);
      process.stdout.write(result.response);
      process.stdout.write('\n');
    } else {
      logger.error(`Plan processing failed: ${result.error}`);
    }
  }
}

/**
 * Handle answered plan:questions — remove block, persist as facts.
 */
async function handlePlanAnswers(
  $: any,
  filePath: string,
  contextManifest: ContextManifest | null,
  contextPath: string
): Promise<void> {
  const questions = parsePlanQuestions($);

  if (!allQuestionsAnswered(questions)) {
    logger.debug('Plan questions not yet fully answered');
    return;
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const facts = questionsToFacts(questions, `plan:${dateStr}`);

  logger.info(`Recording ${facts.length} plan decision(s) as facts`);

  // Persist facts to context manifest
  if (contextManifest) {
    contextManifest.global.facts.push(...facts);
    await writeFile(contextPath, serializeContextManifest(contextManifest), 'utf-8');
  }

  // Remove <plan:questions> block from .cdml
  $('plan\\:questions').remove();
  const updatedContent = $.html();
  await writeFile(filePath, updatedContent, 'utf-8');

  logger.info('Plan questions processed and removed from .cdml');
}

/**
 * Check for system components and create them if needed.
 */
async function checkSystemComponents(
  content: string,
  projectRoot: string
): Promise<void> {
  try {
    const system = parseSystemCdml(content);
    if (system.components.length > 0) {
      logger.info(`System "${system.name}" with ${system.components.length} component(s)`);

      const created = await createSystemComponents(system, projectRoot);
      for (const file of created) {
        logger.info(`  Created: ${file}`);
      }
    }
  } catch {
    // Not a system file — that's fine
  }
}

/**
 * Handle init command — scan project and generate scaffolding.
 */
async function handleInit(projectRoot: string): Promise<void> {
  logger.info('Initializing Claudiv...');

  const claudivDir = join(projectRoot, '.claudiv');
  if (!existsSync(claudivDir)) {
    await mkdir(claudivDir, { recursive: true });
  }

  // Create default context
  const contextPath = join(claudivDir, 'context.cdml');
  if (!existsSync(contextPath)) {
    const name = basename(projectRoot);
    const context = `<claudiv-context for="${name}.cdml" auto-generated="true">
  <global>
    <refs></refs>
    <facts></facts>
  </global>
</claudiv-context>
`;
    await writeFile(contextPath, context, 'utf-8');
    logger.info('Created .claudiv/context.cdml');
  }

  // Create default config
  const configPath = join(claudivDir, 'config.json');
  if (!existsSync(configPath)) {
    await writeFile(configPath, JSON.stringify({ mode: 'cli' }, null, 2), 'utf-8');
    logger.info('Created .claudiv/config.json');
  }

  // Create project manifest
  const manifestPath = join(projectRoot, 'claudiv.project.cdml');
  if (!existsSync(manifestPath)) {
    const name = basename(projectRoot);
    const manifest = `<project name="${name}">
  <auto-discover>
    <directory path="." pattern="*.cdml" />
  </auto-discover>
</project>
`;
    await writeFile(manifestPath, manifest, 'utf-8');
    logger.info('Created claudiv.project.cdml');
  }

  logger.info('Initialization complete');
}

// Start
main().catch((error) => {
  logger.error(`Fatal: ${error.message}`);
  process.exit(1);
});

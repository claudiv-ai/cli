/**
 * Configuration loader for Claudiv CLI.
 *
 * Loads config from:
 * 1. .claudiv/config.json (project-level)
 * 2. Environment variables
 * 3. CLI arguments (via env vars set by bin/claudiv.js)
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, isAbsolute, dirname } from 'path';
import { logger } from './utils/logger.js';

export interface ClaudivConfig {
  mode: 'cli' | 'api';
  apiKey?: string;
  specFile: string;
  debounceMs: number;
  claudeTimeout: number;
}

export function loadConfig(): ClaudivConfig {
  // Determine spec file
  const cliFile = process.argv[2];
  let specFile: string;

  if (cliFile) {
    specFile = isAbsolute(cliFile) ? cliFile : join(process.cwd(), cliFile);
    if (!existsSync(specFile)) {
      logger.error(`File not found: ${specFile}`);
      process.exit(1);
    }
  } else {
    const files = readdirSync(process.cwd());
    const cdmlFiles = files.filter(
      (f) => f.endsWith('.cdml') && f !== 'claudiv.project.cdml'
    );

    if (cdmlFiles.length === 0) {
      logger.error('No .cdml files found');
      process.exit(1);
    }

    specFile = join(process.cwd(), cdmlFiles[0]);
  }

  // Load .claudiv/config.json
  const projectRoot = dirname(specFile);
  let projectConfig: Record<string, any> = {};
  const configPath = join(projectRoot, '.claudiv', 'config.json');
  if (existsSync(configPath)) {
    try {
      projectConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch {
      // Ignore parse errors
    }
  }

  // Determine mode
  const mode = (
    process.env.CLAUDIV_MODE ||
    projectConfig.mode ||
    process.env.MODE ||
    'cli'
  ) as 'cli' | 'api';

  // API key
  let apiKey = projectConfig.apiKey || process.env.ANTHROPIC_API_KEY;
  if (mode === 'api' && !apiKey) {
    logger.error('API key required for API mode');
    logger.info('Set ANTHROPIC_API_KEY or run: claudiv mode');
    process.exit(1);
  }

  return {
    mode,
    apiKey,
    specFile,
    debounceMs: 300,
    claudeTimeout: 120_000,
  };
}

/**
 * Transactional updater — handles atomic updates to context manifest and generated files.
 *
 * Each Claudiv operation is a transaction:
 * 1. Write generated files
 * 2. Update context.cdml refs
 * 3. Record facts from plan decisions
 * 4. Update .cdml cache
 *
 * On failure: rollback (no partial state).
 */

import { writeFile, readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { ContextManifest, ContextRef, ContextFact } from '@claudiv/core';
import { serializeContextManifest } from '@claudiv/core';
import { logger } from './utils/logger.js';

export interface TransactionOp {
  type: 'write' | 'delete';
  file: string;
  content?: string;
  previousContent?: string;
}

/**
 * Execute a transaction: write files and update context atomically.
 */
export async function executeTransaction(
  ops: TransactionOp[],
  contextManifest: ContextManifest,
  contextPath: string,
  newRefs: ContextRef[],
  newFacts: ContextFact[],
  scopePath: string
): Promise<void> {
  const completed: TransactionOp[] = [];

  try {
    // 1. Write/delete generated files
    for (const op of ops) {
      if (op.type === 'write' && op.content !== undefined) {
        // Save previous content for rollback
        if (existsSync(op.file)) {
          op.previousContent = await readFile(op.file, 'utf-8');
        }
        await writeFile(op.file, op.content, 'utf-8');
        completed.push(op);
        logger.debug(`Wrote: ${op.file}`);
      } else if (op.type === 'delete') {
        if (existsSync(op.file)) {
          op.previousContent = await readFile(op.file, 'utf-8');
          await unlink(op.file);
          completed.push(op);
          logger.debug(`Deleted: ${op.file}`);
        }
      }
    }

    // 2. Update context manifest refs
    const scope = contextManifest.scopes.find((s: { path: string }) => s.path === scopePath);
    if (scope) {
      for (const ref of newRefs) {
        const existing = scope.refs.findIndex((r: ContextRef) => r.file === ref.file);
        if (existing >= 0) {
          scope.refs[existing] = ref;
        } else {
          scope.refs.push(ref);
        }
      }
    }

    // 3. Record new facts
    if (newFacts.length > 0) {
      const targetScope = scope || contextManifest.global;
      if ('facts' in targetScope) {
        targetScope.facts.push(...newFacts);
      }
    }

    // 4. Write updated context manifest
    await writeFile(contextPath, serializeContextManifest(contextManifest), 'utf-8');

  } catch (error) {
    // ROLLBACK: restore all completed operations
    logger.error(`Transaction failed, rolling back ${completed.length} operation(s)`);

    for (const op of completed.reverse()) {
      try {
        if (op.type === 'write' && op.previousContent !== undefined) {
          await writeFile(op.file, op.previousContent, 'utf-8');
        } else if (op.type === 'write' && op.previousContent === undefined) {
          // File was newly created — delete it
          if (existsSync(op.file)) await unlink(op.file);
        } else if (op.type === 'delete' && op.previousContent !== undefined) {
          await writeFile(op.file, op.previousContent, 'utf-8');
        }
      } catch (rollbackError) {
        logger.error(`Rollback failed for ${op.file}: ${(rollbackError as Error).message}`);
      }
    }

    throw error;
  }
}

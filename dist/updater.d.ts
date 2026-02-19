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
import type { ContextManifest, ContextRef, ContextFact } from '@claudiv/core';
export interface TransactionOp {
    type: 'write' | 'delete';
    file: string;
    content?: string;
    previousContent?: string;
}
/**
 * Execute a transaction: write files and update context atomically.
 */
export declare function executeTransaction(ops: TransactionOp[], contextManifest: ContextManifest, contextPath: string, newRefs: ContextRef[], newFacts: ContextFact[], scopePath: string): Promise<void>;

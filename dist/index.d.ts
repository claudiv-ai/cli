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
export {};

/**
 * System Manager — creates component directories and skeletons from system .cdml.
 *
 * Parses a system .cdml file like:
 *   <system name="my-system">
 *     <portal type="webapp">User management dashboard</portal>
 *     <api type="rest" submodule="true">Backend REST API</api>
 *     <worker type="service">Background job processor</worker>
 *   </system>
 *
 * Per component:
 * 1. Plain directory (default) or `git submodule init` if submodule="true"
 * 2. Create <name>/<name>.cdml with interface/constraints/requires/implementation skeleton
 * 3. Register in claudiv.project.cdml
 */
import type { SystemProject } from '@claudiv/core';
/**
 * Parse a system .cdml file and extract component definitions.
 */
export declare function parseSystemCdml(content: string): SystemProject;
/**
 * Create component directories and skeletons from a system definition.
 */
export declare function createSystemComponents(system: SystemProject, projectRoot: string): Promise<string[]>;

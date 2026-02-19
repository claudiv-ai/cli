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
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { parseDocument } from 'htmlparser2';
import * as cheerio from 'cheerio';
/**
 * Parse a system .cdml file and extract component definitions.
 */
export function parseSystemCdml(content) {
    const dom = parseDocument(content, {
        lowerCaseAttributeNames: false,
        lowerCaseTags: false,
        recognizeSelfClosing: true,
    });
    const $ = cheerio.load(dom, { xmlMode: false });
    const systemEl = $('system');
    if (systemEl.length === 0) {
        throw new Error('No <system> element found');
    }
    const name = systemEl.attr('name') || 'unnamed-system';
    const components = [];
    systemEl.children().each((_, child) => {
        if (child.type !== 'tag')
            return;
        const el = child;
        const $el = $(el);
        components.push({
            name: el.name,
            type: el.attribs?.type || 'service',
            submodule: el.attribs?.submodule === 'true',
            description: $el.text().trim() || undefined,
        });
    });
    return {
        name,
        components,
        manifestPath: '',
    };
}
/**
 * Create component directories and skeletons from a system definition.
 */
export async function createSystemComponents(system, projectRoot) {
    const created = [];
    for (const component of system.components) {
        const componentDir = join(projectRoot, component.name);
        // 1. Create directory or submodule
        if (component.submodule) {
            if (!existsSync(componentDir)) {
                try {
                    execSync(`git submodule add --name ${component.name} . ${component.name}`, {
                        stdio: 'pipe',
                        cwd: projectRoot,
                    });
                }
                catch {
                    // Submodule init may fail without a remote — create plain dir instead
                    if (!existsSync(componentDir)) {
                        await mkdir(componentDir, { recursive: true });
                    }
                }
            }
        }
        else {
            if (!existsSync(componentDir)) {
                await mkdir(componentDir, { recursive: true });
            }
        }
        // 2. Create component .cdml skeleton
        const cdmlPath = join(componentDir, `${component.name}.cdml`);
        if (!existsSync(cdmlPath)) {
            const skeleton = generateComponentSkeleton(component, system.name);
            await writeFile(cdmlPath, skeleton, 'utf-8');
            created.push(`${component.name}/${component.name}.cdml`);
        }
        // 3. Create .claudiv directory for the component
        const claudivDir = join(componentDir, '.claudiv');
        if (!existsSync(claudivDir)) {
            await mkdir(claudivDir, { recursive: true });
        }
        const contextPath = join(claudivDir, 'context.cdml');
        if (!existsSync(contextPath)) {
            const context = generateComponentContext(component, system.name);
            await writeFile(contextPath, context, 'utf-8');
            created.push(`${component.name}/.claudiv/context.cdml`);
        }
    }
    // 4. Update project manifest
    await updateProjectManifest(system, projectRoot);
    created.push('claudiv.project.cdml (updated)');
    return created;
}
// ─── Internal ───────────────────────────────────────────────────
function generateComponentSkeleton(component, systemName) {
    const fqn = `${systemName}:${component.name}`;
    const desc = component.description
        ? `\n    <!-- ${component.description} -->`
        : '';
    return `<component name="${component.name}" fqn="${fqn}">

  <interface>${desc}
    <!-- Define what this component exposes -->
  </interface>

  <constraints>
    <!-- Define environment requirements -->
  </constraints>

  <requires>
    <!-- Define dependencies by interface -->
  </requires>

  <implementation target="typescript" type="${component.type}">
    <modules>
      <!-- Define internal modules -->
    </modules>
  </implementation>

</component>
`;
}
function generateComponentContext(component, systemName) {
    return `<claudiv-context for="${component.name}.cdml" auto-generated="true">
  <global>
    <refs></refs>
    <facts>
      <fact>Part of system: ${systemName}</fact>
      <fact>Component type: ${component.type}</fact>
    </facts>
  </global>
</claudiv-context>
`;
}
async function updateProjectManifest(system, projectRoot) {
    const manifestPath = join(projectRoot, 'claudiv.project.cdml');
    const directories = system.components
        .map((c) => `    <directory path="${c.name}/" pattern="*.cdml" />`)
        .join('\n');
    const content = `<project name="${system.name}">
  <auto-discover>
    <directory path="." pattern="*.cdml" />
${directories}
    <directory path="aspects/" pattern="*.*.cdml" />
  </auto-discover>
</project>
`;
    await writeFile(manifestPath, content, 'utf-8');
}

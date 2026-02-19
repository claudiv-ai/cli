# @claudiv/cli

> Command-line interface for the Claudiv declarative AI interaction platform

## Overview

@claudiv/cli provides the `claudiv` command for creating, watching, and processing `.cdml` files. It implements the transactional processing model: diff detection -> context assembly -> headless Claude execution -> commit/rollback.

## Installation

```bash
npm install -g @claudiv/cli
```

Requirements: Node.js 20+, Claude Code CLI or Anthropic API key

## Commands

```
claudiv new vite <name>      Scaffold Vite project with Claudiv
claudiv new system <name>    Create system project
claudiv dev [file]           Watch .cdml files, diff and process changes
claudiv gen [file]           One-shot generation
claudiv init                 Initialize Claudiv in existing project
```

### `claudiv new vite <name>`
1. Creates directory, runs `npm create vite@latest` with react-ts template
2. Installs dependencies + `@claudiv/vite-sdk`
3. Runs `claudiv:init` to scan and generate .cdml + context

### `claudiv new system <name>`
1. Creates directory with `git init`
2. Generates `<name>.cdml` with `<system>` template
3. Generates `claudiv.project.cdml` manifest and `.claudiv/context.cdml`

### `claudiv dev [file]`
Watches .cdml files for changes. On each save:
1. Diffs against cached state
2. Classifies changes (plan directives, plan answers, content)
3. Processes each change transactionally

### `claudiv gen [file]`
One-shot: reads .cdml, diffs, processes all changes, exits.

Options: `--mode cli|api`, `--scope <path>`, `--dry-run`

### `claudiv init`
Initializes Claudiv in an existing project:
- Creates `.claudiv/` directory
- Generates `context.cdml` and `config.json`
- Generates `claudiv.project.cdml`

## Processing Model

```
.cdml file change -> diffCdml() -> classify
    |
Plan directives -> buildPlanPrompt() -> Claude proposes expansion
Plan answers -> questionsToFacts() -> persist to context.cdml
Content changes -> assembleContext() -> executeClaudeHeadless()
    |
COMMIT: write files + update context refs/facts
ROLLBACK: on any failure, no partial state
```

## System Manager

System `.cdml` files define multi-component projects:
```xml
<system name="my-system">
  <portal type="webapp">User dashboard</portal>
  <api type="rest" submodule="true">Backend API</api>
  <worker type="service">Job processor</worker>
</system>
```

Each component gets its own directory, `.cdml` skeleton, and context manifest.

## Configuration

`.claudiv/config.json`:
```json
{ "mode": "cli" }
```

Environment variables: `CLAUDIV_MODE`, `ANTHROPIC_API_KEY`

## License

MIT

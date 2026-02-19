# Changelog

All notable changes to @claudiv/cli will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-02-19

### Added

- **Diff-based processing model** — Changes detected by diffing `.cdml` against cached state. No more `gen`/`retry`/`undo` attributes.
- **Transactional processing** — Every change is atomic: diff → context → execute → commit/rollback. No partial state.
- **Interface-first component model** — Four-section components: interface, constraints, requires, implementation.
- **FQN addressing** — Fully Qualified Names for cross-file component references with scope resolution.
- **Context engine** — `.claudiv/context.cdml` maps scopes to code artifacts, interface contracts, and architectural facts.
- **Headless Claude execution** — `claude --print` (CLI) or direct API calls. Zero session state.
- **View-filtered interface projection** — Dependencies see only the facets they need.
- **Plan directives** — `plan="..."` for one-level-deep expansion proposals with `<plan:questions>` lifecycle.
- **Multi-aspect views** — Component aspect files (infra, api, data, security, monitoring).
- **Environment cascade** — Platform-specific overrides via naming convention with element-level merge.
- **System manager** — `claudiv new system` creates multi-component projects with manifest and context.
- **`claudiv new vite`** — Scaffold Vite project with @claudiv/vite-sdk integration.
- **`claudiv init`** — Initialize Claudiv in existing projects.
- **Project manifest** — `claudiv.project.cdml` with auto-discover patterns.
- **App scanner** — Scans existing project structure for initialization.

### Removed

- `gen`/`retry`/`undo` attribute processing — replaced by diff-based detection
- `lock`/`unlock` system — replaced by context engine scope enforcement
- Chat mode (`--chat` flag) — replaced by declarative, file-change-triggered processing
- Code generators (HTML, Python, Bash, System Monitor) — replaced by headless Claude execution
- `claudiv modify` command — edit `.cdml` files directly
- `claudiv reverse` command — use `claudiv init` scanner instead
- Dev server with hot reload — Claudiv is now a dev-only tool, project runs separately
- Interactive prompts for AI providers — mode set via `.claudiv/config.json`

### Changed

- Complete architectural shift from conversational CLI tool to declarative AI interaction platform
- Processing model: attribute-based → diff-based with transactional commit/rollback
- Context: raw conversation history → structured `.claudiv/context.cdml` manifests
- CLI commands restructured: `new vite`, `new system`, `dev`, `gen`, `init`

## [0.2.0] - 2026-02-15

### Added

- `claudiv modify` command
- `--chat` flag for interactive development
- `--plan` flag for planning mode
- Interactive prompts for AI provider configuration
- Multi-word `--spec` flag support

## [0.1.4] - 2026-02-14

### Added

- Initial CLI with `new`, `gen`, `dev`, `reverse` commands
- File watching, Vite dev server, Claude integration
- Lock/unlock system

## [0.1.0] - 2026-02-01

### Added

- Initial release

[0.3.0]: https://github.com/claudiv-ai/claudiv/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/claudiv-ai/cli/compare/v0.1.4...v0.2.0
[0.1.4]: https://github.com/claudiv-ai/cli/compare/v0.1.0...v0.1.4
[0.1.0]: https://github.com/claudiv-ai/cli/releases/tag/v0.1.0

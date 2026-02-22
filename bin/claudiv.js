#!/usr/bin/env node

/**
 * Claudiv CLI — Declarative AI Interaction Platform
 *
 * Commands:
 *   claudiv new vite <name>      Scaffold Vite project with Claudiv
 *   claudiv new system <name>    Create system project
 *   claudiv dev [file]           Watch .cdml and process changes
 *   claudiv gen [file]           One-shot generation
 *   claudiv init                 Initialize Claudiv in existing project
 *   claudiv designer              Launch visual designer
 *   claudiv help                 Show help
 */

import { spawn, execSync } from 'child_process';
import { existsSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const VERSION = '0.3.0';

// ─── Parse Arguments ───────────────────────────────────────────

const args = process.argv.slice(2);
const flags = {};
const positional = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '-v' || arg === '--version') {
    console.log(`claudiv ${VERSION}`);
    process.exit(0);
  } else if (arg === '-h' || arg === '--help') {
    showHelp();
    process.exit(0);
  } else if (arg === '--port') {
    flags.port = args[++i];
  } else if (arg === '--open') {
    flags.open = true;
  } else if (arg === '--designer') {
    flags.designer = true;
  } else if (arg === '--mode') {
    flags.mode = args[++i];
  } else if (arg === '--scope') {
    flags.scope = args[++i];
  } else if (arg === '--dry-run') {
    flags.dryRun = true;
  } else if (!arg.startsWith('-')) {
    positional.push(arg);
  }
}

// ─── Route Commands ────────────────────────────────────────────

const cmd = positional[0];

switch (cmd) {
  case 'new':
    routeNew(positional.slice(1), flags);
    break;
  case 'designer':
    cmdDesigner(flags);
    break;
  case 'dev':
    cmdDev(positional[1], flags);
    break;
  case 'gen':
    cmdGen(positional[1], flags);
    break;
  case 'init':
    cmdInit(flags);
    break;
  case 'help':
    showHelp();
    break;
  case undefined:
    cmdDefault(flags);
    break;
  default:
    if (cmd.endsWith('.cdml')) {
      cmdDev(cmd, flags);
    } else {
      console.error(`Unknown command: ${cmd}`);
      console.log('Run "claudiv help" for usage.');
      process.exit(1);
    }
}

// ─── New Subcommands ───────────────────────────────────────────

function routeNew(args, flags) {
  const subCmd = args[0];
  const name = args[1];

  switch (subCmd) {
    case 'vite':
      cmdNewVite(name, flags);
      break;
    case 'system':
      cmdNewSystem(name, flags);
      break;
    default:
      if (subCmd && !name) {
        // claudiv new <name> — create a system project by default
        cmdNewSystem(subCmd, flags);
      } else {
        console.error('Usage: claudiv new <vite|system> <name>');
        console.log('');
        console.log('  claudiv new vite my-app       Scaffold Vite + Claudiv project');
        console.log('  claudiv new system my-system   Create system project');
        process.exit(1);
      }
  }
}

/**
 * claudiv new vite <name>
 *
 * 1. Validate folder empty/absent
 * 2. npm create vite@latest <name> -- --template react-ts
 * 3. Install deps + @claudiv/vite-sdk
 * 4. Run claudiv:init
 */
function cmdNewVite(name, flags) {
  if (!name) {
    console.error('Usage: claudiv new vite <name>');
    process.exit(1);
  }

  const targetDir = join(process.cwd(), name);

  if (existsSync(targetDir)) {
    console.error(`Directory already exists: ${name}`);
    process.exit(1);
  }

  console.log(`Creating Vite + Claudiv project: ${name}`);
  console.log('');

  // 1. Create Vite project
  console.log('Step 1: Creating Vite project...');
  try {
    execSync(`npm create vite@latest ${name} -- --template react-ts`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
  } catch (error) {
    console.error('Failed to create Vite project');
    process.exit(1);
  }

  // 2. Install dependencies
  console.log('');
  console.log('Step 2: Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit', cwd: targetDir });
  } catch (error) {
    console.error('Failed to install dependencies');
    process.exit(1);
  }

  // 3. Install @claudiv/vite-sdk
  console.log('');
  console.log('Step 3: Adding @claudiv/vite-sdk...');
  try {
    execSync('npm install @claudiv/vite-sdk', { stdio: 'inherit', cwd: targetDir });
  } catch (error) {
    console.error('Failed to install @claudiv/vite-sdk');
    process.exit(1);
  }

  // 4. Run claudiv:init
  console.log('');
  console.log('Step 4: Initializing Claudiv...');
  try {
    execSync('npm run claudiv:init', { stdio: 'inherit', cwd: targetDir });
  } catch (error) {
    console.error('Failed to initialize Claudiv');
    process.exit(1);
  }

  console.log('');
  console.log(`Project "${name}" created successfully!`);
  console.log('');
  console.log('Next steps:');
  console.log(`  cd ${name}`);
  console.log('  npm run claudiv:dev    — start watching for changes');
  console.log('  npm run claudiv:gen    — one-shot generation');
}

/**
 * claudiv new system <name>
 *
 * 1. Create directory, git init
 * 2. Generate <name>.cdml with <system> template
 * 3. Generate claudiv.project.cdml
 * 4. Generate .claudiv/context.cdml, .claudiv/config.json
 */
function cmdNewSystem(name, flags) {
  if (!name) {
    console.error('Usage: claudiv new system <name>');
    process.exit(1);
  }

  const targetDir = join(process.cwd(), name);

  if (existsSync(targetDir)) {
    console.error(`Directory already exists: ${name}`);
    process.exit(1);
  }

  console.log(`Creating system project: ${name}`);

  // 1. Create directory and git init
  mkdirSync(targetDir, { recursive: true });
  try {
    execSync('git init', { stdio: 'pipe', cwd: targetDir });
  } catch {
    // Git not required
  }

  // 2. Generate system .cdml
  const systemCdml = `<system name="${name}">
  <!-- Add components here -->
  <!-- <portal type="webapp">User dashboard</portal> -->
  <!-- <api type="rest">Backend API</api> -->
  <!-- <worker type="service">Background processor</worker> -->
</system>
`;
  writeFileSync(join(targetDir, `${name}.cdml`), systemCdml, 'utf-8');

  // 3. Generate project manifest
  const projectManifest = `<project name="${name}">
  <auto-discover>
    <directory path="." pattern="*.cdml" />
    <directory path="services/" pattern="*.cdml" />
    <directory path="aspects/" pattern="*.*.cdml" />
  </auto-discover>
</project>
`;
  writeFileSync(join(targetDir, 'claudiv.project.cdml'), projectManifest, 'utf-8');

  // 4. Generate .claudiv directory
  const claudivDir = join(targetDir, '.claudiv');
  mkdirSync(claudivDir, { recursive: true });

  const contextCdml = `<claudiv-context for="${name}.cdml" auto-generated="true">
  <global>
    <refs></refs>
    <facts></facts>
  </global>
</claudiv-context>
`;
  writeFileSync(join(claudivDir, 'context.cdml'), contextCdml, 'utf-8');
  writeFileSync(join(claudivDir, 'config.json'), JSON.stringify({ mode: 'sdk' }, null, 2), 'utf-8');

  // 5. Generate .gitignore
  writeFileSync(join(targetDir, '.gitignore'), `.claudiv/config.json
node_modules/
dist/
`, 'utf-8');

  console.log('');
  console.log(`System project "${name}" created:`);
  console.log(`  ${name}/`);
  console.log(`  ├── ${name}.cdml`);
  console.log(`  ├── claudiv.project.cdml`);
  console.log(`  ├── .claudiv/`);
  console.log(`  │   ├── context.cdml`);
  console.log(`  │   └── config.json`);
  console.log(`  └── .gitignore`);
  console.log('');
  console.log('Next steps:');
  console.log(`  cd ${name}`);
  console.log(`  Edit ${name}.cdml to add components`);
}

// ─── Designer Command ─────────────────────────────────────────

/**
 * claudiv designer [--port 3200] [--open]
 *
 * Launch the visual designer web UI.
 */
function cmdDesigner(flags) {
  const port = flags.port || '3200';

  // Try to find the designer package
  const designerPaths = [
    join(__dirname, '../../designer'),           // monorepo sibling
    join(__dirname, '../node_modules/@claudiv/designer'), // installed as cli dep
    join(process.cwd(), 'node_modules/@claudiv/designer'), // installed in user project
  ];

  let designerRoot = null;
  for (const p of designerPaths) {
    if (existsSync(join(p, 'server', 'index.ts')) || existsSync(join(p, 'dist', 'server', 'index.js'))) {
      designerRoot = p;
      break;
    }
  }

  if (!designerRoot) {
    console.error('Designer package not found.');
    console.log('Install it: npm install @claudiv/designer');
    process.exit(1);
  }

  console.log(`Starting Claudiv Designer on port ${port}...`);

  const envVars = { ...process.env, PORT: port, PROJECT_ROOT: process.cwd() };

  // Prefer compiled JS, fall back to tsx for dev
  const serverEntry = existsSync(join(designerRoot, 'dist', 'server', 'index.js'))
    ? join(designerRoot, 'dist', 'server', 'index.js')
    : join(designerRoot, 'server', 'index.ts');

  const runner = serverEntry.endsWith('.ts') ? 'tsx' : 'node';

  const proc = spawn(runner, [serverEntry], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: envVars,
  });

  if (flags.open) {
    // Give server a moment to start, then open browser
    setTimeout(() => {
      const url = `http://localhost:${port}`;
      try {
        const openCmd = process.platform === 'darwin' ? 'open' :
                        process.platform === 'win32' ? 'start' : 'xdg-open';
        execSync(`${openCmd} ${url}`, { stdio: 'ignore' });
      } catch {
        console.log(`Open in browser: ${url}`);
      }
    }, 1500);
  }

  proc.on('exit', (code) => process.exit(code || 0));
  proc.on('error', (err) => {
    if (runner === 'tsx') {
      console.error('tsx not found. Install it: npm i -g tsx');
    } else {
      console.error(`Failed to start designer: ${err.message}`);
    }
    process.exit(1);
  });
}

// ─── Core Commands ─────────────────────────────────────────────

function cmdDev(file, flags) {
  const cdmlFile = resolveFile(file);
  if (!cdmlFile) return;

  // If --designer flag is set, also start the designer server
  if (flags.designer) {
    console.log('Starting dev mode with designer...');
    cmdDesigner({ ...flags, _background: true });
  }

  console.log(`Starting dev mode for ${basename(cdmlFile)}...`);
  startEngine(cdmlFile, { ...flags, watch: true });
}

function cmdGen(file, flags) {
  const cdmlFile = resolveFile(file);
  if (!cdmlFile) return;

  console.log(`Generating from ${basename(cdmlFile)}...`);
  startEngine(cdmlFile, { ...flags, headless: true });
}

function cmdInit(flags) {
  console.log('Initializing Claudiv in current directory...');
  startEngine(null, { ...flags, init: true });
}

function cmdDefault(flags) {
  const files = readdirSync(process.cwd());
  const cdmlFiles = files.filter(f => f.endsWith('.cdml') && f !== 'claudiv.project.cdml');

  if (cdmlFiles.length === 0) {
    showQuickStart();
    process.exit(0);
  }

  if (cdmlFiles.length === 1) {
    console.log(`Found ${cdmlFiles[0]}, starting dev mode...`);
    startEngine(join(process.cwd(), cdmlFiles[0]), { watch: true });
  } else {
    console.log('Multiple .cdml files found:');
    cdmlFiles.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    console.log('');
    console.log(`Specify: claudiv dev ${cdmlFiles[0]}`);
    process.exit(0);
  }
}

// ─── Helpers ───────────────────────────────────────────────────

function resolveFile(file) {
  if (!file) {
    // Auto-detect
    const files = readdirSync(process.cwd());
    const cdmlFiles = files.filter(f => f.endsWith('.cdml') && f !== 'claudiv.project.cdml');

    if (cdmlFiles.length === 0) {
      console.error('No .cdml files found');
      process.exit(1);
    }
    if (cdmlFiles.length === 1) {
      return join(process.cwd(), cdmlFiles[0]);
    }
    console.error('Multiple .cdml files — specify which one:');
    cdmlFiles.forEach(f => console.log(`  claudiv dev ${f}`));
    process.exit(1);
  }

  const cdmlFile = file.endsWith('.cdml') ? file : `${file}.cdml`;
  const cdmlPath = join(process.cwd(), cdmlFile);

  if (!existsSync(cdmlPath)) {
    console.error(`File not found: ${cdmlFile}`);
    process.exit(1);
  }

  return cdmlPath;
}

function startEngine(cdmlPath, flags) {
  const envVars = { ...process.env };

  if (flags.mode) envVars.CLAUDIV_MODE = flags.mode;
  if (flags.watch) envVars.CLAUDIV_WATCH = '1';
  if (flags.headless) envVars.CLAUDIV_HEADLESS = '1';
  if (flags.init) envVars.CLAUDIV_INIT = '1';
  if (flags.scope) envVars.CLAUDIV_SCOPE = flags.scope;
  if (flags.dryRun) envVars.CLAUDIV_DRY_RUN = '1';

  const engineArgs = [join(__dirname, '../dist/index.js')];
  if (cdmlPath) engineArgs.push(cdmlPath);

  const proc = spawn('node', engineArgs, {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: envVars,
  });

  proc.on('exit', (code) => process.exit(code || 0));
  proc.on('error', (err) => {
    console.error(`Failed to start: ${err.message}`);
    process.exit(1);
  });
}

// ─── Help ──────────────────────────────────────────────────────

function showQuickStart() {
  console.log(`Claudiv ${VERSION} — Declarative AI Interaction Platform`);
  console.log('');
  console.log('Get started:');
  console.log('  claudiv new vite my-app        Create Vite + Claudiv project');
  console.log('  claudiv new system my-system    Create system project');
  console.log('  claudiv designer               Launch visual designer');
  console.log('  claudiv help                    Full help');
}

function showHelp() {
  console.log(`
Claudiv ${VERSION} — Declarative AI Interaction Platform

USAGE
  claudiv <command> [options]

COMMANDS
  new vite <name>       Scaffold Vite project with Claudiv integration
  new system <name>     Create system project (multi-component)
  dev [file]            Watch .cdml files and process changes
  gen [file]            One-shot generation from .cdml
  init                  Initialize Claudiv in existing project
  designer              Launch visual designer web UI
  help                  Show this help

OPTIONS
  --mode <cli|api>      Claude invocation mode (default: cli)
  --scope <path>        Generate specific scope only
  --dry-run             Assemble prompts but don't execute
  --port <number>       Designer server port (default: 3200)
  --open                Open browser on designer start
  --designer            Start designer alongside dev mode
  -v, --version         Show version
  -h, --help            Show help

EXAMPLES

  Create Projects:
    claudiv new vite my-app              Create Vite + React + Claudiv project
    claudiv new system my-platform       Create multi-component system

  Development:
    claudiv dev                          Watch and process (auto-detect .cdml)
    claudiv dev my-service.cdml          Watch specific file
    claudiv gen                          One-shot generation
    claudiv gen --scope "api"            Generate specific scope
    claudiv gen --dry-run                Preview without executing

  Designer:
    claudiv designer                     Launch visual designer
    claudiv designer --port 4000 --open  Custom port + auto-open browser
    claudiv dev --designer               Dev mode with designer

  System Components:
    Edit <name>.cdml to define components:
      <system name="my-system">
        <portal type="webapp">Dashboard</portal>
        <api type="rest" submodule="true">Backend API</api>
      </system>

FILE FORMAT
  Components:    <name>.cdml           — component definition
  Aspects:       <name>.<type>.cdml    — aspect view (infra, api, data, etc.)
  Environment:   <name>.env.cdml       — environment overrides
  Project:       claudiv.project.cdml  — project manifest
  Context:       .claudiv/context.cdml — reference mapping (auto-generated)

MORE INFO
  https://github.com/claudiv-ai/cli
`);
}

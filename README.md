# @claudiv/cli

### *Claude in a Div - CLI Tool*

> **Conversational Development with Claude** - Build applications by describing what you want in CDML

**@claudiv/cli** is the command-line tool for the Claudiv platform. It watches `.cdml` (Claudiv Markup Language) files, generates code through conversations with Claude AI, and provides a development server with hot reload.

**Powered by [@claudiv/core](https://npmjs.com/package/@claudiv/core)** - The pure generation engine

## ✨ What Makes Claudiv Special

- 🗣️ **Conversational Development** - Describe your UI naturally, Claude generates the code
- 🏗️ **Freeform Structure** - Use ANY tag names - no conventions to learn
- 🎯 **Attribute-Based Actions** - Just add `gen=""` to trigger AI generation
- 🔒 **Selective Regeneration** - Lock what works, regenerate what needs improvement
- 🔥 **Hot Reload** - See changes instantly in your browser
- 🌳 **Hierarchical Context** - Nested structure automatically provides AI context
- 📝 **Living Specification** - Your spec.html is the source of truth, not the generated code

## 🚀 Quick Start

```bash
# Install globally
npm install -g @claudiv/cli

# Create a .cdml file
mkdir claudiv
echo '<app><button gen>Make a blue button</button></app>' > claudiv/app.cdml

# Start development
claudiv
```

Your browser opens at `http://localhost:30004` with a working blue button. **That's it.**

## 💡 How It Works

### 1. Write CDML Specifications

Create `.cdml` files with declarative markup:

```xml
<!-- claudiv/app.cdml -->
<app target="html">
  <hero-section gen>
    Create a hero section with gradient background,
    large heading "Welcome to the Future",
    and a call-to-action button
  </hero-section>
</app>
```

### 2. Claude Generates Implementation

Claudiv sends your specification to Claude (via CLI subscription or API), which generates complete code and updates your browser automatically.

Generated artifacts:
- `app.html` - Final HTML/CSS implementation
- `app.spec.cdml` - Structured specification
- `app.rules.cdml` - Extracted rules and conventions
- `app.models.cdml` - Data models and entities
- `app.tests.cdml` - Test specifications

### 3. Iterate Naturally

```xml
<!-- claudiv/app.cdml -->
<app target="html">
  <hero-section lock>
    <!-- Already perfect, keep this -->
  </hero-section>

  <features-grid gen>
    Add a 3-column grid showcasing key features
    with icons and descriptions
  </features-grid>
</app>
```

Lock what works, regenerate what needs improvement. **No manual code editing required.**

## 🎯 Core Concepts

### Freeform Tag Names

Use **any** tag name that makes sense to you:

```xml
<user-dashboard gen="">
<pricing-table gen="">
<testimonial-carousel gen="">
<contact-form gen="">
```

Tag names help you organize and help Claude understand intent.

### Attributes as Specifications

Provide structured specifications via attributes:

```xml
<button
  color="blue"
  size="large"
  icon="checkmark"
  action="submit-form"
  gen="">
</button>
```

Claude uses these to guide implementation.

### Action Attributes

- `gen=""` - Generate new implementation
- `retry=""` - Regenerate with same specs
- `undo=""` - Revert previous change
- `lock=""` - Prevent children from regeneration
- `unlock=""` - Override parent lock

### Lock/Unlock System

Perfect for iterative development:

```xml
<!-- Lock everything, regenerate only header -->
<website lock="" gen="">
  <header unlock="">
    Update header with sticky navigation
  </header>
  <sidebar>Stays locked</sidebar>
  <content>Stays locked</content>
</website>
```

## 🎨 Real-World Example

```xml
<app theme="dark">
  <!-- Navigation -->
  <nav-menu dock="left" styling="professional compact" gen="">
    <pages>
      <home>Home</home>
      <gallery>Gallery</gallery>
      <about>About</about>
    </pages>
  </nav-menu>

  <!-- Main Content -->
  <pages gen="">
    <home content="classic home">
      Hero section with welcome message,
      3 feature cards highlighting benefits,
      testimonials section with 4 reviews
    </home>

    <gallery layout="grid" columns="3">
      Photo gallery with hover effects,
      lightbox on click, responsive grid
    </gallery>
  </pages>
</app>
```

**Result**: Complete, working website with navigation, pages, and all features implemented.

## 📚 Documentation

- **[Getting Started Guide](../../docs/FEATURES-SUMMARY.md)** - Complete feature overview
- **[Attribute Syntax](../../docs/ATTRIBUTE-SYNTAX.md)** - Full syntax reference
- **[Lock/Unlock Guide](../../docs/LOCK-UNLOCK-GUIDE.md)** - Selective regeneration patterns
- **[CDML Schema Guide](../../docs/SCHEMA-GUIDE.md)** - IDE autocomplete setup
- **[Core API Documentation](https://npmjs.com/package/@claudiv/core)** - @claudiv/core reference

## ⚙️ Configuration

### Configuration File

Create `claudiv.json` in your project root:

```json
{
  "mode": "cli",
  "specFile": "claudiv/app.cdml",
  "outputDir": "src/generated",
  "target": "html"
}
```

### Two Generation Modes

**CLI Mode** (uses Claude Code subscription):
```bash
# Set in claudiv.json
{ "mode": "cli" }

# Or via environment variable
MODE=cli claudiv
```

**API Mode** (pay-per-use via Anthropic API):
```env
# .claudiv/.env file
MODE=api
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### Project Structure

```
my-project/
├── claudiv/               # CDML source files (version controlled)
│   ├── app.cdml          # Main specification
│   ├── app.spec.cdml     # Generated structured spec
│   ├── app.rules.cdml    # Generated rules
│   ├── app.models.cdml   # Generated data models
│   └── app.tests.cdml    # Generated tests
│
├── src/generated/        # Generated code (gitignored)
│   └── app.html
│
├── .claudiv/             # Metadata (gitignored)
│   ├── .env              # API keys
│   ├── cache/
│   └── logs/
│
├── claudiv.json          # Configuration
└── .gitignore
```

### IDE Support

Install the **Red Hat XML** extension in VS Code for:
- Autocomplete for CDML attributes
- Documentation on hover
- Real-time validation

See [SCHEMA-GUIDE.md](../../docs/SCHEMA-GUIDE.md) for setup instructions.

## 🔥 Advanced Features

### Nested Component Specifications

All nested elements are automatically implemented:

```xml
<dashboard gen="">
  <header>App header with logo and user menu</header>
  <sidebar>
    <nav-links>Dashboard, Analytics, Settings</nav-links>
  </sidebar>
  <main-content>
    <stats-cards count="4">Revenue, Users, Sales, Growth</stats-cards>
    <chart type="line">Monthly revenue chart</chart>
  </main-content>
</dashboard>
```

**Every** nested element gets a complete implementation.

### Iterative Development Workflow

```xml
<!-- Step 1: Generate everything -->
<app gen="">
  <header>...</header>
  <sidebar>...</sidebar>
  <main>...</main>
</app>

<!-- Step 2: Lock header, improve sidebar -->
<app retry="">
  <header lock="">Perfect!</header>
  <sidebar>Better navigation layout</sidebar>
  <main lock="">Keep this</main>
</app>

<!-- Step 3: Lock everything, update theme -->
<app theme="dark" lock="" retry="">
  <header unlock="">Update with dark theme</header>
</app>
```

### Structured AI Responses

Claude responds with semantic XML:

```xml
<ai>
  <changes>Created responsive dashboard with 4 stat cards</changes>
  <details>
    <layout>Flexbox layout with responsive breakpoints</layout>
    <styling>Modern card design with shadows and hover effects</styling>
    <theme>Dark mode support via CSS variables</theme>
  </details>
  <summary>Complete dashboard implementation...</summary>
</ai>
```

## 🎯 Use Cases

### Rapid Prototyping
Describe UIs in natural language, get working prototypes instantly.

### Design Iteration
Lock components that work, iterate on specific sections.

### Learning & Exploration
See how AI implements your ideas, learn patterns and techniques.

### Living Documentation
spec.html serves as both specification and documentation.

## 🛠️ Commands

```bash
# Watch mode with dev server (default)
claudiv

# Generate once (no watching)
claudiv gen

# Specify file explicitly
claudiv --file claudiv/app.cdml

# Use API mode
claudiv --mode api

# Show help
claudiv --help
```

## 📦 Generated Artifacts

When you run Claudiv, multiple files are generated from your `.cdml` source:

**Input:**
- `claudiv/app.cdml` - Your source specification (version controlled)

**Generated Artifacts:** (all gitignored)
- `app.html` - Final HTML/CSS implementation (browser-ready)
- `app.spec.cdml` - Structured specification for tracking
- `app.rules.cdml` - Extracted rules and conventions
- `app.models.cdml` - Data models and business entities
- `app.tests.cdml` - Test specifications
- `.claudiv/cache/` - Generation cache
- `.claudiv/logs/` - Execution logs

**IDE Support:**
- `claudiv.xsd` - XML Schema for autocomplete (auto-generated)
- `.vscode/settings.json` - IDE configuration

## 🌟 Why Claudiv?

Traditional development:
1. Design mockups
2. Write HTML structure
3. Write CSS styling
4. Write JavaScript behavior
5. Debug and refine
6. Repeat for every component

**Claudiv development:**
1. Describe what you want
2. ✨ *Everything else happens automatically*

## Architecture

@claudiv/cli is built on top of [@claudiv/core](https://npmjs.com/package/@claudiv/core):

- **@claudiv/core** - Pure generation engine (framework-agnostic)
- **@claudiv/cli** - File watching, Claude integration, dev server
- **Chokidar** - Cross-platform file watching
- **Anthropic SDK** - API mode integration

The CLI handles I/O while @claudiv/core handles generation logic. This separation enables reuse in build plugins, VS Code extensions, and other integrations.

## Installation

### Global Installation

```bash
npm install -g @claudiv/cli
```

### Local Project Installation

```bash
npm install --save-dev @claudiv/cli
```

Add to `package.json` scripts:
```json
{
  "scripts": {
    "dev": "claudiv",
    "gen": "claudiv gen"
  }
}
```

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## 📄 License

MIT © 2026 Amir Guterman

See [LICENSE](./LICENSE) for details.

## 🔗 Links

- **Homepage:** [https://claudiv.org](https://claudiv.org)
- **GitHub:** [https://github.com/claudiv-ai/cli](https://github.com/claudiv-ai/cli)
- **npm:** [https://npmjs.com/package/@claudiv/cli](https://npmjs.com/package/@claudiv/cli)
- **Documentation:** [https://docs.claudiv.org](https://docs.claudiv.org)
- **Claude Code:** [https://claude.ai/code](https://claude.ai/code)

## Related Packages

- [@claudiv/core](https://npmjs.com/package/@claudiv/core) - Core generation engine
- [@claudiv/vite-sdk](https://npmjs.com/package/@claudiv/vite-sdk) - Vite plugin with HMR

---

**Built with ❤️ for developers who want to focus on what to build, not how to code it.**

*Claudiv - Where conversation meets creation.*

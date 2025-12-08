# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MDPlan is a VSCode extension that provides a Kanban-style planning tool using markdown files. The core concept is to enable project planning directly within markdown files using a specific format, rather than rendering a separate UI.

## Development Commands

### Build and Compile
- `npm run compile` - Compile TypeScript to JavaScript (output to `out/` directory)
- `npm run watch` - Watch mode for continuous compilation during development
- `npm run vscode:prepublish` - Production build (runs compile)

### Testing and Linting
- `npm run test` - Run tests (automatically compiles and lints first via pretest)
- `npm run lint` - Run ESLint on the `src/` directory
- `npm run pretest` - Runs both compile and lint (automatically invoked before test)

### Running the Extension
Use F5 in VSCode to launch the Extension Development Host, or use the pre-configured launch configurations in `.vscode/launch.json`.

## Code Architecture

### Extension Structure
- **Entry point**: `src/extension.ts` contains `activate()` and `deactivate()` functions
  - `activate()` is called when the extension is loaded
  - Commands are registered using `vscode.commands.registerCommand()` and added to `context.subscriptions`

- **Configuration**: Commands are declared in `package.json` under the `contributes.commands` section and must match the command IDs used in code

### Markdown File Format

The extension **only activates** on markdown files that contain the marker `<!-- mdplan -->` anywhere in the file. This allows users to have regular markdown files alongside MDPlan files.

The extension is designed to work with markdown files following this structure:

**File Structure:**
- Title: `# Title` with optional description as blockquote below
- Sections: `## SectionName` (represents Kanban columns)
- Tasks: Checkbox list items `- [ ]` under sections
- Marker: `<!-- mdplan -->` - **REQUIRED** for the extension to activate

**Task Status:**
- Planned: `- [ ]`
- In Progress: `- [wip]`
- Done: `- [x]`
- Blocked: `- [blocked]`

**Task Details:**
- Tasks can contain nested checklists (following same status format)
- Nesting is limited to 1 level for details
- Supports bullet points and markdown code blocks for additional context
- Comments: `> comment text @optional_timestamp_or_@user`

**Snippets:**
- Type `mdplan` or `mdplanfile` in a new markdown file to generate a complete MDPlan template with Todo/Done sections and the required marker
- Other snippets: `task`, `taskwip`, `taskdone`, `taskblocked`, `section`, `comment`, etc.

See `test_folder/Project1.md` for a complete working example.

## TypeScript Configuration

The project uses:
- Node16 module resolution
- ES2022 target
- Strict type checking enabled
- Source maps for debugging
- Output directory: `out/`

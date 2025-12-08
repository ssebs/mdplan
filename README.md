# MDPlan

A VSCode extension for Kanban-style planning using raw markdown files instead of rendering a separate UI.

## Quick Start

1. Create a new markdown file
2. Type `mdplan` and press Tab to insert the template
3. Or manually add `<!-- mdplan -->` anywhere in your markdown file to enable MDPlan features

## Features

- **Code Lenses**: Quick actions to change task status, move tasks between sections, and add new tasks
- **Validation**: Real-time diagnostics for invalid task formats, improper nesting, and structure issues
- **Quick Fixes**: Automatic suggestions to fix common formatting errors
- **Snippets**: Fast insertion of tasks, sections, comments, and templates

## MD Format

**Important**: Files must include `<!-- mdplan -->` for the extension to activate.

See [Project1.md](./test_folder/Project1.md) for full example

- **Title**: `# Title`
  - Description: `> Description text`
- **Kanban sections**: `## SectionName`
  - Optional description: `> Section description`
- **Tasks under a section**: `- [ ] Task text`
- **Task status**:
  - Planned: `- [ ]`
  - In Progress: `- [wip]`
  - Done: `- [x]`
  - Blocked: `- [blocked]`
- **Task content**:
  - Nested checklists (follows same format as task status)
  - Can be nested 1 level for details
  - Bullet points and markdown code blocks for context
- **Comments under a task**:
  - `> comment text @optional_timestamp_or_@user`
- **Marker** (required): `<!-- mdplan -->`

## Snippets

- `mdplan` / `mdplanfile` - Create a new MDPlan file with Todo/Done sections
- `task` - Insert planned task
- `taskwip` - Insert in-progress task
- `taskdone` - Insert completed task
- `taskblocked` - Insert blocked task
- `section` - Insert new section with description
- `comment` - Insert comment with timestamp
- `subtask` - Insert nested task

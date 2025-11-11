# Repository Guidelines

## Expected Conversation Start Pattern

**CORRECT initialization sequence:**
```
[User starts conversation]
Claude: [Uses Read tool on AGENTS.md]
Claude: I've read the workflow guidelines. Ready to work!
Claude: [Uses mcp__plugin_beads_beads__ready to check for work]
```

**INCORRECT (do NOT do this):**
```
[User starts conversation]
Claude: Hello! What would you like to work on?
[Has not read AGENTS.md first]
```

## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Auto-syncs to JSONL for version control
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**PREFERRED**: Use the beads MCP plugin tools (e.g., `mcp__plugin_beads_beads__ready`, `mcp__plugin_beads_beads__create`, etc.). These provide direct programmatic access to beads functionality.

**FALLBACK**: Use `bd` CLI commands via the Bash tool if MCP tools are unavailable. Always include `--json` flag for programmatic use.

**Check for ready work:**
```bash
bd ready --json
```

**Create new issues:**
```bash
bd create "Issue title" -t bug|feature|task -p 0-4 --json
bd create "Issue title" -p 1 --deps discovered-from:bd-123 --json
```

**Claim and update:**
```bash
bd update bd-42 --status in_progress --json
bd update bd-42 --priority 1 --json
```

**Complete work:**
```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: Use `mcp__plugin_beads_beads__ready` (or `bd ready` CLI)
2. **Claim your task**: Use `mcp__plugin_beads_beads__update` with `status=in_progress` (or `bd update <id> --status in_progress`)
3. **Work on it**: Implement, test, document
4. **Discover new work?** Use `mcp__plugin_beads_beads__create` with `deps` parameter (or `bd create "Found bug" -p 1 --deps discovered-from:<parent-id>`)
5. **Complete**: Use `mcp__plugin_beads_beads__close` (or `bd close <id> --reason "Done"`)
6. **Commit together**: Commit `.beads/issues.jsonl` WITH code changes only. Never make "bead-only" commits (closing/updating beads without actual code work). Beads auto-sync to git - they'll be included when you commit real work.

### Auto-Sync

bd automatically syncs with git:
- Exports to `.beads/issues.jsonl` after changes (5s debounce)
- Imports from JSONL when newer (e.g., after `git pull`)
- No manual export/import needed!

### Managing AI-Generated Planning Documents

AI assistants often create planning and design documents during development:
- PLAN.md, IMPLEMENTATION.md, ARCHITECTURE.md
- DESIGN.md, CODEBASE_SUMMARY.md, INTEGRATION_PLAN.md
- TESTING_GUIDE.md, TECHNICAL_DESIGN.md, and similar files

**Best Practice: Use a dedicated directory for these ephemeral files**

**Recommended approach:**
- Create a `history/` directory in the project root
- Store ALL AI-generated planning/design docs in `history/`
- Keep the repository root clean and focused on permanent project files
- Only access `history/` when explicitly asked to review past planning

**Example .gitignore entry (optional):**
```
# AI planning documents (ephemeral)
history/
```

**Benefits:**
- ✅ Clean repository root
- ✅ Clear separation between ephemeral and permanent documentation
- ✅ Easy to exclude from version control if desired
- ✅ Preserves planning history for archeological research
- ✅ Reduces noise when browsing the project

### Important Rules

- ✅ Use bd for ALL task tracking (prefer MCP plugin tools when available)
- ✅ When using CLI: Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check ready work (MCP `ready` or CLI `bd ready`) before asking "what should I work on?"
- ✅ Store AI planning docs in `history/` directory
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems
- ❌ Do NOT clutter repo root with planning documents

For more details, see README.md and QUICKSTART.md.

## Project Structure & Module Organization
Source lives in `src/`. `main.ts` boots the Three.js scene, wires OrbitControls, and keeps the animation loop running. `Nebula.ts` encapsulates particle initialization, collapse physics, and protostar lighting; treat it as the primary gameplay module. Global styling is in `style.css`, while `index.html` provides the canvas container (`#canvas`) and HUD copy. Build tooling sits at root: `vite.config.ts`, `tsconfig.json`, and lockfiles (`package-lock.json`, `bun.lock`)—keep them aligned when changing dependencies.

## Build, Test, and Development Commands
Run `npm install` (or `bun install`) before contributing. `npm run dev` launches the Vite dev server with hot reload; expect the simulator at `http://localhost:5173`. Use `npm run build` for a production bundle (`dist/`) and type-checking via `tsc`. `npm run preview` serves the built assets locally—verify WebGL effects here before tagging a release.

## Coding Style & Naming Conventions
Stick to TypeScript with ES modules. Follow the existing two-space indentation, no semicolons, and single quotes for strings. Classes (e.g., `SunSimulator`, `Nebula`) are PascalCase, methods and variables camelCase, and constants SCREAMING_SNAKE only when immutable. Keep public APIs thin and prefer private helpers for math-heavy updates. Run Prettier if you add it, but do not introduce new formatting tools without updating `package.json`.

## Testing Guidelines
Automated tests are not yet wired up. When adding logic that can be unit-tested (math utilities, state reducers), introduce Vitest under `src/__tests__/` and add an `npm test` script that wraps `vitest run`. Until then, document manual verification steps in the PR (e.g., “observe nebula collapse reaches protostar glow in <30s”). Guard against regressions by profiling frame rate and memory usage in the browser devtools.

## Commit & Pull Request Guidelines
Existing history favors imperative, single-line commit subjects (“Implement Phase 1: …”). Follow that style and keep body text for rationale or follow-up tasks. For pull requests: provide a concise summary, link to any tracking issue, list reproduction or validation steps, and attach screenshots or short videos when you change visual effects. Request review from teammates familiar with the Three.js scene graph before merging physics or rendering tweaks.

# Skill: map

**Description**: Structural codebase index generator. Builds a compact JSON map of files, exports, imports, dependency graph, and roles. Queryable by keyword. Injected into fleet agents as context slices to reduce token usage on code navigation.
**Version**: 1.0.0 | **Effort**: low

## Identity

map builds and maintains a structural index of the target project so every other skill and agent can find relevant files without exploratory reads. One index scan replaces dozens of Glob/Grep round-trips.

**Example:** `/do map this codebase` → structural index written: 12 modules, 340 functions, top 5 entry points, circular deps flagged

## When to Use

- Starting work on an unfamiliar codebase (build the index first)
- A fleet or archon campaign needs agents to know "what files matter for X"
- You want a quick structural overview (stats, roles, dependency graph)
- Searching for files related to a keyword without exploratory reads

Do NOT use for: reading file contents (use Read), searching string patterns (use Grep), single-file edits with a known path.

## Commands

| Command | Behavior |
|---|---|
| `/map` | Generate or refresh the index (skips if cache is fresh) |
| `/map --force` | Rebuild even if cache is fresh |
| `/map query <terms>` | Search the index for files matching keywords |
| `/map stats` | Print summary statistics |
| `/map slice <terms>` | Output a compact context slice for agent injection |

## Protocol

### Step 1: GENERATE INDEX

Run the index generator:

```bash
node ~/.claude/plugins/hookforge/scripts/map-index.js --generate --root .
```

Add `--force` if the user requested a fresh rebuild or the index is stale.

The generator:
1. Walks the project tree (respects `.gitignore`, skips `node_modules`, `dist`, `.hookforge`)
2. Extracts exports, imports, and symbols from each source file
3. Infers a role for each file (component, hook, store, route, test, config, adapter, etc.)
4. Builds a dependency graph from resolved import paths
5. Writes index to `.planning/map/index.json`

**Supported languages:** TypeScript, JavaScript, Python, Go, Rust.

**Cache behavior:** Index is cached for 5 minutes. Pass `--force` to bypass.

If `.planning/map/` does not exist, the generator creates it automatically.

**If `~/.claude/plugins/hookforge/scripts/map-index.js` does not exist:** Fall back to a manual index approach:
1. Run `find . -name "*.ts" -o -name "*.js" -o -name "*.py" | grep -v node_modules | grep -v dist`
2. Build a JSON summary listing file paths and their detected exports (grep for `export` keywords)
3. Write the result to `.planning/map/index.json` (not `.txt`) so fleet integration continues to work

### Step 2: QUERY

When user provides search terms:

```bash
node ~/.claude/plugins/hookforge/scripts/map-index.js --query "<terms>"
```

If the script is unavailable, use grep:
```bash
grep -r "<term>" . --include="*.ts" --include="*.js" -l | head -20
```

Results sorted by relevance score, capped at 20 files.

### Step 3: STATS

```bash
node ~/.claude/plugins/hookforge/scripts/map-index.js --stats
```

Outputs: file count, line count, export count, dependency edge count, breakdown by language and by role.

If script unavailable, calculate manually:
```bash
find . -name "*.ts" | grep -v node_modules | wc -l
wc -l $(find . -name "*.ts" | grep -v node_modules) 2>/dev/null | tail -1
```

### Step 4: SLICE (agent context injection)

When another skill or orchestrator needs a map slice for agent injection:

1. Run `node ~/.claude/plugins/hookforge/scripts/map-index.js --query "<scope terms>" --max-files 15`
2. Format as a compact block:

```
=== MAP SLICE: <terms> ===
<score> <role>  <path>  [<top exports>]  (<lines>L)
...
=== END MAP SLICE ===
```

3. The calling skill injects this block into the agent's prompt alongside CLAUDE.md

**Token budget:** A 15-file slice is typically 800-1200 tokens, replacing 2000-5000 tokens of exploratory navigation.

## Fleet Integration

Before spawning each wave, fleet checks if `.planning/map/index.json` exists. If it does, it runs a query scoped to each agent's assigned domain and prepends the slice to the agent's context.

**Context injection order:**
1. CLAUDE.md content
2. `.hookforge/agent-context/rules-summary.md`
3. Map slice (scoped to agent's domain)
4. Campaign-specific direction

## Quality Gates

- Index must generate without errors on any supported project
- Query must return results sorted by relevance score
- Slice output must stay under 2000 tokens for a 15-file result

## Exit Protocol

After generation: "Map index generated: {file count} files, {edge count} dependency links"

After query: "Results for '{terms}' ({count} matches): [table]"

After stats: print the full statistics block.

After slice: output the formatted slice block ready for injection.


Next skill: `architect` to plan changes using the codebase map, or `organize` to address structural issues the map reveals.
# Skill: ascii-diagram

**Description**: Generates perfectly aligned ASCII diagrams using a programmatic character-grid approach. Layout is computed from box dimensions before any characters are placed, guaranteeing alignment by math rather than token prediction.
**Version**: 1.0.0 | **Effort**: medium

## Identity

ascii-diagram renders ASCII diagrams via a character-grid approach. It never freehands art token-by-token. Dimensions are calculated before any characters are placed, so alignment is correct by construction.

**Example:** `/do draw the request flow for auth` → perfectly aligned ASCII box-and-arrow diagram, dimensions calculated before any character is placed

## When to Use

- When designing a data flow, architecture, or state machine to embed in docs
- When a markdown file needs a diagram without external tools or image files
- When `/do` routes "diagram" or "ascii"

## Orientation

Use when the user wants any text diagram: architecture, flow, sequence, box-and-arrow, tree, network topology, or table. Works in any context where markdown renders as plain text.

Do NOT use when the user wants an image — suggest Mermaid, PlantUML, or an image export tool.

## Protocol

### Step 1: PLAN THE LAYOUT

Before placing any characters, plan explicitly:

1. **List elements** — every box/node with its label text
2. **List connections** — every arrow between elements, with optional labels
3. **Choose direction** — left-to-right or top-to-bottom
4. **Calculate dimensions**:
   - Box width = max label line length + 4 (2 padding + 2 border)
   - Box height = label line count + 2 (top border + bottom border)
   - Gutter between boxes: min 3 chars for arrows (` -> `)
   - For vertical arrows: min 1 row gap

Write this plan explicitly. Example:

```
Elements:
  A: "Client"   -> width=10, height=3
  B: "Server"   -> width=10, height=3
  C: "Database" -> width=12, height=3
Layout: left-to-right
Connections: A->B (HTTP), B->C (SQL)
Total width: 10 + 6 + 10 + 6 + 12 = 44
```

### Step 2: PLACE ON GRID

Allocate a 2D character array (rows x cols) initialized to spaces.

For each box at position (row, col):
- Top border: `+` at corners, `-` between corners
- Side borders: `|` at left/right edges, spaces inside, centered label
- Bottom border: `+` at corners, `-` between corners

For each arrow:
- Horizontal arrows: place `->` in the gutter row at center height of both boxes
- Vertical arrows: place `|` in gutter column, `v` or `^` at the tip
- Arrow labels: center the label string above/below the arrow line

### Step 3: RENDER AND VERIFY

Read the grid back as text. Before outputting, verify:

1. Every row has the same number of characters (pad with spaces if needed)
2. Every box has exactly 4 corners where borders meet
3. Every arrow connects to a box border (no floating arrows)
4. No overlapping boxes or arrows

If any check fails, re-run Step 2 with corrected coordinates.

### Step 4: OUTPUT

Output the diagram in a fenced code block with no language specifier:

````
```
+--------+      +--------+      +----------+
| Client | ---> | Server | ---> | Database |
+--------+      +--------+      +----------+
```
````

For complex diagrams (more than 6 boxes), offer to split into two diagrams showing different levels of detail.

## Diagram Styles

| Style | Box corner | Horizontal | Vertical |
|---|---|---|---|
| Simple (default) | `+` | `-` | `\|` |
| Heavy | `#` | `=` | `\|` |

Use simple style by default. Ask the user if they want a different style only when they explicitly mention it.

## Quality Gates

- Grid dimensions are calculated before any characters are placed (never freehand)
- All rows in the output grid have equal width (pad trailing spaces if needed)
- Every box has exactly 4 corner characters where borders meet
- Every arrow connects to a box border - no floating arrows
- Verification step (Step 3) runs before output - no exceptions

## Exit Protocol

Output the diagram. If the user says "it's not aligned" or "wrong", re-run the calculation from Step 1 - do not attempt to fix individual characters by hand.


Next skill: `doc-gen` to embed the diagram in documentation, or `architect` to use it in the technical design.
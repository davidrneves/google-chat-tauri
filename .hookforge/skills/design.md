# Skill: design

**Description**: Design manifest generator. Extracts a living design system from an existing UI codebase (extract mode) or generates a fresh design manifest from a project description (generate mode). Output drives visual consistency across all components.
**Version**: 1.0.0 | **Effort**: medium

## Identity

design produces a design manifest that captures a project's visual system: colors, typography, spacing, components, interaction patterns, and tone of voice. It either extracts from existing code (reverse-engineering the implicit system) or generates from scratch for new projects.

**Example:** `/do extract the design system from this UI` → design manifest with color tokens, typography scale, spacing grid, and component inventory

## When to Use

- When starting a new project that needs a visual design system
- When extracting design tokens from an existing codebase for documentation
- When `/do` routes "design" or "design system"

## Mode Detection

**Extract mode** (default when source files exist): scan the project's UI source files. Derive the current design system by reading what's actually used. Identify inconsistencies.

**Generate mode** (when no UI source files, or user says "generate" / "fresh" / "new"): create a design manifest from the project description and target audience. Use sensible defaults.

## Protocol

### Step 1: ORIENT

Determine mode. Read:
- If extract mode: read the main component files, style files (`.css`, `.scss`, `.module.css`, `tailwind.config.*`), global styles, and 3-5 representative component files
- If generate mode: read the project description and any existing text documents (README, PRD) for brand/tone cues

### Step 2: EXTRACT OR DEFINE

**Extract mode:**

Scan for:
- **Color usage**: every unique color value found in styles or Tailwind config. Group into categories: primary, secondary, neutral, semantic (success/warning/error).
- **Typography**: font families, size scales, weight patterns. Flag inconsistencies (e.g., 14 different font sizes).
- **Spacing**: margins, paddings, gaps. Identify the implicit scale (4px, 8px, etc.).
- **Component inventory**: list every UI component found. Note which ones have inconsistent implementations (same concept, different markup patterns).
- **Interaction patterns**: hover states, focus rings, transitions, animations.
- **Inconsistencies**: log each as a "Design Debt" item with file and line reference.

**Generate mode:**

Define:
- **Brand attributes**: 3-5 adjectives describing the product's personality
- **Color system**: primary brand color + derivations, neutral scale, semantic colors
- **Typography scale**: choose from 3 standard scales (4px, 6px, or 8px base grid)
- **Spacing scale**: consistent with typography scale
- **Component primitives**: Button (4 variants), Input, Card, Modal shell, Badge

### Step 3: WRITE MANIFEST

Write to `.planning/design-manifest.md`:

```markdown
# Design Manifest: {Project Name}

> Generated: {ISO date}
> Mode: extract | generate
> Status: draft

## Brand

**Personality**: {3-5 adjectives}
**Tone**: {formal | conversational | playful | technical | empathetic}
**Audience**: {description}

## Color System

| Token | Value | Usage |
|---|---|---|
| color-primary-500 | #... | Primary actions |
| color-neutral-900 | #... | Body text |
| color-success-500 | #... | Success states |
...

## Typography

| Token | Size | Weight | Usage |
|---|---|---|---|
| text-heading-1 | 32px/2rem | 700 | Page titles |
...

**Font families**: {heading: ..., body: ...}

## Spacing Scale

Base: {4px | 6px | 8px}
Scale: {list all steps: 4, 8, 12, 16, 24, 32, 48, 64}

## Components

### Button
- Variants: primary, secondary, ghost, destructive
- States: default, hover, active, disabled, loading
- Sizes: sm (32px), md (40px), lg (48px)

### [Other components...]

## Interaction Patterns

| Pattern | Spec |
|---|---|
| Hover transition | 150ms ease-out |
| Focus ring | 2px offset, color-primary-500 |
...

## Design Debt (extract mode only)

| Issue | File | Severity |
|---|---|---|
| 3 different blue values used for primary | ... | medium |
...

## Change Log

| Date | Change |
|---|---|
| {date} | Generated via /design |
```

### Step 4: REPORT

Present the manifest to the user. In extract mode, highlight the top 3 Design Debt items most likely to cause visual inconsistencies.

### Step 5: CONFIRM

Ask: "Does this reflect the design intent? Anything to adjust or add?" Revise based on feedback.

## Quality Gates

- Color tokens must use a consistent naming scheme (token names, not raw hex)
- Extract mode must reference at least one actual file from the project
- Component definitions must include all interactive states (not just "default")
- Design Debt items must include file references (not vague "somewhere in the codebase")

## Exit Protocol

Output: "Design manifest written to `.planning/design-manifest.md`. Reference this file in prompts when generating or reviewing UI components."

Next skill: `architect` - use the design manifest to inform the technical architecture document when building UI-heavy features.
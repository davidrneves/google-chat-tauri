# google-chat-tauri

Desktop wrapper for Google Chat using Tauri v2 + TypeScript.

## Stack

- **Frontend:** TypeScript (src/main.ts) - one source file
- **Backend:** Rust / Tauri v2 (src-tauri/src/main.rs)
- **Package manager:** pnpm (frontend), cargo (Rust)
- **Version:** 0.1.0

## Build & Run

```sh
pnpm build             # compile TypeScript
cargo build            # compile Rust/Tauri (debug)
cargo build --release  # release build
pnpm tauri dev         # dev mode (hot reload)
pnpm tauri build       # full production build
```

## CI

`.github/workflows/ci.yml` runs `cargo test` on push to main.
`.github/workflows/main.yml` (publish) builds release binaries on push to `release`.

## Key Invariants (from Tauri v2 migration postmortem)

- **Permission names:** Use `notification:allow-notify` NOT `allow-send-notification`. Tauri v2 changed the plugin-notification command name. Wrong names fail at compile time via `tauri_codegen`.
- **Security schema:** `dangerousRemoteDomainIpcAccess` does NOT exist in Tauri v2. Remove it entirely - it causes a `tauri-build` proc macro compile error.
- **Plugin existence:** Verify crates.io BEFORE planning any phase that depends on a new crate. `tauri-plugin-badging` does not exist. Use `cargo search <crate>` as a phase gate condition.
- **Trait imports:** `app.emit()` requires `use tauri::Emitter` to be in scope explicitly.

## src-tauri/gen/

Auto-generated ACL schema directory. Appears after first `cargo build`. Gitignored - do not commit.

## DO NOT

- Commit `Cargo.lock` modifications without also committing `pnpm-lock.yaml` if both changed
- Use `bun` - this project uses `pnpm` (see `packageManager` in package.json)
- Add `tauri-plugin-badging` - it does not exist on crates.io
- Rewrite entire config files at once - make incremental edits and run `cargo check` after each file

# Google Chat Tauri

Run Google Chat as a native desktop app — not Electron. 17MB binary, macOS vibrancy, Windows Mica, system tray, and desktop notifications.

## Download (Linux, Windows, macOS)

Get the latest release from the [releases page](https://github.com/ThatOneCalculator/google-chat-tauri/releases/latest):

| Platform | File | Notes |
|----------|------|-------|
| macOS | `.dmg` | Drag to Applications. On first launch, right-click → Open to bypass the unsigned-app warning. |
| Windows | `.msi` or `.exe` | Run the installer. Windows may show a SmartScreen warning - click "More info" → "Run anyway". |
| Linux | `.AppImage` | `chmod +x google-chat-tauri_*.AppImage && ./google-chat-tauri_*.AppImage` |
| Linux | `.deb` / `.rpm` | Install with `dpkg -i` or `rpm -i` respectively. |

### AUR package (Arch Linux)

```sh
yay -S google-chat-tauri-bin
```

---

Tech stack:

[![tauri badge](https://img.shields.io/badge/made_with-tauri_v2-FFC131?logo=tauri&style=for-the-badge)](https://tauri.app) [![vite badge](https://img.shields.io/badge/bundled_with-vite-BC33FE?logo=vite&style=for-the-badge)](https://vitejs.dev) [![rust badge](https://img.shields.io/badge/powered_by-rust-DEA584?logo=rust&style=for-the-badge)](https://www.typescriptlang.org/)

Obligatory screenshot:

![image](https://github.com/user-attachments/assets/64483e35-d5ed-46c6-99ba-90aa25779848)

Pros:

- Not Electron
- Relatively small: 17MB AppImage binary (vs. 100MB+ for Electron-based alternatives), 488KB saved cache on Linux x86_64, as of v0.1.0. Memory: ~800-1000MB with one workspace open.
- Notifications

Cons:

- No support for third party auth

## Features

- Linux, macOS, and Windows builds ([AUR: `google-chat-tauri-bin`](https://aur.archlinux.org/packages/google-chat-tauri-bin))
- System tray with reactive unread count tooltip
- Dock badge showing unread count (macOS only)
- Native window materials: macOS vibrancy (frosted glass sidebar), Windows Mica
- Native menu bar: File, View, Window menus
- Desktop notifications

## Roadmap

- [ ] Flathub package
- [ ] Custom CSS & JS injection
- [ ] Custom settings
  - [ ] Config file
  - [ ] Possibly injecting custom settings into web UI (low priority)

## Non-plans

- Adding features far outside of my use case or a "reasonable" use case
- Turning this into a "big project" (it doesn't need to be)
- Mobile builds

## Building from Source

**Prerequisites:**
- [Rust](https://rustup.rs/) (stable toolchain)
- [pnpm](https://pnpm.io/installation)
- Tauri CLI (installed automatically via `pnpm install`)

```sh
git clone https://github.com/davidrneves/google-chat-tauri.git
cd google-chat-tauri
pnpm install
pnpm tauri dev      # development build with hot-reload
pnpm tauri build    # release build (output in src-tauri/target/release/)
```

## Contributing

Bug reports and questions: [open an issue](https://github.com/davidrneves/google-chat-tauri/issues).

For code contributions: check [Non-plans](#non-plans) first to avoid wasted effort. Bug fixes and platform-specific improvements are most likely to be merged. For anything non-trivial, open an issue first to discuss before writing code.

## Credits

- <https://github.com/squalou/google-chat-linux/> - Inspiration
- `create-tauri-app` - Scaffolding template

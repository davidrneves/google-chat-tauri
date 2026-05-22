# Google Chat Tauri

Run Google Chat as a native desktop app instead of a browser tab or an Electron wrapper. At 17MB (vs 100MB+ for Electron wrappers), it integrates natively: macOS vibrancy, Windows Mica, system tray, and desktop notifications.

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

### Verify the install

After launch you should see a system tray icon and the Google Chat interface load in the app window.

**macOS - if right-click → Open does not bypass the warning**, run this in Terminal:

```sh
sudo xattr -cr /Applications/google-chat-tauri.app
```

Then launch again normally. This clears the quarantine flag macOS sets on downloaded apps.

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

- **Multi-platform builds** (Linux, macOS, Windows) — [AUR package: `google-chat-tauri-bin`](https://aur.archlinux.org/packages/google-chat-tauri-bin) for Arch-based distros.
- **System tray** — stays in the tray when closed; tooltip shows current unread count in real time.
- **Dock badge** (macOS only) — unread count badge on the dock icon. Not available on Windows/Linux: implemented via macOS Cocoa APIs (NSApplication dockTile) with no cross-platform equivalent.
- **Native window materials** — macOS vibrancy (frosted glass sidebar), Windows Mica blur. Linux uses a standard window frame.
- **Native menu bar** — File, View, and Window menus integrated into the OS menu bar (macOS) or window chrome.
- **Desktop notifications** — Google Chat notifications delivered as native OS notifications.

## Roadmap

- [ ] Flathub package *(lower priority than AUR; investigating packaging requirements)*
- [ ] Custom CSS & JS injection *(investigating; no timeline)*
- [ ] Custom settings
  - [ ] Config file
  - [ ] Possibly injecting custom settings into web UI *(low priority)*

## Non-plans

- Adding features far outside of my use case or a "reasonable" use case
- Turning this into a "big project" (it doesn't need to be)
- Mobile builds

## Building from Source

**Prerequisites:**
- [Rust](https://rustup.rs/) (stable toolchain)
- [pnpm](https://pnpm.io/installation)
- Tauri CLI (installed automatically via `pnpm install`)
- **Linux only:** system libraries (see below)
- **macOS only:** Xcode command line tools (`xcode-select --install`)

**Linux system dependencies (Debian/Ubuntu):**

```sh
sudo apt install libwebkit2gtk-4.1-dev build-essential libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

If `pnpm tauri dev` fails with `Package webkit2gtk-4.1 was not found`, this is the fix.

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

# Chat SaaS Desktop Application

Cross-platform desktop application built with [Tauri](https://tauri.app/).

## Prerequisites

1. **Rust** - Install from [rustup.rs](https://rustup.rs/)
2. **Node.js** - Version 18 or later
3. **Platform-specific dependencies**:

### macOS
```bash
xcode-select --install
```

### Windows
- Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- Install [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

## Development

1. Install dependencies:
```bash
npm install
```

2. Start development mode:
```bash
npm run tauri:dev
```

This will start the Next.js development server and launch the Tauri desktop window.

## Building

### Build for current platform:
```bash
npm run tauri:build
```

### Build for specific platforms:

**macOS (Universal Binary):**
```bash
npm run tauri:build:mac
```

**Windows:**
```bash
npm run tauri:build:win
```

**Linux:**
```bash
npm run tauri:build:linux
```

Built applications will be available in `src-tauri/target/release/bundle/`.

## Features

- **System Tray**: App minimizes to system tray when closed
- **Desktop Notifications**: Native notifications for new messages
- **Auto-start**: Option to launch on system startup
- **Cross-platform**: Works on macOS, Windows, and Linux

## Architecture

```
desktop/
├── package.json          # Node.js dependencies and scripts
├── src-tauri/
│   ├── Cargo.toml        # Rust dependencies
│   ├── tauri.conf.json   # Tauri configuration
│   ├── src/
│   │   └── main.rs       # Rust backend code
│   └── icons/            # App icons for all platforms
```

The desktop app wraps the Next.js web application and adds native features:
- System tray integration
- Native notifications
- Auto-start on boot
- Minimize to tray on close

## Icons

Place your application icons in `src-tauri/icons/`:
- `32x32.png`
- `128x128.png`
- `128x128@2x.png`
- `icon.icns` (macOS)
- `icon.ico` (Windows)
- `icon.png` (Linux/Tray)

You can generate these using the Tauri icon generator:
```bash
npm run tauri icon path/to/your-icon.png
```

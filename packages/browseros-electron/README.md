# Opulent Browser - Electron Edition

Native Electron application with persistent AI agent sidebar.

## Quick Start

```bash
# Install dependencies
npm install

# Build sidebar UI
npm run build:sidebar

# Run in development mode
npm run dev
```

## Development

### Watch Mode

Terminal 1 - Watch sidebar changes:
```bash
npm run build:sidebar:watch
```

Terminal 2 - Run Electron:
```bash
npm run dev
```

### Project Structure

```
├── src/
│   ├── main.js          # Main process (Electron)
│   ├── preload.js       # Preload script (IPC bridge)
│   └── agent/           # AI agent tools (TODO)
├── sidebar/
│   ├── index.html       # Entry point
│   ├── index.js         # React entry
│   ├── App.jsx          # Main app component
│   ├── components/      # React components
│   │   ├── Chat.jsx
│   │   ├── BrowserControls.jsx
│   │   └── ResizeHandle.jsx
│   └── styles/          # CSS styles
└── package.json
```

## Features

- ✅ Persistent sidebar with AI chat interface
- ✅ Native browser controls (back, forward, reload, URL bar)
- ✅ Resizable sidebar
- ✅ BrowserView for web content
- ✅ IPC communication between sidebar and main process
- ⏳ AI SDK 6 integration (coming next)
- ⏳ Browser automation tools
- ⏳ Settings panel

## Next Steps

### 1. Port Browser-Agent Components

Copy your existing components from `browseros-agent`:

```bash
# Example:
cp -r ../browseros-agent/src/components/* sidebar/components/
```

### 2. Integrate AI SDK 6

Add AI agent logic to `src/agent/tools.js`:

```javascript
const { streamText } = require('ai');
const { anthropic } = require('@ai-sdk/anthropic');

// Implement tools and agent logic
```

### 3. Connect to Main Process

Update `ipcMain.handle('run-agent-tool')` in `src/main.js` to call your AI agent.

## Building for Distribution

```bash
# Build for current platform
npm run build:app

# Build for specific platform
npm run build:mac
npm run build:win
npm run build:linux

# Build for all platforms
npm run build:all
```

Output will be in `dist/` folder.

## Configuration

### Sidebar Width

Default: 400px
Min: 300px
Max: 600px

Saved in electron-store as `sidebarWidth`.

### Start Page

Default: `https://www.google.com`

Saved in electron-store as `startPage`.

## Keyboard Shortcuts

- `Cmd/Ctrl + T` - New tab (loads Google)
- `Cmd/Ctrl + [` - Back
- `Cmd/Ctrl + ]` - Forward
- `Cmd/Ctrl + R` - Reload
- `Cmd/Ctrl + Shift + I` - Toggle DevTools (Sidebar)
- `Cmd/Ctrl + Alt + I` - Toggle DevTools (Browser)

## Troubleshooting

### Sidebar not showing?

Check that `sidebar/dist/bundle.js` was built:
```bash
npm run build:sidebar
```

### BrowserView not loading?

Check console for errors. Ensure URL has protocol (http:// or https://).

### IPC not working?

Verify preload script is loaded. Check `webPreferences.preload` in `src/main.js`.

## License

AGPL-3.0

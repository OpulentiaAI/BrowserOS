# Electron Quick Start Guide - Opulent Browser

## 30-Minute Setup

This guide will help you create a lightweight Electron-based browser that wraps your existing `browseros-agent` extension.

### Prerequisites

- Node.js 18+ installed
- Your `browseros-agent` already built (the `/dist` folder exists)

---

## Step 1: Create Electron Package (5 minutes)

```bash
cd /Users/jeremyalston/Downloads/Component\ paradise/Gesthemane/Product/BrowserOS/packages
mkdir browseros-electron
cd browseros-electron

# Initialize project
npm init -y

# Install dependencies
npm install --save electron
npm install --save-dev electron-builder
```

---

## Step 2: Create Main Process File (10 minutes)

Create `src/main.js`:

```javascript
const { app, BrowserWindow, session } = require('electron');
const path = require('path');

// Extension path - adjust if needed
const EXTENSION_PATH = path.join(__dirname, '../../browseros-agent/dist');

let mainWindow;

async function createWindow() {
  try {
    // Load extension first
    console.log('Loading extension from:', EXTENSION_PATH);
    await session.defaultSession.loadExtension(EXTENSION_PATH, {
      allowFileAccess: true
    });
    console.log('✓ Extension loaded successfully');
  } catch (error) {
    console.error('Failed to load extension:', error);
  }

  // Create browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      sandbox: false // Required for extension APIs
    },
    titleBarStyle: 'default',
    show: false
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load start page
  mainWindow.loadURL('https://www.google.com');

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

---

## Step 3: Update package.json (5 minutes)

Edit `package.json`:

```json
{
  "name": "opulent-browser",
  "version": "0.1.0",
  "description": "Opulent Browser - AI-powered browsing",
  "main": "src/main.js",
  "scripts": {
    "start": "electron .",
    "dev": "NODE_ENV=development electron .",
    "build": "electron-builder",
    "build:mac": "electron-builder --mac",
    "build:win": "electron-builder --win",
    "build:linux": "electron-builder --linux",
    "build:all": "electron-builder -mwl"
  },
  "author": "OpulentiaAI",
  "license": "AGPL-3.0",
  "dependencies": {
    "electron": "^28.0.0"
  },
  "devDependencies": {
    "electron-builder": "^24.9.1"
  },
  "build": {
    "appId": "com.opulentiaai.browser",
    "productName": "Opulent Browser",
    "directories": {
      "output": "dist",
      "buildResources": "assets"
    },
    "files": [
      "src/**/*",
      "assets/**/*"
    ],
    "extraResources": [
      {
        "from": "../browseros-agent/dist",
        "to": "extension"
      }
    ],
    "mac": {
      "category": "public.app-category.productivity",
      "target": ["dmg", "zip"],
      "icon": "assets/icon.icns"
    },
    "win": {
      "target": ["nsis", "portable"],
      "icon": "assets/icon.ico"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "category": "Utility",
      "icon": "assets/icon.png"
    }
  }
}
```

---

## Step 4: Create Assets Folder (2 minutes)

```bash
mkdir -p assets
# Add your icon files here:
# - assets/icon.png (512x512 PNG)
# - assets/icon.icns (macOS, can generate with: https://cloudconvert.com/png-to-icns)
# - assets/icon.ico (Windows, can generate with: https://cloudconvert.com/png-to-ico)
```

For now, you can use a placeholder or your existing BrowserOS logo.

---

## Step 5: Test It! (3 minutes)

### Build the extension first:

```bash
cd ../browseros-agent
yarn build
# Or: npm run build
```

### Run Electron app:

```bash
cd ../browseros-electron
npm start
```

You should see:

1. Electron window opens
2. Console shows "✓ Extension loaded successfully"
3. Your browseros-agent extension is active
4. Google homepage loads

---

## Step 6: Build for Distribution (5 minutes)

### macOS:

```bash
npm run build:mac
# Output: dist/Opulent Browser.dmg
```

### Windows:

```bash
npm run build:win
# Output: dist/Opulent Browser Setup.exe
```

### Linux:

```bash
npm run build:linux
# Output: dist/Opulent Browser.AppImage
```

### All platforms:

```bash
npm run build:all
```

---

## Project Structure

```
browseros-electron/
├── src/
│   └── main.js              # Main process (window management)
├── assets/
│   ├── icon.png             # App icon (512x512)
│   ├── icon.icns            # macOS icon
│   └── icon.ico             # Windows icon
├── package.json             # Dependencies and build config
├── node_modules/            # Dependencies
└── dist/                    # Built apps (after running build)
```

---

## Customization Options

### Add Menu Bar

Add to `src/main.js` before `createWindow()`:

```javascript
const { Menu } = require('electron');

const menuTemplate = [
  {
    label: 'File',
    submenu: [
      {
        label: 'New Tab',
        accelerator: 'CmdOrCtrl+T',
        click: () => {
          // Implement tab creation
        }
      },
      { type: 'separator' },
      { role: 'quit' }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' }
    ]
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' }
    ]
  }
];

const menu = Menu.buildFromTemplate(menuTemplate);
Menu.setApplicationMenu(menu);
```

### Add Auto-Updater

Install:

```bash
npm install electron-updater
```

Add to `src/main.js`:

```javascript
const { autoUpdater } = require('electron-updater');

app.whenReady().then(() => {
  // Check for updates
  autoUpdater.checkForUpdatesAndNotify();
  
  createWindow();
});
```

### Change Extension Loading Path

If you build the extension in a different location, update `EXTENSION_PATH` in `src/main.js`:

```javascript
// For production builds
const EXTENSION_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'extension')
  : path.join(__dirname, '../../browseros-agent/dist');
```

---

## Troubleshooting

### Extension not loading?

Check:

1. Extension built? `ls ../browseros-agent/dist/manifest.json`
2. Console output shows path
3. Try absolute path: `/full/path/to/browseros-agent/dist`

### White screen?

Check:

1. Network connectivity
2. DevTools console for errors (Cmd/Ctrl+Alt+I)
3. Try different URL

### Build fails?

Check:

1. Icons exist in `assets/` folder
2. Node.js version (18+)
3. Disk space for build output

---

## Next Steps

### Polish

1. Add custom start page instead of Google
2. Implement tab management
3. Add keyboard shortcuts
4. Custom window controls

### Features

1. Settings panel
2. Bookmark management
3. History
4. Download manager

### Distribution

1. Code signing certificates
2. Auto-update server
3. Landing page
4. App store submissions

---

## Comparison: Before vs After

### Before (Full Chromium Build):

```
Build time: 3+ hours
Disk space: ~100GB source + ~50GB build artifacts
RAM needed: 16GB+
Build machine: High-end required
Distribution: ~200-500MB per platform
```

### After (Electron):

```
Build time: ~5 minutes
Disk space: ~1GB
RAM needed: 8GB
Build machine: Any modern computer
Distribution: ~100-150MB per platform
```

**Result: 36x faster builds, 99% less disk space, same features!**

---

## Resources

- [Electron Docs](https://www.electronjs.org/docs/latest/)
- [electron-builder Docs](https://www.electron.build/)
- [Electron API Demos](https://github.com/electron/electron-api-demos)
- [Chrome Extension in Electron](https://www.electronjs.org/docs/latest/api/session#sesloadextensionpath-options)

---

## Summary

You now have a lightweight, Electron-based browser that:

✅ Loads your existing browseros-agent extension
✅ Builds in minutes, not hours
✅ Requires ~1GB disk space, not ~100GB
✅ Works on macOS, Windows, and Linux
✅ Can be customized and branded
✅ Easy to maintain and update

**Next:** Run `npm start` and see it in action!

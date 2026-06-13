const { app, BrowserWindow, ipcMain } = require('electron')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const isDev = !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 1480,
    height: 960,
    minWidth: 1200,
    minHeight: 760,
    show: false,
    backgroundColor: '#070b16',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  win.once('ready-to-show', () => {
    win.show()
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

ipcMain.handle('graph:export-and-commit', async (_event, payload) => {
  try {
    const repoRoot = process.cwd()
    const exportDir = path.join(repoRoot, 'graph-export')
    const exportPath = path.join(exportDir, 'graph.json')
    const message = (payload?.message || 'Graph snapshot update').trim()

    execSync('git rev-parse --is-inside-work-tree', { cwd: repoRoot, stdio: 'pipe' })
    fs.mkdirSync(exportDir, { recursive: true })
    fs.writeFileSync(exportPath, JSON.stringify(payload?.graph ?? {}, null, 2), 'utf8')

    execSync('git add graph-export/graph.json', { cwd: repoRoot, stdio: 'pipe' })
    execSync(`git commit -m ${JSON.stringify(message)}`, { cwd: repoRoot, stdio: 'pipe' })

    return {
      ok: true,
      path: exportPath,
      message: 'Graph exported and committed to git.',
    }
  } catch (error) {
    const details = error && typeof error === 'object' && 'message' in error
      ? String(error.message)
      : 'Unknown error'

    return {
      ok: false,
      message: details,
    }
  }
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

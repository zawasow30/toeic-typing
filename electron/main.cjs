const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function getWordsDirectory() {
  if (app.isPackaged) {
    // パッケージされたアプリの場合: resources/words または アプリケーションサポート
    const packagedWordsPath = path.join(process.resourcesPath, 'words');
    if (fs.existsSync(packagedWordsPath)) {
      return packagedWordsPath;
    }
  }
  // 開発時またはフォールバック: プロジェクト直下の words フォルダ
  return path.join(__dirname, '..', 'words');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 20, y: 20 },
    backgroundColor: '#09090b',
    show: false, // 準備完了後に表示してチラつきを防止
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // 外部リンクをデフォルトブラウザで開く
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  return win;
}

// macOS ネイティブメニューの設定
function setupAppMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about', label: 'TOEIC Typing について' },
              { type: 'separator' },
              {
                label: '単語フォルダをFinderで開く',
                accelerator: 'CmdOrCtrl+O',
                click: () => {
                  shell.openPath(getWordsDirectory());
                }
              },
              { type: 'separator' },
              { role: 'services', label: 'サービス' },
              { type: 'separator' },
              { role: 'hide', label: 'TOEIC Typing を隠す' },
              { role: 'hideOthers', label: 'ほかを隠す' },
              { role: 'unhide', label: 'すべてを表示' },
              { type: 'separator' },
              { role: 'quit', label: 'TOEIC Typing を終了' }
            ]
          }
        ]
      : []),
    {
      label: '編集',
      submenu: [
        { role: 'undo', label: '取り消し' },
        { role: 'redo', label: 'やり直し' },
        { type: 'separator' },
        { role: 'cut', label: 'カット' },
        { role: 'copy', label: 'コピー' },
        { role: 'paste', label: 'ペースト' },
        { role: 'selectAll', label: 'すべて選択' }
      ]
    },
    {
      label: '表示',
      submenu: [
        { role: 'reload', label: '再読み込み' },
        { role: 'forceReload', label: '強制再読み込み' },
        { role: 'toggleDevTools', label: '開発者ツールを切り替え' },
        { type: 'separator' },
        { role: 'resetZoom', label: '実際のサイズ' },
        { role: 'zoomIn', label: '拡大' },
        { role: 'zoomOut', label: '縮小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'フルスクリーンにする' }
      ]
    },
    {
      label: 'ウィンドウ',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'zoom', label: '拡大/縮小' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front', label: 'すべてを手前に移動' }
            ]
          : [{ role: 'close', label: '閉じる' }])
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC ハンドラーの登録
ipcMain.handle('open-words-folder', async () => {
  const wordsDir = getWordsDirectory();
  await shell.openPath(wordsDir);
  return { success: true, path: wordsDir };
});

ipcMain.handle('get-words-path', async () => {
  return getWordsDirectory();
});

ipcMain.handle('read-word-file', async (_event, fileName) => {
  try {
    const wordsDir = getWordsDirectory();
    const filePath = path.join(wordsDir, fileName.endsWith('.txt') ? fileName : `${fileName}.txt`);
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('list-word-files', async () => {
  try {
    const wordsDir = getWordsDirectory();
    const files = await fs.promises.readdir(wordsDir);
    const txtFiles = files.filter(f => f.endsWith('.txt'));
    return { success: true, files: txtFiles };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  app.setName('TOEIC Typing');
  setupAppMenu();
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

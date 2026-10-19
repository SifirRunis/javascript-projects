const { app, BrowserWindow, Menu } = require('electron')
// ...

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: '我的 Electron 应用'
  })

  mainWindow.loadFile('index.html')

  const template = [
    {
      label: '文件',
      submenu: [
        { label: '打开', accelerator: 'Ctrl+O' },
        { label: '保存', accelerator: 'Ctrl+S' },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click() {
            app.quit()
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'Ctrl+Z' },
        { label: '还原', accelerator: 'Ctrl+Y' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'Ctrl+X' },
        { label: '复制', accelerator: 'Ctrl+C' },
        { label: '粘贴', accelerator: 'Ctrl+V' },
        { label: '删除', accelerator: 'Delete' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '刷新', accelerator: 'Ctrl+R' },
        { label: '强制刷新', accelerator: 'Ctrl+Shift+R' },
        { label: '切换开发者工具', accelerator: 'Ctrl+Shift+I' },
        { type: 'separator' },
        { label: '实际大小', accelerator: 'Ctrl+0' },
        { label: '放大', accelerator: 'Ctrl+Plus' }, // 使用 Plus 更可靠
        { label: '缩小', accelerator: 'Ctrl+-' },
        { type: 'separator' },
        { label: '切换全屏', accelerator: 'F11' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', accelerator: 'Ctrl+M' },
        { label: '缩放' },
        { label: '关闭', accelerator: 'Ctrl+W' }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})